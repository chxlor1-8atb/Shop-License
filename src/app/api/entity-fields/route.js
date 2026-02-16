import { fetchOne, executeQuery } from '@/lib/db';
import { sanitizeInt, sanitizeString, validateEnum } from '@/lib/security';
import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin, getCurrentUser, safeErrorMessage } from '@/lib/api-helpers';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';

const ALLOWED_FIELD_TYPES = ['text', 'number', 'date', 'select', 'boolean', 'textarea', 'email', 'phone', 'url'];

export const dynamic = 'force-dynamic';

// GET - Get single field details (mostly for editing)
export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = sanitizeInt(searchParams.get('id'), 0, 1);

        if (id < 1) return NextResponse.json({ success: false, message: 'Valid ID required' }, { status: 400 });

        const field = await fetchOne('SELECT * FROM entity_fields WHERE id = $1', [id]);
        return NextResponse.json({ success: true, field });

    } catch (err) {
        console.error('Error fetching field:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

// POST - Create new field for an entity
export async function POST(request) {
    // Check authentication - Require Admin for schema changes
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const {
            field_options,
            is_required = false,
            is_unique = false,
            show_in_list = true,
            show_in_form = true,
            default_value
        } = body;
        const entity_id = sanitizeInt(body.entity_id, 0, 1);
        const field_name = sanitizeString(body.field_name || '', 100);
        const field_label = sanitizeString(body.field_label || '', 255);
        const field_type = validateEnum(body.field_type, ALLOWED_FIELD_TYPES, 'text');
        const display_order = sanitizeInt(body.display_order, 0, 0, 1000);

        if (entity_id < 1 || !field_name || !field_label) {
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
                is_required,
                is_unique,
                show_in_list,
                show_in_form,
                display_order,
                default_value ? sanitizeString(String(default_value), 500) : null
            ]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.CREATE,
            entityType: ENTITY_TYPES.ENTITY_FIELD,
            entityId: entity_id,
            details: `สร้าง Entity Field: ${field_label} (${field_name})`
        });

        return NextResponse.json({ success: true, message: 'Field created successfully' });

    } catch (err) {
        console.error('Error creating field:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

// PUT - Update field
export async function PUT(request) {
    // Check authentication - Require Admin for schema changes
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const {
            field_options,
            is_required,
            is_unique,
            show_in_list,
            show_in_form,
            default_value
        } = body;
        const id = sanitizeInt(body.id, 0, 1);
        const field_label = body.field_label ? sanitizeString(body.field_label, 255) : null;
        const field_type = body.field_type ? validateEnum(body.field_type, ALLOWED_FIELD_TYPES, null) : null;
        const display_order = body.display_order !== undefined ? sanitizeInt(body.display_order, 0, 0, 1000) : null;

        if (id < 1) return NextResponse.json({ success: false, message: 'Valid ID required' }, { status: 400 });

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
                is_required !== undefined ? is_required : null,
                is_unique !== undefined ? is_unique : null,
                show_in_list !== undefined ? show_in_list : null,
                show_in_form !== undefined ? show_in_form : null,
                display_order,
                default_value !== undefined ? sanitizeString(String(default_value || ''), 500) : null,
                id
            ]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.ENTITY_FIELD,
            entityId: id,
            details: `อัปเดต Entity Field ID: ${id}`
        });

        return NextResponse.json({ success: true, message: 'Field updated successfully' });

    } catch (err) {
        console.error('Error updating field:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

// DELETE - Delete field
export async function DELETE(request) {
    // Check authentication - Require Admin for schema changes
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = sanitizeInt(searchParams.get('id'), 0, 1);

        if (id < 1) return NextResponse.json({ success: false, message: 'Valid ID required' }, { status: 400 });

        await executeQuery('DELETE FROM entity_fields WHERE id = $1', [id]);

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.ENTITY_FIELD,
            entityId: id,
            details: `ลบ Entity Field ID: ${id}`
        });

        return NextResponse.json({ success: true, message: 'Field deleted successfully' });

    } catch (err) {
        console.error('Error deleting field:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
