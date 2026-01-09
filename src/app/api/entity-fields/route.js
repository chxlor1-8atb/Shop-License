import { fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// GET - Get single field details (mostly for editing)
export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

        const field = await fetchOne('SELECT * FROM entity_fields WHERE id = $1', [id]);
        return NextResponse.json({ success: true, field });

    } catch (err) {
        console.error('Error fetching field:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// POST - Create new field for an entity
export async function POST(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const {
            entity_id,
            field_name,
            field_label,
            field_type,
            field_options,
            is_required,
            is_unique,
            show_in_list,
            show_in_form,
            display_order,
            default_value
        } = body;

        if (!entity_id || !field_name || !field_label || !field_type) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        // Check duplicate name in same entity
        const existing = await fetchOne(
            'SELECT id FROM entity_fields WHERE entity_id = $1 AND field_name = $2',
            [entity_id, field_name]
        );

        if (existing) {
            return NextResponse.json({ success: false, message: 'Field name already exists in this entity' }, { status: 400 });
        }

        await executeQuery(
            `INSERT INTO entity_fields 
             (entity_id, field_name, field_label, field_type, field_options, is_required, 
              is_unique, show_in_list, show_in_form, display_order, default_value)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                entity_id,
                field_name.toLowerCase(),
                field_label,
                field_type,
                field_options ? JSON.stringify(field_options) : '{}',
                is_required || false,
                is_unique || false,
                show_in_list !== undefined ? show_in_list : true,
                show_in_form !== undefined ? show_in_form : true,
                display_order || 0,
                default_value
            ]
        );

        return NextResponse.json({ success: true, message: 'Field created successfully' });

    } catch (err) {
        console.error('Error creating field:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// PUT - Update field
export async function PUT(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const {
            id,
            field_label,
            field_type,
            field_options,
            is_required,
            is_unique,
            show_in_list,
            show_in_form,
            display_order,
            default_value
        } = body;

        if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

        await executeQuery(
            `UPDATE entity_fields 
             SET field_label = COALESCE($1, field_label),
                 field_type = COALESCE($2, field_type),
                 field_options = COALESCE($3, field_options),
                 is_required = COALESCE($4, is_required),
                 is_unique = COALESCE($5, is_unique),
                 show_in_list = COALESCE($6, show_in_list),
                 show_in_form = COALESCE($7, show_in_form),
                 display_order = COALESCE($8, display_order),
                 default_value = COALESCE($9, default_value)
             WHERE id = $10`,
            [
                field_label,
                field_type,
                field_options ? JSON.stringify(field_options) : null,
                is_required,
                is_unique,
                show_in_list,
                show_in_form,
                display_order,
                default_value,
                id
            ]
        );

        return NextResponse.json({ success: true, message: 'Field updated successfully' });

    } catch (err) {
        console.error('Error updating field:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// DELETE - Delete field
export async function DELETE(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

        await executeQuery('DELETE FROM entity_fields WHERE id = $1', [id]);

        return NextResponse.json({ success: true, message: 'Field deleted successfully' });

    } catch (err) {
        console.error('Error deleting field:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
