import { executeQuery, fetchOne, fetchAll } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ข้อมูลจำลองสำหรับ Custom Fields (สำหรับใบอนุญาต)
const mockCustomFieldValues = {
    // สถานที่จำหน่าย
    locations: [
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
    amounts: [500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000],
    // พื้นที่ (ตารางเมตร)
    areas: ['10', '15', '20', '25', '30', '35', '40', '50', '60', '100'],
    // พื้นที่ (แรงม้า)
    horsepowers: ['5', '10', '15', '20', '25', '50', '75', '100', '150', '200']
};


// ข้อมูลจำลองประเภทใบอนุญาต 4 ประเภท
const mockLicenseTypes = [
    {
        name: 'ใบอนุญาตขายสุรา',
        description: 'ใบอนุญาตสำหรับร้านค้าที่จำหน่ายสุราและเครื่องดื่มแอลกอฮอล์',
        validity_days: 365
    },
    {
        name: 'ใบอนุญาตขายยาสูบ',
        description: 'ใบอนุญาตสำหรับร้านค้าที่จำหน่ายบุหรี่และผลิตภัณฑ์ยาสูบ',
        validity_days: 365
    },
    {
        name: 'ใบอนุญาตประกอบกิจการอาหาร',
        description: 'ใบอนุญาตสำหรับร้านอาหาร ภัตตาคาร และสถานที่จำหน่ายอาหาร',
        validity_days: 730
    },
    {
        name: 'ใบอนุญาตค้าของเก่า',
        description: 'ใบอนุญาตสำหรับร้านค้าที่รับซื้อและจำหน่ายของเก่า ของมือสอง',
        validity_days: 365
    }
];

// ข้อมูลจำลองร้านค้า 10 รายการ
const mockShops = [
    {
        shop_name: 'ร้านสะดวกซื้อเซเว่น สาขาอนุสาวรีย์',
        owner_name: 'นายสมชาย ใจดี',
        address: '123/45 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กทม. 10400',
        phone: '02-123-4567',
        email: 'somchai@example.com',
        notes: 'เปิด 24 ชม.'
    },
    {
        shop_name: 'ร้านอาหารครัวคุณแม่',
        owner_name: 'นางสาวสมหญิง รักการทำอาหาร',
        address: '789 ซ.อารีย์ ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กทม. 10400',
        phone: '02-234-5678',
        email: 'somying@example.com',
        notes: 'ร้านอาหารไทยโบราณ'
    },
    {
        shop_name: 'ร้านกาแฟ Coffee House',
        owner_name: 'นายวิชัย รักกาแฟ',
        address: '456 ถ.สุขุมวิท แขวงคลองตัน เขตวัฒนา กทม. 10110',
        phone: '02-345-6789',
        email: 'wichai@example.com',
        notes: 'เปิด 07:00-22:00'
    },
    {
        shop_name: 'ร้านเสริมสวยบิวตี้ พลัส',
        owner_name: 'นางสาวสวยงาม พาเจริญ',
        address: '321 ถ.รัชดาภิเษก แขวงดินแดง เขตดินแดง กทม. 10400',
        phone: '02-456-7890',
        email: 'suayngam@example.com',
        notes: 'บริการครบวงจร'
    },
    {
        shop_name: 'ร้านซ่อมรถยนต์สมบูรณ์',
        owner_name: 'นายช่างประยุทธ์ ช่างเก่ง',
        address: '999 ถ.วิภาวดี แขวงจตุจักร เขตจตุจักร กทม. 10900',
        phone: '02-567-8901',
        email: 'prayuth@example.com',
        notes: 'ซ่อมรถทุกชนิด'
    },
    {
        shop_name: 'ร้านขายยา เภสัชกรณ์',
        owner_name: 'เภสัชกรมานี มีสุข',
        address: '111 ถ.สีลม แขวงสุริยวงศ์ เขตบางรัก กทม. 10500',
        phone: '02-678-9012',
        email: 'manee@example.com',
        notes: 'มีเภสัชกรประจำ 24 ชม.'
    },
    {
        shop_name: 'ร้านเพ็ทช้อป รักน้องหมา',
        owner_name: 'นายรักสัตว์ มากมี',
        address: '222 ถ.ลาดพร้าว แขวงจอมพล เขตจตุจักร กทม. 10900',
        phone: '02-789-0123',
        email: 'raksat@example.com',
        notes: 'จำหน่ายอาหารและอุปกรณ์สัตว์เลี้ยง'
    },
    {
        shop_name: 'ร้านทองเยาวราช โกลเด้น',
        owner_name: 'นายทองคำ มั่งมี',
        address: '888 ถ.เยาวราช แขวงสัมพันธวงศ์ เขตสัมพันธวงศ์ กทม. 10100',
        phone: '02-890-1234',
        email: 'thongkham@example.com',
        notes: 'รับซื้อ-ขาย ทองรูปพรรณ'
    },
    {
        shop_name: 'ร้านมินิมาร์ท โลตัส',
        owner_name: 'นางมาลี สุขสบาย',
        address: '555 ถ.รามคำแหง แขวงหัวหมาก เขตบางกะปิ กทม. 10240',
        phone: '02-901-2345',
        email: 'malee@example.com',
        notes: 'สินค้าครบครัน ราคาประหยัด'
    },
    {
        shop_name: 'ร้านอิเล็กทรอนิกส์ ไอทีพลัส',
        owner_name: 'นายเทคโนโลยี ก้าวหน้า',
        address: '777 ถ.เพชรบุรี แขวงพญาไท เขตราชเทวี กทม. 10400',
        phone: '02-012-3456',
        email: 'tech@example.com',
        notes: 'จำหน่ายอุปกรณ์คอมพิวเตอร์และมือถือ'
    }
];

// Helper function เพื่อสร้าง license number
function generateLicenseNumber(shopIndex, licenseIndex) {
    const year = new Date().getFullYear();
    const shopNum = String(shopIndex + 1).padStart(3, '0');
    const licNum = String(licenseIndex + 1).padStart(2, '0');
    return `LIC-${year}-${shopNum}-${licNum}`;
}

// Helper function สำหรับวันที่
function getDateString(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
}

export async function POST(request) {
    try {
        const shopResults = [];
        const typeResults = [];
        const licenseResults = [];
        let shopSuccessCount = 0;
        let typeSuccessCount = 0;
        let licenseSuccessCount = 0;
        let customFieldSuccessCount = 0;

        // เพิ่มประเภทใบอนุญาต
        const insertedTypes = [];
        for (const type of mockLicenseTypes) {
            try {
                let existingType = await fetchOne(
                    'SELECT id FROM license_types WHERE name = $1',
                    [type.name]
                );

                if (existingType) {
                    insertedTypes.push(existingType.id);
                    typeResults.push({
                        name: type.name,
                        status: 'skipped',
                        message: 'ประเภทนี้มีอยู่แล้ว'
                    });
                    continue;
                }

                const result = await executeQuery(
                    `INSERT INTO license_types (name, description, validity_days) 
                     VALUES ($1, $2, $3) RETURNING id`,
                    [type.name, type.description, type.validity_days]
                );

                insertedTypes.push(result[0]?.id);
                typeSuccessCount++;
                typeResults.push({
                    name: type.name,
                    status: 'success',
                    message: 'เพิ่มสำเร็จ'
                });
            } catch (err) {
                typeResults.push({
                    name: type.name,
                    status: 'error',
                    message: err.message
                });
            }
        }

        // เพิ่มร้านค้าและใบอนุญาต
        for (let shopIndex = 0; shopIndex < mockShops.length; shopIndex++) {
            const shop = mockShops[shopIndex];
            try {
                let shopId;
                const existingShop = await fetchOne(
                    'SELECT id FROM shops WHERE shop_name = $1',
                    [shop.shop_name]
                );

                if (existingShop) {
                    shopId = existingShop.id;
                    shopResults.push({
                        shop_name: shop.shop_name,
                        status: 'skipped',
                        message: 'ร้านค้านี้มีอยู่แล้ว'
                    });
                } else {
                    const result = await executeQuery(
                        `INSERT INTO shops (shop_name, owner_name, address, phone, email, notes, custom_fields) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                        [
                            shop.shop_name,
                            shop.owner_name,
                            shop.address,
                            shop.phone,
                            shop.email,
                            shop.notes,
                            JSON.stringify({})
                        ]
                    );
                    shopId = result[0]?.id;
                    shopSuccessCount++;
                    shopResults.push({
                        shop_name: shop.shop_name,
                        status: 'success',
                        message: 'เพิ่มสำเร็จ'
                    });
                }

                // สร้างใบอนุญาต 2 ใบต่อร้าน
                if (shopId && insertedTypes.length >= 2) {
                    for (let licIndex = 0; licIndex < 2; licIndex++) {
                        const licenseNumber = generateLicenseNumber(shopIndex, licIndex);

                        // ตรวจสอบว่ามี license number ซ้ำหรือไม่
                        const existingLicense = await fetchOne(
                            'SELECT id FROM licenses WHERE license_number = $1',
                            [licenseNumber]
                        );

                        if (existingLicense) {
                            licenseResults.push({
                                license_number: licenseNumber,
                                shop_name: shop.shop_name,
                                status: 'skipped',
                                message: 'ใบอนุญาตนี้มีอยู่แล้ว'
                            });
                            continue;
                        }

                        // เลือกประเภทใบอนุญาตสลับกัน
                        const typeId = insertedTypes[licIndex % insertedTypes.length];
                        const typeInfo = mockLicenseTypes[licIndex % mockLicenseTypes.length];

                        // วันที่ออก: สุ่มในช่วง 30 วันก่อนถึงวันนี้
                        const issueOffset = -Math.floor(Math.random() * 30);
                        const issueDate = getDateString(issueOffset);

                        // วันหมดอายุ: วันที่ออก + validity_days
                        const expiryOffset = issueOffset + typeInfo.validity_days;
                        const expiryDate = getDateString(expiryOffset);

                        const licenseResult = await executeQuery(
                            `INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes, custom_fields) 
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                            [
                                shopId,
                                typeId,
                                licenseNumber,
                                issueDate,
                                expiryDate,
                                'active',
                                `ใบอนุญาตจำลองสำหรับ ${shop.shop_name}`,
                                JSON.stringify({})
                            ]
                        );

                        const newLicenseId = licenseResult[0]?.id;

                        // เพิ่ม Custom Field Values สำหรับใบอนุญาตนี้
                        if (newLicenseId) {
                            // ดึง custom fields สำหรับ license
                            const customFields = await fetchAll(
                                'SELECT id, field_name FROM custom_fields WHERE entity_type = $1 AND is_active = true',
                                ['licenses']
                            );

                            // สุ่มค่าสำหรับแต่ละ field
                            const randomIdx = (shopIndex * 2 + licIndex) % 10;

                            for (const field of customFields) {
                                let fieldValue = '';

                                // กำหนดค่าตาม field_name
                                if (field.field_name.includes('สถานที่') || field.field_name.includes('location')) {
                                    fieldValue = mockCustomFieldValues.locations[randomIdx];
                                } else if (field.field_name.includes('จำนวนเงิน') || field.field_name.includes('amount') || field.field_name.includes('money')) {
                                    fieldValue = String(mockCustomFieldValues.amounts[randomIdx]);
                                } else if (field.field_name.includes('ตารางเมตร') || field.field_name.includes('sqm')) {
                                    fieldValue = mockCustomFieldValues.areas[randomIdx];
                                } else if (field.field_name.includes('แรงม้า') || field.field_name.includes('hp') || field.field_name.includes('horsepower')) {
                                    fieldValue = mockCustomFieldValues.horsepowers[randomIdx];
                                } else {
                                    // สำหรับ field อื่นๆ ที่ไม่รู้จัก ให้ใส่ค่าเริ่มต้น
                                    fieldValue = `ข้อมูลจำลอง ${randomIdx + 1}`;
                                }

                                // Insert custom field value
                                try {
                                    await executeQuery(`
                                        INSERT INTO custom_field_values(custom_field_id, entity_id, field_value)
                                        VALUES($1, $2, $3)
                                        ON CONFLICT(custom_field_id, entity_id) 
                                        DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()
                                    `, [field.id, newLicenseId, fieldValue]);

                                    customFieldSuccessCount++;
                                } catch (cfErr) {
                                    console.error('Error inserting custom field value:', cfErr.message);
                                }
                            }
                        }

                        licenseSuccessCount++;
                        licenseResults.push({
                            license_number: licenseNumber,
                            shop_name: shop.shop_name,
                            status: 'success',
                            message: 'เพิ่มสำเร็จ'
                        });
                    }
                }
            } catch (err) {
                shopResults.push({
                    shop_name: shop.shop_name,
                    status: 'error',
                    message: err.message
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `เพิ่มข้อมูลจำลองเรียบร้อย - ร้านค้า: ${shopSuccessCount}/${mockShops.length}, ประเภทใบอนุญาต: ${typeSuccessCount}/${mockLicenseTypes.length}, ใบอนุญาต: ${licenseSuccessCount}/20, Custom Fields: ${customFieldSuccessCount} รายการ`,
            licenseTypes: typeResults,
            shops: shopResults,
            licenses: licenseResults,
            customFieldsAdded: customFieldSuccessCount
        });

    } catch (err) {
        return NextResponse.json({
            success: false,
            message: err.message
        }, { status: 500 });
    }
}

// GET สำหรับดูข้อมูลจำลองที่จะถูกเพิ่ม
export async function GET() {
    return NextResponse.json({
        success: true,
        message: 'ข้อมูลจำลอง: ร้านค้า 10 รายการ, ประเภทใบอนุญาต 4 ประเภท, ใบอนุญาต 20 ใบ (ร้านละ 2 ใบ), และ Custom Fields - ส่ง POST request เพื่อเพิ่มข้อมูล',
        licenseTypes: mockLicenseTypes,
        shops: mockShops,
        licensesPerShop: 2,
        totalLicenses: mockShops.length * 2,
        customFieldSamples: mockCustomFieldValues
    });
}

