
import { executeQuery, fetchOne, fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Mock data pools
const MOCK_DATA = {
    locations: [
        'ตลาดนัดจตุจักร', 'ห้างสรรพสินค้าเซ็นทรัล', 'ตลาดสดเทศบาล', 'ศูนย์การค้าฟิวเจอร์พาร์ค',
        'ตลาดนัดรถไฟรัชดา', 'ห้างโรบินสัน', 'ตลาดโต้รุ่ง', 'ศูนย์อาหาร MBK',
        'ตลาดนัดหลังมอ', 'ห้างเดอะมอลล์', 'สยามพารากอน', 'ไอคอนสยาม'
    ],
    amounts: [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
    areas: ['10', '15', '20', '25', '30', '35', '40', '50', '60', '100', '120', '200'],
    horsepowers: ['5', '10', '15', '20', '25', '50', '75', '100', '150', '200'],
    contacts: ['คุณสมชาย', 'คุณสมหญิง', 'คุณวิชัย', 'คุณมานี', 'คุณชูใจ', 'คุณปิติ', 'คุณเรณู', 'คุณปัญญา'],
    paymentStatuses: ['paid', 'pending', 'overdue'],
    paymentStatusesLabels: ['ชำระแล้ว', 'รอชำระ', 'ค้างชำระ']
};

export async function GET() {
    try {
        // 1. Get existing data and metadata
        const shops = await fetchAll('SELECT id, shop_name FROM shops');
        const licenseTypes = await fetchAll('SELECT id, name, validity_days FROM license_types');

        // Fetch ALL custom fields for licenses to ensure we populate whatever columns exist
        const customFields = await fetchAll("SELECT id, field_name, field_label, field_type FROM custom_fields WHERE entity_type = 'licenses' AND is_active = true");

        if (!shops.length || !licenseTypes.length) {
            return NextResponse.json({
                success: false,
                message: 'ไม่พบข้อมูลร้านค้าหรือประเภทใบอนุญาต กรุณารัน Seed Shops ก่อน'
            }, { status: 400 });
        }

        const generatedLicenses = [];
        let successCount = 0;
        let customFieldsFilledCount = 0;

        // 0. Cleanup old seed data (optional, but good for testing)
        await executeQuery("DELETE FROM licenses WHERE license_number LIKE 'LIC-EXTRA%'");

        // 2. Generate 10 Licenses
        for (let i = 0; i < 10; i++) {
            // Randomly select Shop and Type
            const shop = shops[Math.floor(Math.random() * shops.length)];
            const type = licenseTypes[Math.floor(Math.random() * licenseTypes.length)];

            // Generate License Number
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            const licenseNumber = `LIC-EXTRA-${timestamp}-${random}`;

            // Dates
            const issueDate = new Date();
            issueDate.setDate(issueDate.getDate() - Math.floor(Math.random() * 60)); // Random last 60 days
            const issueDateStr = issueDate.toISOString().split('T')[0];

            const expiryDate = new Date(issueDate);
            expiryDate.setDate(expiryDate.getDate() + (type.validity_days || 365));
            const expiryDateStr = expiryDate.toISOString().split('T')[0];

            try {
                // 2.1 Insert License
                const result = await executeQuery(
                    `INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                    [
                        shop.id,
                        type.id,
                        licenseNumber,
                        issueDateStr,
                        expiryDateStr,
                        'active',
                        `ใบอนุญาตเพิ่มเติม ${i + 1} (มีข้อมูลครบ)`
                    ]
                );

                if (result && result.length > 0) {
                    const licenseId = result[0].id;
                    successCount++;

                    // 2.2 Insert Custom Field Values
                    if (customFields.length > 0) {
                        for (const field of customFields) {
                            let value = '';
                            const label = field.field_label || '';
                            const name = field.field_name || '';

                            // Match logic for mock data
                            if (label.includes('สถานที่') || name.includes('location')) {
                                value = MOCK_DATA.locations[Math.floor(Math.random() * MOCK_DATA.locations.length)];
                            } else if (label.includes('จำนวนเงิน') || name.includes('amount') || name.includes('price')) {
                                value = MOCK_DATA.amounts[Math.floor(Math.random() * MOCK_DATA.amounts.length)].toString();
                            } else if (label.includes('ตารางเมตร') || name.includes('sqm') || name.includes('area')) {
                                value = MOCK_DATA.areas[Math.floor(Math.random() * MOCK_DATA.areas.length)];
                            } else if (label.includes('แรงม้า') || name.includes('hp') || name.includes('horsepower')) {
                                value = MOCK_DATA.horsepowers[Math.floor(Math.random() * MOCK_DATA.horsepowers.length)];
                            } else if (label.includes('ผู้ติดต่อ') || name.includes('contact')) {
                                value = MOCK_DATA.contacts[Math.floor(Math.random() * MOCK_DATA.contacts.length)];
                            } else if (label.includes('สถานะการชำระ') || name.includes('payment')) {
                                value = MOCK_DATA.paymentStatusesLabels[Math.floor(Math.random() * MOCK_DATA.paymentStatusesLabels.length)];
                            } else if (label.includes('วันที่ต่ออายุ') || name.includes('renew')) {
                                const renewDate = new Date(expiryDate);
                                renewDate.setDate(renewDate.getDate() - 30);
                                value = renewDate.toISOString().split('T')[0];
                            } else {
                                // Default fallback
                                value = `ข้อมูล ${label} ${Math.floor(Math.random() * 100)}`;
                            }

                            if (value) {
                                // Added entity_type column to fix not-null constraint
                                await executeQuery(
                                    `INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value)
                                     VALUES ($1, $2, 'licenses', $3)
                                     ON CONFLICT (custom_field_id, entity_id) 
                                     DO UPDATE SET field_value = EXCLUDED.field_value`,
                                    [field.id, licenseId, value]
                                );
                                customFieldsFilledCount++;
                            }
                        }
                    }

                    generatedLicenses.push({
                        id: licenseId,
                        license_number: licenseNumber,
                        shop: shop.shop_name
                    });
                }
            } catch (err) {
                console.error(`Failed to insert license ${i}:`, err);
            }
        }

        return NextResponse.json({
            success: true,
            message: `เพิ่มใบอนุญาตสำเร็จ ${successCount} รายการ พร้อมข้อมูลเพิ่มเติม ${customFieldsFilledCount} จุด`,
            data: generatedLicenses
        });

    } catch (err) {
        return NextResponse.json({
            success: false,
            message: err.message
        }, { status: 500 });
    }
}
