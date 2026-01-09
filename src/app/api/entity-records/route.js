import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// GET - List records for an entity
export async function GET(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const entitySlug = searchParams.get('entity');
        const id = searchParams.get('id');

        if (!entitySlug) {
            return NextResponse.json({ success: false, message: 'Entity slug required' }, { status: 400 });
        }

        // Get Entity ID and Fields
        const entity = await fetchOne('SELECT id FROM entities WHERE slug = $1', [entitySlug]);
        if (!entity) {
            return NextResponse.json({ success: false, message: 'Entity not found' }, { status: 404 });
        }

        const fields = await fetchAll(
            'SELECT * FROM entity_fields WHERE entity_id = $1 ORDER BY display_order ASC',
            [entity.id]
        );

        // Build EAV Query
        // We select the record ID and then join values for each field
        // This is a simplified "dumb" fetch - fetching all values for the records found

        let query = `
            SELECT r.id as record_id, r.created_at, r.updated_at
            FROM entity_records r
            WHERE r.entity_id = $1
        `;
        const params = [entity.id];

        if (id) {
            query += ' AND r.id = $2';
            params.push(id);
        }

        query += ' ORDER BY r.created_at DESC';

        const records = await fetchAll(query, params);

        if (records.length === 0) {
            return NextResponse.json({ success: true, data: id ? null : [] });
        }

        // Fetch all values for these records
        const recordIds = records.map(r => r.record_id);
        const values = await fetchAll(`
            SELECT v.*, f.field_name, f.field_type
            FROM entity_values v
            JOIN entity_fields f ON v.field_id = f.id
            WHERE v.record_id = ANY($1::int[])
        `, [recordIds]);

        // Map values back to records
        const data = records.map(record => {
            const recordValues = {};
            // Initialize with nulls/defaults
            fields.forEach(f => recordValues[f.field_name] = null);

            // Fill with actual values
            values.filter(v => v.record_id === record.record_id).forEach(v => {
                // Determine which value column to use based on type
                let val = v.value_text;
                if (v.field_type === 'number') val = v.value_number;
                else if (v.field_type === 'boolean') val = v.value_boolean;
                else if (v.field_type === 'date') val = v.value_date;

                recordValues[v.field_name] = val;
            });

            return {
                id: record.record_id,
                created_at: record.created_at,
                updated_at: record.updated_at,
                ...recordValues
            };
        });

        if (id) {
            return NextResponse.json({ success: true, record: data[0] });
        }

        return NextResponse.json({ success: true, data });

    } catch (err) {
        console.error('Error fetching records:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// POST - Create new record
export async function POST(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { entitySlug, data } = body;

        if (!entitySlug || !data) {
            return NextResponse.json({ success: false, message: 'Entity slug and data required' }, { status: 400 });
        }

        const entity = await fetchOne('SELECT id FROM entities WHERE slug = $1', [entitySlug]);
        if (!entity) return NextResponse.json({ success: false, message: 'Entity not found' }, { status: 404 });

        const fields = await fetchAll('SELECT * FROM entity_fields WHERE entity_id = $1', [entity.id]);

        // Start transaction (simulated)
        // 1. Create Record
        const recordResult = await executeQuery(
            'INSERT INTO entity_records (entity_id) VALUES ($1) RETURNING id',
            [entity.id]
        );
        const recordId = recordResult[0].id;

        // 2. Insert Values
        for (const field of fields) {
            const value = data[field.field_name];
            if (value === undefined || value === null || value === '') continue;

            let col = 'value_text';
            if (field.field_type === 'number') col = 'value_number';
            else if (field.field_type === 'boolean') col = 'value_boolean';
            else if (field.field_type === 'date') col = 'value_date';

            await executeQuery(
                `INSERT INTO entity_values (record_id, field_id, ${col}) VALUES ($1, $2, $3)`,
                [recordId, field.id, value]
            );
        }

        return NextResponse.json({ success: true, message: 'Record created', id: recordId });

    } catch (err) {
        console.error('Error creating record:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// PUT - Update record
export async function PUT(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { entitySlug, id, data } = body;

        if (!entitySlug || !id || !data) {
            return NextResponse.json({ success: false, message: 'Required fields missing' }, { status: 400 });
        }

        const entity = await fetchOne('SELECT id FROM entities WHERE slug = $1', [entitySlug]);
        if (!entity) return NextResponse.json({ success: false, message: 'Entity not found' }, { status: 404 });

        const fields = await fetchAll('SELECT * FROM entity_fields WHERE entity_id = $1', [entity.id]);

        // Update timestamp
        await executeQuery('UPDATE entity_records SET updated_at = NOW() WHERE id = $1', [id]);

        // Upsert values
        for (const field of fields) {
            const value = data[field.field_name];
            if (value === undefined) continue; // Skip if not present in update payload

            let col = 'value_text';
            if (field.field_type === 'number') col = 'value_number';
            else if (field.field_type === 'boolean') col = 'value_boolean';
            else if (field.field_type === 'date') col = 'value_date';

            // Delete old value first (simplest way to handle upsert/clear for EAV without complex conditional SQL)
            // Or better: use ON CONFLICT
            await executeQuery(
                `INSERT INTO entity_values (record_id, field_id, ${col}) 
                 VALUES ($1, $2, $3)
                 ON CONFLICT (record_id, field_id) 
                 DO UPDATE SET ${col} = EXCLUDED.${col}, 
                               value_text = NULL, value_number = NULL, value_date = NULL, value_boolean = NULL
                               -- Note: We reset other columns to NULL to handle type changes or just safety
                `,
                [id, field.id, value === '' ? null : value]
            );

            // Because we only update the specific typed column, we must make sure to NULL out others if we reused the row?
            // Actually, for a single field_id, the type is fixed in entity_fields. 
            // So we don't need to null out other columns unless field type changed (which is rare operation).
            // But the ON CONFLICT clause above is tricky because we need to clear the specific column if value is null.

            /* Enhanced Logic for clean updates: */
            if (value === null || value === '') {
                await executeQuery('DELETE FROM entity_values WHERE record_id = $1 AND field_id = $2', [id, field.id]);
            } else {
                await executeQuery(
                    `INSERT INTO entity_values (record_id, field_id, ${col}) VALUES ($1, $2, $3)
                     ON CONFLICT (record_id, field_id) DO UPDATE SET ${col} = $3`,
                    [id, field.id, value]
                );
            }
        }

        return NextResponse.json({ success: true, message: 'Record updated' });

    } catch (err) {
        console.error('Error updating record:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// DELETE - Delete record
export async function DELETE(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ success: false, message: 'ID required' }, { status: 400 });

        await executeQuery('DELETE FROM entity_records WHERE id = $1', [id]);

        return NextResponse.json({ success: true, message: 'Record deleted' });

    } catch (err) {
        console.error('Error deleting record:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
