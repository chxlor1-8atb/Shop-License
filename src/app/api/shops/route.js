
import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAuth, requireAdmin, getCurrentUser, safeErrorMessage } from '@/lib/api-helpers';
import { sanitizeInt, sanitizeString, validateEnum } from '@/lib/security';
import { CACHE_TAGS } from '@/lib/cache';

export const dynamic = 'force-dynamic';

// Security: Validate and sanitize custom_fields JSON object
function validateCustomFields(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
    const MAX_KEYS = 50;
    const MAX_KEY_LEN = 100;
    const MAX_VALUE_LEN = 2000;
    const sanitized = {};
    const keys = Object.keys(obj);
    if (keys.length > MAX_KEYS) return null; // too many keys
    for (const key of keys) {
        if (typeof key !== 'string' || key.length > MAX_KEY_LEN) continue;
        const safeKey = key.replace(/[<>"']/g, '').trim();
        if (!safeKey) continue;
        let val = obj[key];
        if (val === null || val === undefined) { sanitized[safeKey] = ''; continue; }
        if (typeof val === 'number' || typeof val === 'boolean') { sanitized[safeKey] = val; continue; }
        if (typeof val === 'string') {
            sanitized[safeKey] = val.length > MAX_VALUE_LEN ? val.slice(0, MAX_VALUE_LEN) : val;
        }
        // Skip non-primitive values (nested objects/arrays) for safety
    }
    return sanitized;
}

export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const search = sanitizeString(searchParams.get('search') || '', 100);
        const hasLicense = searchParams.get('has_license') || '';
        const licenseStatus = validateEnum(
            searchParams.get('license_status'),
            ['active', 'expired', 'pending', 'suspended', 'revoked'],
            ''
        );
        const licenseTypeFilter = searchParams.get('license_type') || '';

        // Security: Sanitize pagination parameters
        // Allow higher limit for dropdown/select use (up to 2000)
        const page = sanitizeInt(searchParams.get('page'), 1, 1, 1000);
        const limit = sanitizeInt(searchParams.get('limit'), 20, 1, 2000);
        const offset = (page - 1) * limit;

        // Get Single Shop
        if (id) {
            const safeId = sanitizeInt(id, 0, 1);
            if (safeId < 1) {
                return NextResponse.json({ success: false, message: 'Invalid shop ID' }, { status: 400 });
            }
            const shop = await fetchOne('SELECT * FROM shops WHERE id = $1', [safeId]);
            return NextResponse.json({ success: true, shop });
        }

        // List Shops
        let whereClauses = [];
        let params = [];
        let paramIndex = 1;

        if (search) {
            whereClauses.push(`(
                s.shop_name ILIKE $${paramIndex} OR 
                s.owner_name ILIKE $${paramIndex} OR 
                s.phone ILIKE $${paramIndex} OR 
                s.address ILIKE $${paramIndex} OR 
                s.email ILIKE $${paramIndex} OR 
                s.notes ILIKE $${paramIndex} OR
                s.custom_fields::text ILIKE $${paramIndex}
            )`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Filter: has license or not
        if (hasLicense === 'yes') {
            whereClauses.push(`EXISTS (SELECT 1 FROM licenses l WHERE l.shop_id = s.id)`);
        } else if (hasLicense === 'no') {
            whereClauses.push(`NOT EXISTS (SELECT 1 FROM licenses l WHERE l.shop_id = s.id)`);
        } else if (hasLicense === 'no_active') {
            // ร้านค้าที่ไม่มีใบอนุญาตที่ใช้งานได้เลย (ไม่มีใบอนุญาต หรือ หมดอายุ/ถูกระงับทั้งหมด)
            whereClauses.push(`NOT EXISTS (
                SELECT 1 FROM licenses l WHERE l.shop_id = s.id 
                AND l.expiry_date >= CURRENT_DATE 
                AND l.status NOT IN ('suspended', 'revoked')
            )`);
        } else if (hasLicense === 'all_expired') {
            // เฉพาะร้านค้าที่มีใบอนุญาตแต่หมดอายุทั้งหมด (ไม่รวมร้านที่ไม่มีใบอนุญาตเลย)
            whereClauses.push(`EXISTS (SELECT 1 FROM licenses l2 WHERE l2.shop_id = s.id)`);
            whereClauses.push(`NOT EXISTS (
                SELECT 1 FROM licenses l WHERE l.shop_id = s.id 
                AND l.expiry_date >= CURRENT_DATE 
                AND l.status NOT IN ('suspended', 'revoked')
            )`);
        }

        // Filter: by license status
        if (licenseStatus) {
            if (licenseStatus === 'active') {
                whereClauses.push(`EXISTS (
                    SELECT 1 FROM licenses l WHERE l.shop_id = s.id 
                    AND l.expiry_date >= CURRENT_DATE AND l.status NOT IN ('suspended', 'revoked')
                )`);
            } else if (licenseStatus === 'expired') {
                whereClauses.push(`EXISTS (
                    SELECT 1 FROM licenses l WHERE l.shop_id = s.id 
                    AND l.expiry_date < CURRENT_DATE AND l.status NOT IN ('suspended', 'revoked')
                )`);
            } else {
                whereClauses.push(`EXISTS (
                    SELECT 1 FROM licenses l WHERE l.shop_id = s.id AND l.status = $${paramIndex}
                )`);
                params.push(licenseStatus);
                paramIndex++;
            }
        }

        // Filter: by license type
        if (licenseTypeFilter) {
            const safeLicenseType = sanitizeInt(licenseTypeFilter, 0, 1);
            if (safeLicenseType > 0) {
                whereClauses.push(`EXISTS (
                    SELECT 1 FROM licenses l WHERE l.shop_id = s.id AND l.license_type_id = $${paramIndex}
                )`);
                params.push(safeLicenseType);
                paramIndex++;
            }
        }

        const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const countQuery = `SELECT COUNT(*) as total FROM shops s ${whereSQL}`;

        // Security: Use parameterized queries for LIMIT/OFFSET
        const limitParamIndex = paramIndex;
        const offsetParamIndex = paramIndex + 1;

        // Simple query without expensive subqueries for dropdown use
        const query = `
            SELECT s.*
            FROM shops s
            ${whereSQL}
            ORDER BY s.id DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        // Only count for pagination when needed (not for dropdown)
        let total = 0;
        if (limit < 1000) { // Only count for normal pagination, not for dropdown
            const countResult = await fetchOne(countQuery, params);
            total = parseInt(countResult?.total || 0, 10);
        } else {
            // For dropdown, just fetch without counting
            total = limit;
        }

        const shops = await fetchAll(query, [...params, limit, offset]);

        const totalPages = limit < 1000 ? Math.ceil(total / limit) : 1;

        return NextResponse.json({
            success: true,
            shops,
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
        const shop_name = sanitizeString(body.shop_name || '', 255);
        const owner_name = sanitizeString(body.owner_name || '', 255);
        const address = sanitizeString(body.address || '', 500);
        const phone = sanitizeString(body.phone || '', 50);
        const email = sanitizeString(body.email || '', 255);
        const notes = sanitizeString(body.notes || '', 1000);

        if (!shop_name) {
            return NextResponse.json({ success: false, message: 'Shop name is required' }, { status: 400 });
        }

        // Security: Validate and sanitize custom_fields
        const safeCustomFields = validateCustomFields(custom_fields);
        if (safeCustomFields === null) {
            return NextResponse.json({ success: false, message: 'Custom fields มีจำนวน key มากเกินไป (สูงสุด 50)' }, { status: 400 });
        }
        const customFieldsStr = JSON.stringify(safeCustomFields);
        if (customFieldsStr.length > 10000) {
            return NextResponse.json({ success: false, message: 'Custom fields data too large (max 10KB)' }, { status: 400 });
        }

        const result = await executeQuery(
            `INSERT INTO shops (shop_name, owner_name, address, phone, email, notes, custom_fields) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [shop_name, owner_name, address, phone, email, notes, customFieldsStr]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.CREATE,
            entityType: ENTITY_TYPES.SHOP,
            entityId: result?.[0]?.id || null,
            details: `เพิ่มร้านค้า: ${shop_name}`
        });

        // Revalidate cache so dashboard stats update immediately
        revalidateTag(CACHE_TAGS.SHOPS);
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS);

        const newShop = await fetchOne('SELECT * FROM shops WHERE id = $1', [result?.[0]?.id]);

        return NextResponse.json({ success: true, message: 'เพิ่มร้านค้าเรียบร้อยแล้ว', shop: newShop });
    } catch (err) {
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
        const shop_name = sanitizeString(body.shop_name || '', 255);
        const owner_name = sanitizeString(body.owner_name || '', 255);
        const address = sanitizeString(body.address || '', 500);
        const phone = sanitizeString(body.phone || '', 50);
        const email = sanitizeString(body.email || '', 255);
        const notes = sanitizeString(body.notes || '', 1000);

        if (id < 1 || !shop_name) {
            return NextResponse.json({ success: false, message: 'Valid ID and Shop name are required' }, { status: 400 });
        }

        // Security: Validate and sanitize custom_fields
        const safeCustomFields = validateCustomFields(custom_fields);
        if (safeCustomFields === null) {
            return NextResponse.json({ success: false, message: 'Custom fields มีจำนวน key มากเกินไป (สูงสุด 50)' }, { status: 400 });
        }
        const customFieldsStr = JSON.stringify(safeCustomFields);
        if (customFieldsStr.length > 10000) {
            return NextResponse.json({ success: false, message: 'Custom fields data too large (max 10KB)' }, { status: 400 });
        }

        await executeQuery(
            `UPDATE shops 
             SET shop_name = $1, owner_name = $2, address = $3, phone = $4, email = $5, notes = $6, custom_fields = $7
             WHERE id = $8`,
            [shop_name, owner_name, address, phone, email, notes, customFieldsStr, id]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.SHOP,
            entityId: id,
            details: `แก้ไขร้านค้า: ${shop_name}`
        });

        // Revalidate cache so dashboard stats update immediately
        revalidateTag(CACHE_TAGS.SHOPS);
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS);

        const updatedShop = await fetchOne('SELECT * FROM shops WHERE id = $1', [id]);

        return NextResponse.json({ success: true, message: 'อัปเดตร้านค้าเรียบร้อยแล้ว', shop: updatedShop });
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
            return NextResponse.json({ success: false, message: 'Invalid shop ID' }, { status: 400 });
        }

        // Get shop info before deleting for logging
        const shop = await fetchOne('SELECT shop_name FROM shops WHERE id = $1', [id]);

        // Check for licenses first? Usually constraints handle this, but let's just create generic logic.
        // Assuming cascade or check logic. For now just delete.
        await executeQuery('DELETE FROM shops WHERE id = $1', [id]);

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.SHOP,
            entityId: id,
            details: `ลบร้านค้า: ${shop?.shop_name || id}`
        });

        // Revalidate cache so dashboard stats update immediately
        revalidateTag(CACHE_TAGS.SHOPS);
        revalidateTag(CACHE_TAGS.DASHBOARD_STATS);

        return NextResponse.json({ success: true, message: 'ลบร้านค้าเรียบร้อยแล้ว' });
    } catch (err) {
        return NextResponse.json({ success: false, message: 'ไม่สามารถลบได้ (อาจมีใบอนุญาตผูกอยู่)' }, { status: 500 });
    }
}
