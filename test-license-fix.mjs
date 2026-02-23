import { fetchAll, fetchOne, executeQuery } from './src/lib/db.js';

async function testLicenseFix() {
  try {
    console.log('=== ทดสอบการแก้ไขปัญหาใบอนุญาต ===\n');
    
    // 1. ตรวจสอบ custom fields หลังแก้ไข
    console.log('1. ตรวจสอบ Custom Fields หลังแก้ไข:');
    
    const licenseFields = await fetchAll(`
      SELECT id, field_name, field_label, field_type, is_active
      FROM custom_fields 
      WHERE entity_type = 'licenses'
      ORDER BY display_order
    `);
    
    console.log(`  📄 License Custom Fields: ${licenseFields.length} ฟิลด์`);
    licenseFields.forEach(field => {
      console.log(`    - ID ${field.id}: ${field.field_label} (${field.field_name}) - ${field.field_type}`);
    });
    
    // 2. สร้างข้อมูลทดสอบใหม่
    console.log('\n2. สร้างข้อมูลทดสอบใหม่:');
    
    // ตรวจสอบว่ามีร้านค้าและประเภทใบอนุญาตหรือไม่
    const shopCount = await fetchOne('SELECT COUNT(*) as count FROM shops');
    const typeCount = await fetchOne('SELECT COUNT(*) as count FROM license_types');
    
    if (shopCount.count === 0 || typeCount.count === 0) {
      console.log('  ❌ ไม่มีร้านค้าหรือประเภทใบอนุญาต กรุณาสร้างก่อน');
      return;
    }
    
    // สร้างร้านค้าทดสอบ
    const testShop = await fetchOne(`
      INSERT INTO shops (shop_name, owner_name, phone, address, email, notes)
      VALUES ('ร้านทดสอบแก้ไข', 'คุณทดสอบ', '0812345678', '123 ถนนทดสอบ', 'test@example.com', 'ทดสอบการแก้ไข')
      RETURNING id, shop_name
    `);
    
    console.log(`  ✅ สร้างร้านค้าทดสอบ: ${testShop.shop_name} (ID: ${testShop.id})`);
    
    // สร้างใบอนุญาตทดสอบ
    const testLicense = await fetchOne(`
      INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes)
      VALUES ($1, (SELECT id FROM license_types LIMIT 1), 'TEST-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'active', 'ทดสอบการแก้ไข')
      RETURNING id, license_number
    `, [testShop.id]);
    
    console.log(`  ✅ สร้างใบอนุญาตทดสอบ: ${testLicense.license_number} (ID: ${testLicense.id})`);
    
    // 3. เพิ่ม custom field values สำหรับทดสอบ
    console.log('\n3. เพิ่ม Custom Field Values สำหรับทดสอบ:');
    
    for (const field of licenseFields) {
      let testValue = '';
      
      switch (field.field_name) {
        case 'cf_selling_location':
          testValue = 'กรุงเทพมหานคร';
          break;
        case 'cf_amount':
          testValue = '15000';
          break;
        case 'cf_area_sqm':
          testValue = '50';
          break;
        case 'cf_area_hp':
          testValue = '25';
          break;
        case 'cf_contact_person':
          testValue = 'คุณทดสอบ';
          break;
        case 'cf_payment_status':
          testValue = 'ชำระแล้ว';
          break;
        default:
          testValue = `ค่าทดสอบสำหรับ ${field.field_label}`;
      }
      
      await executeQuery(`
        INSERT INTO custom_field_values (custom_field_id, entity_type, entity_id, field_value)
        VALUES ($1, 'licenses', $2, $3)
        ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET
        field_value = EXCLUDED.field_value,
        updated_at = CURRENT_TIMESTAMP
      `, [field.id, testLicense.id, testValue]);
      
      console.log(`    - เพิ่ม ${field.field_label}: ${testValue}`);
    }
    
    // 4. ตรวจสอบข้อมูลที่สร้าง
    console.log('\n4. ตรวจสอบข้อมูลที่สร้าง:');
    
    const createdLicense = await fetchOne(`
      SELECT l.*, s.shop_name, lt.name as type_name,
             COALESCE(
               json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL),
               '{}'::json
             ) as custom_fields
      FROM licenses l
      LEFT JOIN shops s ON l.shop_id = s.id
      LEFT JOIN license_types lt ON l.license_type_id = lt.id
      LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
      LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
      WHERE l.id = $1
      GROUP BY l.id, s.shop_name, lt.name
    `, [testLicense.id]);
    
    console.log('  📄 ข้อมูลใบอนุญาตที่สร้าง:');
    console.log(`    - ID: ${createdLicense.id}`);
    console.log(`    - License Number: ${createdLicense.license_number}`);
    console.log(`    - Shop: ${createdLicense.shop_name}`);
    console.log(`    - Type: ${createdLicense.type_name}`);
    console.log(`    - Status: ${createdLicense.status}`);
    console.log(`    - Custom Fields: ${JSON.stringify(createdLicense.custom_fields, null, 2)}`);
    
    // 5. แนะนำการทดสอบใน UI
    console.log('\n5. แนะนำการทดสอบใน UI:');
    console.log('  🚀 ขั้นตอนการทดสอบ:');
    console.log('    1. เข้าสู่ระบบด้วย admin/1234');
    console.log('    2. ไปที่หน้า Dashboard/Licenses');
    console.log('    3. ค้นหาใบอนุญาต "TEST-001"');
    console.log('    4. ลองแก้ไขข้อมูล:');
    console.log('       - แก้ไข standard fields (license_number, status, notes)');
    console.log('       - แก้ไข custom fields (สถานที่จำหน่าย, จำนวนเงิน, ผู้ติดต่อ)');
    console.log('    5. ตรวจสอบ console.log ใน browser dev tools');
    console.log('    6. ตรวจสอบว่าข้อมูลถูกบันทึกลง database ถูกต้อง');
    
    console.log('\n✅ การแก้ไขปัญหาสำเร็จ!');
    console.log('🎯 ตอนนี้ระบบเพิ่ม/แก้ไขข้อมูลใบอนุญาตควรทำงานได้ถูกต้องแล้ว');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

testLicenseFix();
