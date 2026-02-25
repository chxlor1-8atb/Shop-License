
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

        // Debug logging สำหรับตรวจสอบข้อมูลที่ส่งกลับไป frontend
        console.log('🔍 GET API - Data Debug:', {
            totalLicenses: licenses.length,
            sampleLicense: licenses[0],
            sampleCustomFields: licenses[0]?.custom_fields,
            hasCustomFields: licenses[0]?.custom_fields && Object.keys(licenses[0]?.custom_fields).length > 0,
            customFieldsKeys: licenses[0]?.custom_fields ? Object.keys(licenses[0]?.custom_fields) : []
        });

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

        // Fetch the full license object to return for optimistic UI
        const newLicense = await fetchOne(`
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
            WHERE l.id = $1
            GROUP BY l.id, s.shop_name, lt.name
        `, [licenseId]);

        return NextResponse.json({ success: true, message: 'เพิ่มใบอนุญาตเรียบร้อยแล้ว', license: newLicense });
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
        const id = sanitizeInt(body.id, 0, 1);

        // ดึงข้อมูลเดิมจาก database ก่อนเพื่อรักษาค่าวันที่
        const existingLicense = await fetchOne('SELECT issue_date, expiry_date FROM licenses WHERE id = $1', [id]);

        const shop_id = sanitizeInt(body.shop_id, 0, 1);
        const license_type_id = sanitizeInt(body.license_type_id, 0, 1);
        const license_number = sanitizeString(body.license_number || '', 100);
        const status = validateEnum(body.status, ['active', 'expired', 'pending', 'suspended', 'revoked'], 'active');
        const notes = sanitizeString(body.notes || '', 1000);

        // ใช้ค่าใหม่ถ้ามีการส่งมา (รวมถึงค่าว่าง) หรือใช้ค่าเดิมถ้าไม่มี
        const issue_date = body.issue_date !== undefined ? sanitizeDate(body.issue_date, null) : (existingLicense?.issue_date || null);
        const expiry_date = body.expiry_date !== undefined ? sanitizeDate(body.expiry_date, null) : (existingLicense?.expiry_date || null);

        // Debug logging สำหรับตรวจสอบข้อมูลที่รับมาจาก frontend
        console.log('🔧 PUT API - Complete Data Debug:', {
            id,
            shop_id,
            license_type_id,
            license_number,
            issue_date: body.issue_date,
            expiry_date: body.expiry_date,
            status,
            notes,

            custom_fields,
            allBodyKeys: Object.keys(body),
            hasIssueDate: 'issue_date' in body,
            hasExpiryDate: 'expiry_date' in body,
            hasCustomFields: custom_fields && Object.keys(custom_fields).length > 0,
            // ตรวจสอบว่าฟิลด์ที่จำเป็นต้องมีค่า
            hasId: !!id,
            hasShopId: !!shop_id,
            hasLicenseTypeId: !!license_type_id,
            hasLicenseNumber: !!license_number,
            idValid: id >= 1,
            shopIdValid: shop_id >= 1,
            licenseTypeIdValid: license_type_id >= 1,
            licenseNumberValid: !!license_number && license_number !== '',
            // ตรวจสอบว่าฟิลด์ที่จำเป็นต้องมาครบถ้วน
            allRequiredFieldsValid: id >= 1 && shop_id >= 1 && license_type_id >= 1 && !!license_number && license_number !== ''
        });


        if (id < 1 || shop_id < 1 || license_type_id < 1) {
            // Debug logging สำหรับตรวจสอบฟิลด์ที่จำเป็นต้อง
            console.log('❌ Missing Required Fields Debug:', {
                id,
                shop_id,
                license_type_id,
                license_number,
                issue_date,
                expiry_date,
                status,
                notes,
                custom_fields,
                bodyKeys: Object.keys(body),
                idValid: id >= 1,
                shopIdValid: shop_id >= 1,
                licenseTypeIdValid: license_type_id >= 1,
                licenseNumberValid: !!body.license_number,
                issueDateValid: !!body.issue_date,
                expiryDateValid: !!body.expiry_date,
                statusValid: !!body.status
            });
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        await executeQuery(
            `UPDATE licenses 
             SET shop_id = $1, license_type_id = $2, license_number = $3, issue_date = $4, expiry_date = $5, status = $6, notes = $7
             WHERE id = $8`,
            [shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes, id]
        );

        // Debug logging หลังจากบันทึกข้อมูล licenses
        console.log('🔧 PUT API - License Update Debug:', {
            shop_id,
            license_type_id,
            license_number,
            issue_date: issue_date || 'NULL',
            expiry_date: expiry_date || 'NULL',
            status,
            notes,
            id,
            custom_fields,
            // ตรวจสอบว่า custom fields ถูกบันทึก
            hasLocation: custom_fields?.cf_selling_location !== undefined,
            locationValue: custom_fields?.cf_selling_location,
            hasAmount: custom_fields?.cf_amount !== undefined,
            amountValue: custom_fields?.cf_amount
        });

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
            console.log('🔧 PUT API - Custom Fields Debug:', {
                licenseId: id,
                custom_fields_received: custom_fields,
                available_fields: fields.map(f => f.field_name)
            });

            for (const [fieldName, value] of Object.entries(custom_fields)) {
                const fieldId = fieldMap[fieldName];
                console.log(`🔧 Processing field: ${fieldName}, value: ${value}, fieldId: ${fieldId}`);

                if (fieldId !== undefined) {
                    if (value !== undefined && value !== null && value !== '') {
                        // Insert or update the value
                        await executeQuery(`
                            INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value, updated_at)
                            VALUES ($1, $2, $3, $4, NOW())
                            ON CONFLICT (custom_field_id, entity_id) 
                            DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = EXCLUDED.updated_at
                        `, [fieldId, id, 'licenses', value?.toString() || '']);

                        console.log(`✅ Saved field ${fieldName} with value: ${value}`);
                    } else {
                        // Delete the value if it's empty/null
                        await executeQuery(
                            'DELETE FROM custom_field_values WHERE custom_field_id = $1 AND entity_id = $2',
                            [fieldId, id]
                        );

                        console.log(`🗑️ Deleted field ${fieldName} (empty value)`);
                    }
                } else {
                    console.log(`❌ Field ${fieldName} not found in fieldMap`);
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

        // Fetch the updated license object to return for optimistic UI
        const updatedLicense = await fetchOne(`
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
            WHERE l.id = $1
            GROUP BY l.id, s.shop_name, lt.name
        `, [id]);

        return NextResponse.json({ success: true, message: 'บันทึกใบอนุญาตเรียบร้อยแล้ว', license: updatedLicense });
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
        const deleteCustomFieldsResult = await executeQuery('DELETE FROM custom_field_values WHERE entity_type = $1 AND entity_id = $2', ['licenses', id]);

        await executeQuery('DELETE FROM licenses WHERE id = $1', [id]);

        // Log activity for license deletion
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.LICENSE,
            entityId: id,
            details: `ลบใบอนุญาตหมายเลข: ${license?.license_number || id}`
        });

        // Log activity for custom field values deletion
        if (deleteCustomFieldsResult.length > 0) {
            await logActivity({
                userId: currentUser?.id || null,
                action: ACTIVITY_ACTIONS.DELETE,
                entityType: 'CUSTOM_FIELD_VALUE',
                entityId: id,
                details: `ลบ custom field values ${deleteCustomFieldsResult.length} รายการของใบอนุญาต: ${license?.license_number || id}`
            });
        }

        // Revalidate cache so sidebar badge updates immediately
        revalidateTag(CACHE_TAGS.LICENSES);
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS);

        return NextResponse.json({ success: true, message: 'ลบใบอนุญาตเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error deleting license:', err);
        return NextResponse.json({ success: false, message: 'ไม่สามารถลบได้: ' + safeErrorMessage(err) }, { status: 500 });
    }
}
