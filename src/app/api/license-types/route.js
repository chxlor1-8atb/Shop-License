
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

        if (id) {
            const type = await fetchOne('SELECT * FROM license_types WHERE id = $1', [id]);
            return NextResponse.json({ success: true, type });
        }

        const query = `
            SELECT lt.*, 
            (SELECT COUNT(*) FROM licenses l WHERE l.license_type_id = lt.id) as license_count
            FROM license_types lt
            ORDER BY lt.id ASC
        `;
        const types = await fetchAll(query);
        return NextResponse.json({ success: true, types });
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
        const { name, price, description, validity_days } = body;

        // Note: Legacy JS used 'type_name' but schema uses 'name'. Mapped in JS or here.
        // Let's stick to DB schema 'name'. The UI should send 'name'.

        if (!name) {
            return NextResponse.json({ success: false, message: 'Missing type name' }, { status: 400 });
        }

        const result = await executeQuery(
            `INSERT INTO license_types (name, price, description, validity_days) VALUES ($1, $2, $3, $4) RETURNING id`,
            [name, parseFloat(price) || 0, description || '', parseInt(validity_days) || 365]
        );

        // Result from neon is the array of rows directly
        const newId = result?.[0]?.id;

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.CREATE,
            entityType: ENTITY_TYPES.LICENSE_TYPE,
            entityId: newId,
            details: `เพิ่มประเภทใบอนุญาต: ${name}`
        });

        return NextResponse.json({ success: true, message: 'เพิ่มประเภทใบอนุญาตเรียบร้อยแล้ว' });
    } catch (err) {
        console.error('Error in POST /api/license-types:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { id, name, price, description, validity_days } = body;

        if (!id || !name) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        await executeQuery(
            `UPDATE license_types SET name = $1, price = $2, description = $3, validity_days = $4 WHERE id = $5`,
            [name, parseFloat(price) || 0, description, parseInt(validity_days), id]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.LICENSE_TYPE,
            entityId: parseInt(id),
            details: `แก้ไขประเภทใบอนุญาต: ${name}`
        });

        return NextResponse.json({ success: true, message: 'บันทึกเรียบร้อยแล้ว' });
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

        // Get type info for logging
        const licenseType = await fetchOne('SELECT name FROM license_types WHERE id = $1', [id]);

        // Check if used
        const count = await fetchOne('SELECT COUNT(*) as count FROM licenses WHERE license_type_id = $1', [id]);
        if (parseInt(count.count) > 0) {
            return NextResponse.json({ success: false, message: 'ไม่สามารถลบได้ เนื่องจากมีการใช้งานอยู่' }, { status: 400 });
        }

        await executeQuery('DELETE FROM license_types WHERE id = $1', [id]);

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.LICENSE_TYPE,
            entityId: parseInt(id),
            details: `ลบประเภทใบอนุญาต: ${licenseType?.name || id}`
        });

        return NextResponse.json({ success: true, message: 'ลบเรียบร้อยแล้ว' });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
