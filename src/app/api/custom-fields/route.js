import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// GET - List custom fields (optionally filtered by entity_type)
export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get('entity_type');
        const id = searchParams.get('id');

        // Get single field by ID
        if (id) {
            const field = await fetchOne(
                'SELECT * FROM custom_fields WHERE id = $1',
                [id]
            );
            return NextResponse.json({ success: true, field });
        }

        // Get fields by entity type
        let query = 'SELECT * FROM custom_fields';
        let params = [];

        if (entityType) {
            query += ' WHERE entity_type = $1 AND is_active = true';
            params.push(entityType);
        }

        query += ' ORDER BY display_order ASC, id ASC';

        const fields = await fetchAll(query, params);

        return NextResponse.json({ success: true, fields });
    } catch (err) {
        console.error('Error fetching custom fields:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// POST - Create new custom field
export async function POST(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const {
            entity_type,
            field_name,
            field_label,
            field_type = 'text',
            field_options = [],
            is_required = false,
            display_order = 0,
            show_in_table = true,
            show_in_form = true
        } = body;

        // Validation
        if (!entity_type || !field_name || !field_label) {
            return NextResponse.json({
                success: false,
                message: 'กรุณากรอกข้อมูลที่จำเป็น (entity_type, field_name, field_label)'
            }, { status: 400 });
        }

        // Check if field_name already exists for this entity
        const existing = await fetchOne(
            'SELECT id FROM custom_fields WHERE entity_type = $1 AND field_name = $2',
            [entity_type, field_name]
        );

        if (existing) {
            return NextResponse.json({
                success: false,
                message: 'ชื่อ Field นี้มีอยู่แล้วสำหรับ Entity นี้'
            }, { status: 400 });
        }

        await executeQuery(
            `INSERT INTO custom_fields 
             (entity_type, field_name, field_label, field_type, field_options, is_required, display_order, show_in_table, show_in_form)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [entity_type, field_name, field_label, field_type, JSON.stringify(field_options), is_required, display_order, show_in_table, show_in_form]
        );

        return NextResponse.json({ success: true, message: 'สร้าง Custom Field สำเร็จ' });
    } catch (err) {
        console.error('Error creating custom field:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// PUT - Update custom field
export async function PUT(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const {
            id,
            field_label,
            field_type,
            field_options,
            is_required,
            display_order,
            show_in_table,
            show_in_form,
            is_active
        } = body;

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
        }

        await executeQuery(
            `UPDATE custom_fields 
             SET field_label = COALESCE($1, field_label),
                 field_type = COALESCE($2, field_type),
                 field_options = COALESCE($3, field_options),
                 is_required = COALESCE($4, is_required),
                 display_order = COALESCE($5, display_order),
                 show_in_table = COALESCE($6, show_in_table),
                 show_in_form = COALESCE($7, show_in_form),
                 is_active = COALESCE($8, is_active)
             WHERE id = $9`,
            [field_label, field_type, field_options ? JSON.stringify(field_options) : null, is_required, display_order, show_in_table, show_in_form, is_active, id]
        );

        return NextResponse.json({ success: true, message: 'อัปเดต Custom Field สำเร็จ' });
    } catch (err) {
        console.error('Error updating custom field:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// DELETE - Delete custom field (and its values)
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

        // Delete field (cascade will delete values too)
        await executeQuery('DELETE FROM custom_fields WHERE id = $1', [id]);

        return NextResponse.json({ success: true, message: 'ลบ Custom Field สำเร็จ' });
    } catch (err) {
        console.error('Error deleting custom field:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
