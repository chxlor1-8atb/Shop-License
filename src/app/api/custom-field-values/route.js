import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth, requireAdmin, safeErrorMessage } from '@/lib/api-helpers';
import { sanitizeInt, validateEnum } from '@/lib/security';

// Security: Whitelist of allowed entity types
const ALLOWED_ENTITY_TYPES = ['shops', 'licenses', 'license_types'];

export const dynamic = 'force-dynamic';

// GET - Get custom field values for an entity
export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const entityType = validateEnum(searchParams.get('entity_type'), ALLOWED_ENTITY_TYPES, '');
        const entityIdParam = searchParams.get('entity_id');
        const entityId = entityIdParam ? sanitizeInt(entityIdParam, 0, 1) : 0;

        if (!entityType) {
            return NextResponse.json({
                success: false,
                message: 'Valid entity_type จำเป็น'
            }, { status: 400 });
        }

        let query = `
            SELECT 
                cfv.id,
                cfv.entity_id,
                cfv.field_value as value,
                cf.id as field_id,
                cf.field_name
            FROM custom_field_values cfv
            JOIN custom_fields cf ON cfv.custom_field_id = cf.id
            WHERE cf.entity_type = $1 AND cf.is_active = true
        `;
        const params = [entityType];

        // Filter by entity_id if provided
        if (entityId > 0) {
            query += ` AND cfv.entity_id = $2`;
            params.push(entityId);
        }

        const values = await fetchAll(query, params);

        // Convert to object format for easy access
        const valuesMap = {};
        values.forEach(v => {
            valuesMap[v.field_name] = {
                value: v.value,
                field_id: v.field_id
            };
        });

        return NextResponse.json({ success: true, values, valuesMap });
    } catch (err) {
        console.error('Error fetching custom field values:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

// POST - Save/Update custom field values for an entity
export async function POST(request) {
    // Security: Require Admin for write operations
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { values } = body;
        const entity_type = validateEnum(body.entity_type, ALLOWED_ENTITY_TYPES, '');
        const entity_id = sanitizeInt(body.entity_id, 0, 1);

        if (!entity_type || entity_id < 1 || !values) {
            return NextResponse.json({
                success: false,
                message: 'entity_type, entity_id และ values จำเป็น'
            }, { status: 400 });
        }

        // Get all active fields for this entity type
        const fields = await fetchAll(
            'SELECT id, field_name FROM custom_fields WHERE entity_type = $1 AND is_active = true',
            [entity_type]
        );

        // Create a map of field_name to field_id
        const fieldMap = {};
        fields.forEach(f => {
            fieldMap[f.field_name] = f.id;
        });

        // Upsert each value
        for (const [fieldName, value] of Object.entries(values)) {
            const fieldId = fieldMap[fieldName];
            if (!fieldId) continue; // Skip unknown fields

            // Use INSERT ... ON CONFLICT for upsert
            await executeQuery(`
                INSERT INTO custom_field_values(custom_field_id, entity_id, field_value)
                VALUES($1, $2, $3)
                ON CONFLICT(custom_field_id, entity_id) 
                DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()
            `, [fieldId, entity_id, value?.toString() || '']);
        }

        return NextResponse.json({ success: true, message: 'บันทึก Custom Fields สำเร็จ' });
    } catch (err) {
        console.error('Error saving custom field values:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

// DELETE - Delete all custom field values for an entity
export async function DELETE(request) {
    // Check authentication - Require Admin for destructive operation
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const entityType = validateEnum(searchParams.get('entity_type'), ALLOWED_ENTITY_TYPES, '');
        const entityId = sanitizeInt(searchParams.get('entity_id'), 0, 1);

        if (!entityType || entityId < 1) {
            return NextResponse.json({
                success: false,
                message: 'Valid entity_type และ entity_id จำเป็น'
            }, { status: 400 });
        }

        // Delete all values for this entity
        await executeQuery(`
            DELETE FROM custom_field_values 
            WHERE entity_id = $1 
            AND custom_field_id IN(SELECT id FROM custom_fields WHERE entity_type = $2)
            `, [entityId, entityType]);

        return NextResponse.json({ success: true, message: 'ลบ Custom Field Values สำเร็จ' });
    } catch (err) {
        console.error('Error deleting custom field values:', err);
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
