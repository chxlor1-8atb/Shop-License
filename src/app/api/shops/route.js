
import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAuth, requireAdmin, getCurrentUser } from '@/lib/api-helpers';
import { sanitizeInt, sanitizeString } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const search = sanitizeString(searchParams.get('search') || '', 100);

        // Security: Sanitize pagination parameters
        const page = sanitizeInt(searchParams.get('page'), 1, 1, 1000);
        const limit = sanitizeInt(searchParams.get('limit'), 20, 1, 100);
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
        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        if (search) {
            // ค้นหาในทุกฟิลด์หลัก และใน custom_fields (JSONB)
            whereClause = `WHERE 
                shop_name ILIKE $1 OR 
                owner_name ILIKE $1 OR 
                phone ILIKE $1 OR 
                address ILIKE $1 OR 
                email ILIKE $1 OR 
                notes ILIKE $1 OR
                custom_fields::text ILIKE $1`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        const countQuery = `SELECT COUNT(*) as total FROM shops ${whereClause}`;

        // Security: Use parameterized queries for LIMIT/OFFSET
        const limitParamIndex = paramIndex;
        const offsetParamIndex = paramIndex + 1;

        const query = `
            SELECT s.*, 
            (SELECT COUNT(*) FROM licenses l WHERE l.shop_id = s.id AND l.status = 'active') as license_count
            FROM shops s
            ${whereClause}
            ORDER BY s.id DESC
            LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
        `;

        const [countResult, shops] = await Promise.all([
            fetchOne(countQuery, params),
            fetchAll(query, [...params, limit, offset])
        ]);

        const total = parseInt(countResult?.total || 0, 10);
        const totalPages = Math.ceil(total / limit);

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
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { shop_name, owner_name, address, phone, email, notes, custom_fields } = body;

        if (!shop_name) {
            return NextResponse.json({ success: false, message: 'Shop name is required' }, { status: 400 });
        }

        const result = await executeQuery(
            `INSERT INTO shops (shop_name, owner_name, address, phone, email, notes, custom_fields) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [shop_name, owner_name, address, phone, email, notes, JSON.stringify(custom_fields || {})]
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

        return NextResponse.json({ success: true, message: 'เพิ่มร้านค้าเรียบร้อยแล้ว' });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { id, shop_name, owner_name, address, phone, email, notes, custom_fields } = body;

        if (!id || !shop_name) {
            return NextResponse.json({ success: false, message: 'ID and Shop name are required' }, { status: 400 });
        }

        await executeQuery(
            `UPDATE shops 
             SET shop_name = $1, owner_name = $2, address = $3, phone = $4, email = $5, notes = $6, custom_fields = $7
             WHERE id = $8`,
            [shop_name, owner_name, address, phone, email, notes, JSON.stringify(custom_fields || {}), id]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.SHOP,
            entityId: parseInt(id),
            details: `แก้ไขร้านค้า: ${shop_name}`
        });

        return NextResponse.json({ success: true, message: 'อัปเดตร้านค้าเรียบร้อยแล้ว' });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
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
            entityId: parseInt(id),
            details: `ลบร้านค้า: ${shop?.shop_name || id}`
        });

        return NextResponse.json({ success: true, message: 'ลบร้านค้าเรียบร้อยแล้ว' });
    } catch (err) {
        return NextResponse.json({ success: false, message: 'ไม่สามารถลบได้ (อาจมีใบอนุญาตผูกอยู่)' }, { status: 500 });
    }
}
