
import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAuth, getCurrentUser } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const search = searchParams.get('search') || '';
        const license_type = searchParams.get('license_type') || '';
        const status = searchParams.get('status') || '';
        const page = parseInt(searchParams.get('page'), 10) || 1;
        const limit = parseInt(searchParams.get('limit'), 10) || 20;
        const offset = (page - 1) * limit;

        // Get Single License
        if (id) {
            const license = await fetchOne('SELECT * FROM licenses WHERE id = $1', [id]);
            return NextResponse.json({ success: true, license });
        }

        // List Licenses
        let whereClauses = [];
        let params = [];
        let paramIndex = 1;

        if (search) {
            whereClauses.push(`(s.shop_name ILIKE $${paramIndex} OR l.license_number ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (license_type) {
            whereClauses.push(`l.license_type_id = $${paramIndex}`);
            params.push(license_type);
            paramIndex++;
        }

        if (status) {
            whereClauses.push(`l.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        let whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

        const countQuery = `
            SELECT COUNT(*) as total 
            FROM licenses l
            LEFT JOIN shops s ON l.shop_id = s.id
            ${whereSQL}
        `;

        // Parallelize Count and Data Fetch
        const query = `
            SELECT l.*, s.shop_name, lt.name as type_name
            FROM licenses l
            LEFT JOIN shops s ON l.shop_id = s.id
            LEFT JOIN license_types lt ON l.license_type_id = lt.id
            ${whereSQL}
            ORDER BY l.id DESC
            LIMIT ${limit} OFFSET ${offset}
        `;

        const [countResult, licenses] = await Promise.all([
            fetchOne(countQuery, params),
            fetchAll(query, params)
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
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes, custom_fields } = body;

        if (!shop_id || !license_type_id || !license_number) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        const result = await executeQuery(
            `INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes, custom_fields) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [shop_id, license_type_id, license_number, issue_date, expiry_date, status || 'active', notes, JSON.stringify(custom_fields || {})]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.CREATE,
            entityType: ENTITY_TYPES.LICENSE,
            entityId: result?.rows?.[0]?.id || null,
            details: `เพิ่มใบอนุญาตหมายเลข: ${license_number}`
        });

        return NextResponse.json({ success: true, message: 'เพิ่มใบอนุญาตเรียบร้อยแล้ว' });
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
        const { id, shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes, custom_fields } = body;

        if (!id || !shop_id || !license_type_id) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        await executeQuery(
            `UPDATE licenses 
             SET shop_id = $1, license_type_id = $2, license_number = $3, issue_date = $4, expiry_date = $5, status = $6, notes = $7, custom_fields = $8
             WHERE id = $9`,
            [shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes, JSON.stringify(custom_fields || {}), id]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.LICENSE,
            entityId: parseInt(id),
            details: `แก้ไขใบอนุญาตหมายเลข: ${license_number}`
        });

        return NextResponse.json({ success: true, message: 'บันทึกใบอนุญาตเรียบร้อยแล้ว' });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
        }

        // Get license info before deleting for logging
        const license = await fetchOne('SELECT license_number FROM licenses WHERE id = $1', [id]);

        await executeQuery('DELETE FROM licenses WHERE id = $1', [id]);

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.LICENSE,
            entityId: parseInt(id),
            details: `ลบใบอนุญาตหมายเลข: ${license?.license_number || id}`
        });

        return NextResponse.json({ success: true, message: 'ลบใบอนุญาตเรียบร้อยแล้ว' });
    } catch (err) {
        return NextResponse.json({ success: false, message: 'ไม่สามารถลบได้' }, { status: 500 });
    }
}
