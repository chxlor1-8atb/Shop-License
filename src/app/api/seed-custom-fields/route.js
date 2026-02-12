import { fetchOne, fetchAll, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

// Security: Block seed routes in production
function isProductionBlocked() {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
        return NextResponse.json(
            { success: false, message: 'Seed routes are disabled in production' },
            { status: 403 }
        );
    }
    return null;
}

// Custom Field Definitions ที่จะสร้าง (ถ้ายังไม่มี)
const mockCustomFieldDefinitions = [
    {
        entity_type: 'licenses',
        field_name: 'สถานที่จำหน่าย',
        field_label: 'สถานที่จำหน่าย',
        field_type: 'text',
        display_order: 1
    },
    {
        entity_type: 'licenses',
        field_name: 'จำนวนเงิน',
        field_label: 'จำนวนเงิน',
        field_type: 'number',
        display_order: 2
    },
    {
        entity_type: 'licenses',
        field_name: 'พื้นที่ (ตารางเมตร)',
        field_label: 'พื้นที่ (ตารางเมตร)',
        field_type: 'text',
        display_order: 3
    },
    {
        entity_type: 'licenses',
        field_name: 'พื้นที่(แรงม้า)',
        field_label: 'พื้นที่(แรงม้า)',
        field_type: 'text',
        display_order: 4
    }
];

// ข้อมูลจำลองสำหรับ Custom Fields
const mockCustomFieldValues = {
    // สถานที่จำหน่าย
    'สถานที่จำหน่าย': [
        'ตลาดนัดจตุจักร',
        'ห้างสรรพสินค้าเซ็นทรัล',
        'ตลาดสดเทศบาล',
        'ศูนย์การค้าฟิวเจอร์พาร์ค',
        'ตลาดนัดรถไฟรัชดา',
        'ห้างโรบินสัน',
        'ตลาดโต้รุ่ง',
        'ศูนย์อาหาร MBK',
        'ตลาดนัดหลังมอ',
        'ห้างเดอะมอลล์'
    ],
    // จำนวนเงิน (ค่าธรรมเนียม)
    'จำนวนเงิน': ['500', '1000', '1500', '2000', '2500', '3000', '3500', '4000', '4500', '5000'],
    // พื้นที่ (ตารางเมตร)
    'พื้นที่ (ตารางเมตร)': ['10', '15', '20', '25', '30', '35', '40', '50', '60', '100'],
    // พื้นที่ (แรงม้า)
    'พื้นที่(แรงม้า)': ['5', '10', '15', '20', '25', '50', '75', '100', '150', '200']
};

export async function POST(request) {
    // Security: Require admin authentication
    const authError = await requireAdmin();
    if (authError) return authError;

    // Security: Block in production unless explicitly allowed
    const prodBlock = isProductionBlocked();
    if (prodBlock) return prodBlock;

    try {
        let fieldDefCount = 0;
        let valueCount = 0;
        const fieldDefResults = [];
        const valueResults = [];

        // ขั้นตอนที่ 1: ตรวจสอบและสร้าง Custom Field definitions ถ้ายังไม่มี
        for (const fieldDef of mockCustomFieldDefinitions) {
            const existing = await fetchOne(
                'SELECT id FROM custom_fields WHERE entity_type = $1 AND field_name = $2',
                [fieldDef.entity_type, fieldDef.field_name]
            );

            if (existing) {
                fieldDefResults.push({
                    field_name: fieldDef.field_name,
                    status: 'skipped',
                    message: 'มีอยู่แล้ว'
                });
            } else {
                await executeQuery(
                    `INSERT INTO custom_fields 
                     (entity_type, field_name, field_label, field_type, field_options, is_required, display_order, show_in_table, show_in_form, is_active)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        fieldDef.entity_type,
                        fieldDef.field_name,
                        fieldDef.field_label,
                        fieldDef.field_type,
                        JSON.stringify([]),
                        false,
                        fieldDef.display_order,
                        true,
                        true,
                        true
                    ]
                );
                fieldDefCount++;
                fieldDefResults.push({
                    field_name: fieldDef.field_name,
                    status: 'success',
                    message: 'สร้างสำเร็จ'
                });
            }
        }

        // ขั้นตอนที่ 2: ดึง custom fields สำหรับ license
        const customFields = await fetchAll(
            'SELECT id, field_name FROM custom_fields WHERE entity_type = $1 AND is_active = true',
            ['licenses']
        );

        if (customFields.length === 0) {
            return NextResponse.json({
                success: true,
                message: `สร้าง Custom Field Definitions สำเร็จ ${fieldDefCount} รายการ แต่ไม่พบ fields ที่ active`,
                fieldDefinitions: fieldDefResults
            });
        }

        // ขั้นตอนที่ 3: ดึงใบอนุญาตทั้งหมด
        const licenses = await fetchAll('SELECT id, license_number FROM licenses ORDER BY id');

        if (licenses.length === 0) {
            return NextResponse.json({
                success: true,
                message: `สร้าง Custom Field Definitions สำเร็จ ${fieldDefCount} รายการ แต่ไม่พบใบอนุญาต`,
                fieldDefinitions: fieldDefResults
            });
        }

        // ขั้นตอนที่ 4: เพิ่มค่า custom fields สำหรับแต่ละใบอนุญาต
        for (let licIdx = 0; licIdx < licenses.length; licIdx++) {
            const license = licenses[licIdx];
            const randomIdx = licIdx % 10;

            for (const field of customFields) {
                // หาค่าจำลองตาม field_name
                let fieldValue = '';
                if (mockCustomFieldValues[field.field_name]) {
                    fieldValue = mockCustomFieldValues[field.field_name][randomIdx];
                } else {
                    fieldValue = `ข้อมูลจำลอง ${randomIdx + 1}`;
                }

                try {
                    await executeQuery(`
                        INSERT INTO custom_field_values(custom_field_id, entity_id, field_value)
                        VALUES($1, $2, $3)
                        ON CONFLICT(custom_field_id, entity_id) 
                        DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()
                    `, [field.id, license.id, fieldValue]);

                    valueCount++;
                } catch (err) {
                    console.error('Error inserting custom field value:', err.message);
                    valueResults.push({
                        license_number: license.license_number,
                        field_name: field.field_name,
                        field_id: field.id,
                        license_id: license.id,
                        status: 'error',
                        message: err.message
                    });
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `เพิ่มข้อมูลจำลองสำเร็จ - Field Definitions: ${fieldDefCount} รายการ, Field Values: ${valueCount} รายการ (${licenses.length} ใบอนุญาต x ${customFields.length} fields)`,
            fieldDefinitionsAdded: fieldDefCount,
            valuesAdded: valueCount,
            totalLicenses: licenses.length,
            totalFields: customFields.length,
            fieldDefinitions: fieldDefResults,
            errors: valueResults.length > 0 ? valueResults : undefined
        });

    } catch (err) {
        console.error('Seed custom fields error:', err);
        return NextResponse.json({
            success: false,
            message: process.env.NODE_ENV === 'production' ? 'Seed operation failed' : err.message
        }, { status: 500 });
    }
}

export async function GET() {
    // Security: Require admin authentication  
    const authError = await requireAdmin();
    if (authError) return authError;

    // Security: Block in production unless explicitly allowed
    const prodBlock = isProductionBlocked();
    if (prodBlock) return prodBlock;

    try {
        // ดึง custom fields สำหรับ license
        const customFields = await fetchAll(
            'SELECT id, field_name, field_label, field_type FROM custom_fields WHERE entity_type = $1 AND is_active = true',
            ['licenses']
        );

        // ดึงจำนวนใบอนุญาต
        const licenseCount = await fetchOne('SELECT COUNT(*) as count FROM licenses');

        return NextResponse.json({
            success: true,
            message: 'ข้อมูล Custom Fields สำหรับใบอนุญาต - ส่ง POST request เพื่อเพิ่มข้อมูลจำลอง',
            customFields,
            licenseCount: parseInt(licenseCount?.count || 0),
            sampleValues: mockCustomFieldValues
        });
    } catch (err) {
        return NextResponse.json({
            success: false,
            message: process.env.NODE_ENV === 'production' ? 'Seed operation failed' : err.message
        }, { status: 500 });
    }
}
