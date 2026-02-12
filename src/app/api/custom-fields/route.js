import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { sanitizeInt, sanitizeString, validateEnum } from '@/lib/security';
import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin, safeErrorMessage } from '@/lib/api-helpers';

// Security: Allowed entity types and field types
const ALLOWED_ENTITY_TYPES = ['shops', 'licenses', 'users', 'license_types'];
const ALLOWED_FIELD_TYPES = ['text', 'number', 'date', 'select', 'boolean', 'textarea'];

export const dynamic = 'force-dynamic';

// GET - List custom fields (optionally filtered by entity_type)
export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get('entity_type');
        const idParam = searchParams.get('id');

        // Get single field by ID
        if (idParam) {
            const id = sanitizeInt(idParam, 0, 1);
            if (id < 1) {
                return NextResponse.json({ success: false, message: 'Invalid field ID' }, { status: 400 });
            }
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
            const validatedEntityType = validateEnum(entityType, ALLOWED_ENTITY_TYPES, '');
            if (!validatedEntityType) {
                return NextResponse.json({ success: false, message: 'Invalid entity type' }, { status: 400 });
            }
            query += ' WHERE entity_type = $1 AND is_active = true';
            params.push(validatedEntityType);
        }

        query += ' ORDER BY display_order ASC, id ASC';

        const fields = await fetchAll(query, params);

        return NextResponse.json({ success: true, fields });
    } catch (err) {
        console.error('Error fetching custom fields:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
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
            field_type = 'text',
            field_options = [],
            is_required = false,
            display_order = 0,
            show_in_table = true,
            show_in_form = true
        } = body;

        // Security: Sanitize field_name (strict: alphanumeric, Thai, underscore only)
        const field_name = sanitizeString(body.field_name || '', 100)
            .replace(/[^a-zA-Z0-9_\u0E00-\u0E7F]/g, '_');
        // Security: Sanitize field_label
        const field_label = sanitizeString(body.field_label || '', 255);

        // Security: Validate entity_type against whitelist
        const entity_type = validateEnum(body.entity_type, ALLOWED_ENTITY_TYPES, '');

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

        const result = await executeQuery(
            `INSERT INTO custom_fields 
             (entity_type, field_name, field_label, field_type, field_options, is_required, display_order, show_in_table, show_in_form)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [entity_type, field_name, field_label, field_type, JSON.stringify(field_options), is_required, display_order, show_in_table, show_in_form]
        );

        const newId = result?.[0]?.id;

        return NextResponse.json({ success: true, message: 'สร้าง Custom Field สำเร็จ', field: { id: newId } });
    } catch (err) {
        console.error('Error creating custom field:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
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
            field_options,
            is_required,
            show_in_table,
            show_in_form,
            is_active
        } = body;
        const id = sanitizeInt(body.id, 0, 1);
        const field_label = body.field_label ? sanitizeString(body.field_label, 255) : null;
        const field_type = body.field_type ? validateEnum(body.field_type, ALLOWED_FIELD_TYPES, null) : null;
        const display_order = body.display_order !== undefined ? sanitizeInt(body.display_order, 0, 0, 1000) : null;

        if (id < 1) {
            return NextResponse.json({ success: false, message: 'Invalid field ID' }, { status: 400 });
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
            [field_label, field_type, field_options ? JSON.stringify(field_options) : null, is_required !== undefined ? is_required : null, display_order !== undefined ? display_order : null, show_in_table !== undefined ? show_in_table : null, show_in_form !== undefined ? show_in_form : null, is_active !== undefined ? is_active : null, id]
        );

        return NextResponse.json({ success: true, message: 'อัปเดต Custom Field สำเร็จ' });
    } catch (err) {
        console.error('Error updating custom field:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

// DELETE - Delete custom field (and its values)
export async function DELETE(request) {
    // Check authentication - Require Admin
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = sanitizeInt(searchParams.get('id'), 0, 1);

        if (id < 1) {
            return NextResponse.json({ success: false, message: 'Invalid field ID' }, { status: 400 });
        }

        // Delete field (cascade will delete values too)
        await executeQuery('DELETE FROM custom_fields WHERE id = $1', [id]);

        return NextResponse.json({ success: true, message: 'ลบ Custom Field สำเร็จ' });
    } catch (err) {
        console.error('Error deleting custom field:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
