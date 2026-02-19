
import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAuth, requireAdmin, getCurrentUser, safeErrorMessage } from '@/lib/api-helpers';
import { sanitizeInt, sanitizeString, validateEnum, sanitizeDate } from '@/lib/security';
import { CACHE_TAGS } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const shop_id = searchParams.get('shop_id') || '';
        const search = sanitizeString(searchParams.get('search') || '', 100);
        const license_type = searchParams.get('license_type') || '';

        // Security: Validate status against whitelist
        const status = validateEnum(
            searchParams.get('status'),
            ['active', 'expired', 'pending', 'suspended', 'revoked'],
            ''
        );

        // Security: Sanitize pagination parameters
        const page = sanitizeInt(searchParams.get('page'), 1, 1, 1000);
        const limit = sanitizeInt(searchParams.get('limit'), 20, 1, 2000);
        const offset = (page - 1) * limit;

        // Get Single License
        if (id) {
            const safeId = sanitizeInt(id, 0, 1);
            if (safeId < 1) {
                return NextResponse.json({ success: false, message: 'Invalid license ID' }, { status: 400 });
            }
            const license = await fetchOne('SELECT * FROM licenses WHERE id = $1', [safeId]);
            return NextResponse.json({ success: true, license });
        }

        // List Licenses
        let whereClauses = [];
        let params = [];
        let paramIndex = 1;

        if (search) {
            // ค้นหาในทุกฟิลด์หลัก รวมถึง custom_fields
            whereClauses.push(`(
                s.shop_name ILIKE $${paramIndex} OR 
                l.license_number ILIKE $${paramIndex} OR 
                lt.name ILIKE $${paramIndex} OR 
                l.status ILIKE $${paramIndex} OR 
                l.notes ILIKE $${paramIndex} OR
                l.issue_date::text ILIKE $${paramIndex} OR
                l.expiry_date::text ILIKE $${paramIndex} OR
                EXISTS (
                    SELECT 1 FROM custom_field_values cfv2
                    WHERE cfv2.entity_id = l.id 
                    AND cfv2.field_value ILIKE $${paramIndex}
                )
            )`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (shop_id) {
            const safeShopId = sanitizeInt(shop_id, 0, 1);
            if (safeShopId > 0) {
                whereClauses.push(`l.shop_id = $${paramIndex}`);
                params.push(safeShopId);
                paramIndex++;
            }
        }

        if (license_type) {
            const safeLicenseType = sanitizeInt(license_type, 0, 1);
            if (safeLicenseType > 0) {
                whereClauses.push(`l.license_type_id = $${paramIndex}`);
                params.push(safeLicenseType);
                paramIndex++;
            }
        }

        // Filter by computed status
        if (status) {
            if (status === 'active') {
                // Active = expiry_date >= today AND not suspended/revoked
                whereClauses.push(`(l.expiry_date >= CURRENT_DATE AND l.status NOT IN ('suspended', 'revoked'))`);
            } else if (status === 'expired') {
                // Expired = expiry_date < today AND not suspended/revoked
                whereClauses.push(`(l.expiry_date < CURRENT_DATE AND l.status NOT IN ('suspended', 'revoked'))`);
            } else {
                // For suspended/revoked, use the stored status
                whereClauses.push(`l.status = $${paramIndex}`);
                params.push(status);
                paramIndex++;
            }
        }

        let whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM licenses l
            LEFT JOIN shops s ON l.shop_id = s.id
            LEFT JOIN license_types lt ON l.license_type_id = lt.id
            ${whereSQL}
        `;

        // Security: Use parameterized queries for LIMIT/OFFSET
        const limitParamIndex = paramIndex;
        const offsetParamIndex = paramIndex + 1;

        // Parallelize Count and Data Fetch
        // Computed status: ถ้า expiry_date < วันนี้ = expired, ถ้า suspended/revoked ใช้ค่าเดิม, อื่นๆ = active
        const query = `
            SELECT l.*, s.shop_name, lt.name as type_name,
                   CASE 
                       WHEN l.status IN ('suspended', 'revoked') THEN l.status
                       WHEN l.expiry_date < CURRENT_DATE THEN 'expired'
                       ELSE 'active'
                   END AS status,
                   l.status AS original_status,
                   COALESCE(
                       json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL),
                       '{}'::json
                   ) as custom_fields
            FROM licenses l
            LEFT JOIN shops s ON l.shop_id = s.id
            LEFT JOIN license_types lt ON l.license_type_id = lt.id
            LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
            LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
            ${whereSQL}
            GROUP BY l.id, s.shop_name, lt.name
            ORDER BY l.id DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        const [countResult, licenses] = await Promise.all([
            fetchOne(countQuery, params),
            fetchAll(query, [...params, limit, offset])
        ]);

        const total = parseInt(countResult?.total || 0, 10);
        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            success: true,
            licenses,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });

    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

export async function POST(request) {
    // Security: Require Admin for write operations
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();

        const { custom_fields } = body;
        const issue_date = sanitizeDate(body.issue_date);
        const expiry_date = sanitizeDate(body.expiry_date);
        const shop_id = sanitizeInt(body.shop_id, 0, 1);
        const license_type_id = sanitizeInt(body.license_type_id, 0, 1);
        const license_number = sanitizeString(body.license_number || '', 100);
        const status = validateEnum(body.status, ['active', 'expired', 'pending', 'suspended', 'revoked'], 'active');
        const notes = sanitizeString(body.notes || '', 1000);

        if (shop_id < 1 || license_type_id < 1 || !license_number) {
            console.error('[POST /api/licenses] Missing required fields');
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const result = await executeQuery(
            `INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [shop_id, license_type_id, license_number, issue_date, expiry_date, status || 'active', notes]
        );

        const licenseId = result?.rows?.[0]?.id || result?.[0]?.id; // Handle both neon formats

        // Save custom fields if provided
        if (custom_fields && licenseId && Object.keys(custom_fields).length > 0) {
            // Get all active custom fields for licenses
            const fields = await fetchAll(
                'SELECT id, field_name FROM custom_fields WHERE entity_type = $1 AND is_active = true',
                ['licenses']
            );

            // Create field name to ID map
            const fieldMap = {};
            fields.forEach(f => {
                fieldMap[f.field_name] = f.id;
            });

            // Insert custom field values
            for (const [fieldName, value] of Object.entries(custom_fields)) {
                const fieldId = fieldMap[fieldName];
                if (fieldId && value !== undefined && value !== null) {
                    await executeQuery(`
                        INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value, updated_at)
                        VALUES ($1, $2, $3, $4, NOW())
                        ON CONFLICT (custom_field_id, entity_id) 
                        DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = EXCLUDED.updated_at
                    `, [fieldId, licenseId, 'licenses', value?.toString() || '']);
                }
            }
        }

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.CREATE,
            entityType: ENTITY_TYPES.LICENSE,
            entityId: licenseId || null,
            details: `เพิ่มใบอนุญาตหมายเลข: ${license_number}`
        });

        // Revalidate cache so sidebar badge updates immediately
        revalidateTag(CACHE_TAGS.LICENSES);
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS);

        return NextResponse.json({ success: true, message: 'เพิ่มใบอนุญาตเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('[POST /api/licenses] Error:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

export async function PUT(request) {
    // Security: Require Admin for write operations
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { custom_fields } = body;
        const issue_date = sanitizeDate(body.issue_date);
        const expiry_date = sanitizeDate(body.expiry_date);
        const id = sanitizeInt(body.id, 0, 1);
        const shop_id = sanitizeInt(body.shop_id, 0, 1);
        const license_type_id = sanitizeInt(body.license_type_id, 0, 1);
        const license_number = sanitizeString(body.license_number || '', 100);
        const status = validateEnum(body.status, ['active', 'expired', 'pending', 'suspended', 'revoked'], 'active');
        const notes = sanitizeString(body.notes || '', 1000);

        if (id < 1 || shop_id < 1 || license_type_id < 1) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        await executeQuery(
            `UPDATE licenses 
             SET shop_id = $1, license_type_id = $2, license_number = $3, issue_date = $4, expiry_date = $5, status = $6, notes = $7
             WHERE id = $8`,
            [shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes, id]
        );

        // Update custom fields if provided
        if (custom_fields && Object.keys(custom_fields).length > 0) {
            // Get all active custom fields for licenses
            const fields = await fetchAll(
                'SELECT id, field_name FROM custom_fields WHERE entity_type = $1 AND is_active = true',
                ['licenses']
            );

            // Create field name to ID map
            const fieldMap = {};
            fields.forEach(f => {
                fieldMap[f.field_name] = f.id;
            });

            // Update custom field values
            for (const [fieldName, value] of Object.entries(custom_fields)) {
                const fieldId = fieldMap[fieldName];
                if (fieldId !== undefined) {
                    if (value !== undefined && value !== null && value !== '') {
                        // Insert or update the value
                        await executeQuery(`
                            INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value, updated_at)
                            VALUES ($1, $2, $3, $4, NOW())
                            ON CONFLICT (custom_field_id, entity_id) 
                            DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = EXCLUDED.updated_at
                        `, [fieldId, id, 'licenses', value?.toString() || '']);
                    } else {
                        // Delete the value if it's empty/null
                        await executeQuery(
                            'DELETE FROM custom_field_values WHERE custom_field_id = $1 AND entity_id = $2',
                            [fieldId, id]
                        );
                    }
                }
            }
        }

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.LICENSE,
            entityId: id,
            details: `แก้ไขใบอนุญาตหมายเลข: ${license_number}`
        });

        // Revalidate cache so sidebar badge updates immediately
        revalidateTag(CACHE_TAGS.LICENSES);
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS);

        return NextResponse.json({ success: true, message: 'บันทึกใบอนุญาตเรียบร้อยแล้ว' });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

export async function DELETE(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = sanitizeInt(searchParams.get('id'), 0, 1);

        if (id < 1) {
            return NextResponse.json({ success: false, message: 'Invalid license ID' }, { status: 400 });
        }

        // Get license info before deleting for logging
        const license = await fetchOne('SELECT license_number FROM licenses WHERE id = $1', [id]);

        // Delete custom field values first (to prevent orphans)
        await executeQuery('DELETE FROM custom_field_values WHERE entity_type = $1 AND entity_id = $2', ['licenses', id]);

        await executeQuery('DELETE FROM licenses WHERE id = $1', [id]);

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.LICENSE,
            entityId: id,
            details: `ลบใบอนุญาตหมายเลข: ${license?.license_number || id}`
        });

        // Revalidate cache so sidebar badge updates immediately
        revalidateTag(CACHE_TAGS.LICENSES);
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS);

        return NextResponse.json({ success: true, message: 'ลบใบอนุญาตเรียบร้อยแล้ว' });
    } catch (err) {
        return NextResponse.json({ success: false, message: 'ไม่สามารถลบได้' }, { status: 500 });
    }
}
