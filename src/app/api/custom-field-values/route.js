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
    console.log('POST /api/custom-field-values - Starting request');
    
    // Security: Require Admin for write operations
    const authError = await requireAdmin();
    if (authError) {
        console.log('POST /api/custom-field-values - Auth failed:', authError);
        return authError;
    }
    
    console.log('POST /api/custom-field-values - Auth passed');

    let body, entity_type, entity_id, values;
    
    try {
        body = await request.json();
        console.log('POST /api/custom-field-values - Request body:', JSON.stringify(body, null, 2));
        
        values = body.values;
        entity_type = validateEnum(body.entity_type, ALLOWED_ENTITY_TYPES, '');
        entity_id = sanitizeInt(body.entity_id, 0, 1);

        console.log('Parsed data - entity_type:', entity_type, 'entity_id:', entity_id, 'values:', values);

        if (!entity_type || entity_id < 1 || !values) {
            console.log('Validation failed - entity_type:', entity_type, 'entity_id:', entity_id, 'has values:', !!values);
            return NextResponse.json({
                success: false,
                message: 'entity_type, entity_id และ values จำเป็น'
            }, { status: 400 });
        }

        // Get all active fields for this entity type
        console.log('Fetching custom fields for entity_type:', entity_type);
        const fields = await fetchAll(
            'SELECT id, field_name FROM custom_fields WHERE entity_type = $1 AND is_active = true',
            [entity_type]
        );
        
        console.log('Found custom fields:', fields);

        // If no custom fields exist, just return success
        if (fields.length === 0) {
            console.log('No custom fields defined for this entity type, returning success');
            return NextResponse.json({ success: true, message: 'บันทึก Custom Fields สำเร็จ (ไม่มีฟิลด์)' });
        }

        // Create a map of field_name to field_id
        const fieldMap = {};
        fields.forEach(f => {
            fieldMap[f.field_name] = f.id;
        });
        console.log('Field map:', fieldMap);

        // Upsert each value
        const entries = Object.entries(values);
        console.log('Processing custom values entries:', entries);
        
        for (const [fieldName, value] of entries) {
            const fieldId = fieldMap[fieldName];
            console.log(`Processing field: ${fieldName}, fieldId: ${fieldId}, value:`, value);
            
            if (!fieldId) {
                console.log(`Skipping unknown field: ${fieldName}`);
                continue; // Skip unknown fields
            }

            // Use INSERT ... ON CONFLICT for upsert
            const query = `
                INSERT INTO custom_field_values(custom_field_id, entity_id, field_value, updated_at)
                VALUES($1, $2, $3, NOW())
                ON CONFLICT(custom_field_id, entity_id) 
                DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = EXCLUDED.updated_at
            `;
            const params = [fieldId, entity_id, value?.toString() || ''];
            
            console.log('Executing query:', query);
            console.log('Query params:', params);
            
            await executeQuery(query, params);
            console.log(`Successfully saved field: ${fieldName}`);
        }

        console.log('POST /api/custom-field-values - Success');
        return NextResponse.json({ success: true, message: 'บันทึก Custom Fields สำเร็จ' });
    } catch (err) {
        console.error('POST /api/custom-field-values - Error:', err);
        console.error('Error stack:', err.stack);
        console.error('Request body:', body);
        console.error('Entity type:', entity_type, 'Entity ID:', entity_id);
        console.error('Custom values:', values);
        
        // Return detailed error for debugging
        const errorMessage = process.env.NODE_ENV === 'production' 
            ? err.message || 'Unknown error occurred'
            : `${err.message}\n\nStack: ${err.stack}`;
            
        return NextResponse.json({ 
            success: false, 
            message: errorMessage,
            details: {
                error: err.message,
                stack: err.stack,
                body: body,
                entity_type: entity_type,
                entity_id: entity_id,
                values: values
            }
        }, { status: 500 });
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
