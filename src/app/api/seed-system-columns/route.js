import { executeQuery, fetchOne, fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// System columns definitions for shops and licenses
const SYSTEM_COLUMNS = {
    shops: [
        { field_name: 'shop_name', field_label: 'ชื่อร้านค้า', field_type: 'text', display_order: 1 },
        { field_name: 'owner_name', field_label: 'ชื่อเจ้าของ', field_type: 'text', display_order: 2 },
        { field_name: 'phone', field_label: 'เบอร์โทรศัพท์', field_type: 'text', display_order: 3 },
        { field_name: 'address', field_label: 'ที่อยู่', field_type: 'text', display_order: 4 },
        { field_name: 'email', field_label: 'อีเมล', field_type: 'text', display_order: 5 },
        { field_name: 'notes', field_label: 'หมายเหตุ', field_type: 'text', display_order: 6 },
        { field_name: 'license_count', field_label: 'จำนวนใบอนุญาต', field_type: 'number', display_order: 7 },
    ],
    licenses: [
        { field_name: 'shop_id', field_label: 'ร้านค้า', field_type: 'select', display_order: 1 },
        { field_name: 'license_type_id', field_label: 'ประเภทใบอนุญาต', field_type: 'select', display_order: 2 },
        { field_name: 'license_number', field_label: 'เลขที่ใบอนุญาต', field_type: 'text', display_order: 3 },
        { field_name: 'issue_date', field_label: 'วันที่ออก', field_type: 'date', display_order: 4 },
        { field_name: 'expiry_date', field_label: 'วันหมดอายุ', field_type: 'date', display_order: 5 },
        { field_name: 'status', field_label: 'สถานะ', field_type: 'select', display_order: 6 },
        { field_name: 'notes', field_label: 'หมายเหตุ', field_type: 'text', display_order: 7 },
    ]
};

// POST - Seed system columns for shops and licenses
export async function POST(request) {
    try {
        const results = {
            shops: [],
            licenses: []
        };
        let totalCreated = 0;
        let totalSkipped = 0;

        for (const [entityType, columns] of Object.entries(SYSTEM_COLUMNS)) {
            for (const col of columns) {
                // Check if already exists
                const existing = await fetchOne(
                    'SELECT id FROM custom_fields WHERE entity_type = $1 AND field_name = $2',
                    [entityType, col.field_name]
                );

                if (existing) {
                    results[entityType].push({
                        field_name: col.field_name,
                        status: 'skipped',
                        message: 'มีอยู่แล้ว',
                        id: existing.id
                    });
                    totalSkipped++;
                } else {
                    // Insert new system column
                    const insertResult = await executeQuery(
                        `INSERT INTO custom_fields 
                         (entity_type, field_name, field_label, field_type, field_options, is_required, display_order, show_in_table, show_in_form, is_active, is_system_field)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                         RETURNING id`,
                        [
                            entityType,
                            col.field_name,
                            col.field_label,
                            col.field_type,
                            JSON.stringify([]),
                            false,
                            col.display_order,
                            true,
                            true,
                            true,
                            true // is_system_field = true
                        ]
                    );
                    results[entityType].push({
                        field_name: col.field_name,
                        status: 'created',
                        message: 'สร้างสำเร็จ'
                    });
                    totalCreated++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Seed สำเร็จ - สร้าง ${totalCreated} รายการ, ข้าม ${totalSkipped} รายการ`,
            results
        });

    } catch (err) {
        console.error('Error seeding system columns:', err);
        return NextResponse.json({
            success: false,
            message: err.message
        }, { status: 500 });
    }
}

// GET - Check current system columns
export async function GET(request) {
    try {
        const shops = await fetchAll(
            'SELECT id, field_name, field_label, field_type, is_system_field, display_order FROM custom_fields WHERE entity_type = $1 ORDER BY display_order',
            ['shops']
        );
        const licenses = await fetchAll(
            'SELECT id, field_name, field_label, field_type, is_system_field, display_order FROM custom_fields WHERE entity_type = $1 ORDER BY display_order',
            ['licenses']
        );

        return NextResponse.json({
            success: true,
            message: 'ใช้ POST request เพื่อ seed system columns',
            currentColumns: {
                shops,
                licenses
            },
            requiredColumns: SYSTEM_COLUMNS
        });
    } catch (err) {
        return NextResponse.json({
            success: false,
            message: err.message
        }, { status: 500 });
    }
}
