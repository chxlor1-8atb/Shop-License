import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// Standard fields for different entity types
const STANDARD_FIELDS = {
    licenses: [
        { field_name: 'shop_id', field_label: 'ร้านค้า', field_type: 'select', display_order: 1, is_system_field: true },
        { field_name: 'license_type_id', field_label: 'ประเภทใบอนุญาต', field_type: 'select', display_order: 2, is_system_field: true },
        { field_name: 'license_number', field_label: 'เลขที่ใบอนุญาต', field_type: 'text', display_order: 3, is_system_field: true },
        { field_name: 'issue_date', field_label: 'วันที่ออก', field_type: 'date', display_order: 4, is_system_field: true },
        { field_name: 'expiry_date', field_label: 'วันหมดอายุ', field_type: 'date', display_order: 5, is_system_field: true },
        { field_name: 'status', field_label: 'สถานะ', field_type: 'select', display_order: 6, is_system_field: true },
        { field_name: 'notes', field_label: 'หมายเหตุ', field_type: 'text', display_order: 7, is_system_field: true },
    ],
    shops: [
        { field_name: 'shop_name', field_label: 'ชื่อร้านค้า', field_type: 'text', display_order: 1, is_system_field: true },
        { field_name: 'owner_name', field_label: 'ชื่อเจ้าของ', field_type: 'text', display_order: 2, is_system_field: true },
        { field_name: 'phone', field_label: 'เบอร์โทรศัพท์', field_type: 'text', display_order: 3, is_system_field: true },
        { field_name: 'address', field_label: 'ที่อยู่', field_type: 'text', display_order: 4, is_system_field: true },
        { field_name: 'email', field_label: 'อีเมล', field_type: 'text', display_order: 5, is_system_field: true },
        { field_name: 'notes', field_label: 'หมายเหตุ', field_type: 'text', display_order: 6, is_system_field: true },
        { field_name: 'license_count', field_label: 'จำนวนใบอนุญาต', field_type: 'number', display_order: 7, is_system_field: true },
    ]
};

// POST - Seed standard fields for an entity type
export async function POST(request) {
    // Check authentication
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { entity_type } = body;

        if (!entity_type || !STANDARD_FIELDS[entity_type]) {
            return NextResponse.json({
                success: false,
                message: 'Invalid entity_type. Supported: licenses, shops'
            }, { status: 400 });
        }

        const fields = STANDARD_FIELDS[entity_type];
        let inserted = 0;
        let skipped = 0;

        for (const field of fields) {
            // Check if field already exists
            const existing = await fetchOne(
                'SELECT id FROM custom_fields WHERE entity_type = $1 AND field_name = $2',
                [entity_type, field.field_name]
            );

            if (existing) {
                skipped++;
                continue;
            }

            // Insert field
            await executeQuery(
                `INSERT INTO custom_fields 
                 (entity_type, field_name, field_label, field_type, display_order, is_system_field, is_active, show_in_table, show_in_form)
                 VALUES ($1, $2, $3, $4, $5, $6, true, true, true)`,
                [entity_type, field.field_name, field.field_label, field.field_type, field.display_order, field.is_system_field]
            );
            inserted++;
        }

        return NextResponse.json({
            success: true,
            message: `Seeded ${inserted} fields, skipped ${skipped} existing fields`,
            inserted,
            skipped
        });
    } catch (err) {
        console.error('Error seeding standard fields:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// GET - Get seed status for all entity types
export async function GET(request) {
    // Check authentication  
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const status = {};

        for (const entityType of Object.keys(STANDARD_FIELDS)) {
            const fields = await fetchAll(
                'SELECT field_name, field_label, is_system_field FROM custom_fields WHERE entity_type = $1 ORDER BY display_order',
                [entityType]
            );
            status[entityType] = {
                expected: STANDARD_FIELDS[entityType].length,
                found: fields.length,
                fields: fields
            };
        }

        return NextResponse.json({ success: true, status });
    } catch (err) {
        console.error('Error getting seed status:', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
