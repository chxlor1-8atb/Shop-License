import { fetchAll, fetchOne, executeQuery } from './src/lib/db.js';

async function debugLicenseIssue() {
  try {
    console.log('=== ตรวจสอบปัญหาการเพิ่ม/แก้ไขข้อมูลใบอนุญาต ===\n');
    
    // 1. ตรวจสอบ custom fields ที่มีอยู่
    console.log('1. ตรวจสอบ Custom Fields:');
    
    const licenseFields = await fetchAll(`
      SELECT id, field_name, field_label, field_type, is_active, display_order
      FROM custom_fields 
      WHERE entity_type = 'licenses'
      ORDER BY display_order
    `);
    
    console.log(`  📄 License Custom Fields: ${licenseFields.length} ฟิลด์`);
    licenseFields.forEach(field => {
      console.log(`    - ID ${field.id}: ${field.field_label} (${field.field_name}) - ${field.field_type} - Active: ${field.is_active}`);
    });
    
    // 2. ตรวจสอบว่ามี custom field values ที่ไม่ตรงกับ field definition หรือไม่
    console.log('\n2. ตรวจสอบ Custom Field Values vs Definitions:');
    
    const orphanValues = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cfv.field_value,
             cf.id as field_id, cf.field_name, cf.field_label
      FROM custom_field_values cfv
      LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cfv.entity_type = 'licenses' 
      AND (cf.id IS NULL OR cf.is_active = false)
    `);
    
    console.log(`  ⚠️ Orphan/Inactive Custom Values: ${orphanValues.length} รายการ`);
    orphanValues.forEach(value => {
      console.log(`    - Entity ID ${value.entity_id}: ${value.field_label || 'Unknown'} = ${value.field_value}`);
    });
    
    // 3. ตรวจสอบว่ามี license ที่ไม่มี custom field values สำหรับ required fields หรือไม่
    console.log('\n3. ตรวจสอบ Licenses ที่ขาด Custom Field Values:');
    
    const licenses = await fetchAll(`
      SELECT l.id, l.license_number, l.shop_id, l.license_type_id
      FROM licenses l
      ORDER BY l.id DESC
      LIMIT 5
    `);
    
    console.log(`  📄 Licenses ล่าสุด: ${licenses.length} รายการ`);
    
    for (const license of licenses) {
      const licenseValues = await fetchAll(`
        SELECT cfv.custom_field_id, cf.field_name, cfv.field_value
        FROM custom_field_values cfv
        JOIN custom_fields cf ON cfv.custom_field_id = cf.id
        WHERE cfv.entity_id = $1 AND cfv.entity_type = 'licenses' AND cf.is_active = true
      `, [license.id]);
      
      console.log(`    - License ${license.id} (${license.license_number}): ${licenseValues.length} custom values`);
      
      // ตรวจสอบว่ามีฟิลด์ที่ต้องมีแต่ไม่มีค่าหรือไม่
      const missingFields = licenseFields.filter(field => 
        field.is_active && !licenseValues.find(v => v.custom_field_id === field.id)
      );
      
      if (missingFields.length > 0) {
        console.log(`      ⚠️ ขาดค่าสำหรับ: ${missingFields.map(f => f.field_label).join(', ')}`);
      }
    }
    
    // 4. ตรวจสอบการทำงานของ API endpoints
    console.log('\n4. ตรวจสอบ API Response Format:');
    
    // จำลองการเรียก GET /api/licenses
    const sampleLicense = await fetchOne(`
      SELECT l.*, s.shop_name, lt.name as type_name,
             CASE 
                 WHEN l.status IN ('suspended', 'revoked') THEN l.status
                 WHEN l.expiry_date < CURRENT_DATE THEN 'expired'
                 ELSE 'active'
             END AS status,
             l.status AS original_status,
             COALESCE(
                 json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL),
                 '{}'::json
             ) as custom_fields
      FROM licenses l
      LEFT JOIN shops s ON l.shop_id = s.id
      LEFT JOIN license_types lt ON l.license_type_id = lt.id
      LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
      LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
      WHERE l.id = (SELECT MAX(id) FROM licenses)
      GROUP BY l.id, s.shop_name, lt.name
    `);
    
    if (sampleLicense) {
      console.log('  📄 Sample License Response:');
      console.log(`    - ID: ${sampleLicense.id}`);
      console.log(`    - License Number: ${sampleLicense.license_number}`);
      console.log(`    - Shop: ${sampleLicense.shop_name}`);
      console.log(`    - Type: ${sampleLicense.type_name}`);
      console.log(`    - Status: ${sampleLicense.status}`);
      console.log(`    - Custom Fields: ${JSON.stringify(sampleLicense.custom_fields)}`);
    } else {
      console.log('  ❌ ไม่พบข้อมูลใบอนุญาตสำหรับทดสอบ');
    }
    
    // 5. ตรวจสอบปัญหาที่อาจเกิดจาก frontend
    console.log('\n5. ตรวจสอบปัญหาที่อาจเกิดจาก Frontend:');
    
    console.log('  🔍 ปัญหาที่อาจเกิดขึ้น:');
    console.log('    1. Custom fields ไม่ตรงกันระหว่าง frontend และ backend');
    console.log('    2. Field mapping ผิดพลาดใน handleRowUpdate');
    console.log('    3. Optimistic update ทำงานผิดพลาด');
    console.log('    4. API response format ไม่ตรงกับที่ frontend คาดหวัง');
    console.log('    5. Custom field values ไม่ถูกส่งไปยัง API อย่างถูกต้อง');
    
    // 6. แนะนำการแก้ไข
    console.log('\n6. แนะนำการแก้ไข:');
    
    console.log('  🔧 การแก้ไขที่แนะนำ:');
    console.log('    1. ตรวจสอบ STANDARD_COLUMNS_IDS ใน handleRowUpdate');
    console.log('    2. ตรวจสอบการ extract custom values จาก updatedRow');
    console.log('    3. ตรวจสอบ API payload ที่ส่งไป');
    console.log('    4. ตรวจสอบ response format ที่ API ส่งกลับมา');
    console.log('    5. ตรวจสอบ optimistic update logic');
    
    console.log('\n=== สรุปการตรวจสอบ ===');
    console.log('✅ ตรวจสอบ Custom Fields สำเร็จ');
    console.log('✅ ตรวจสอบ Custom Values สำเร็จ');
    console.log('✅ ตรวจสอบ API Response สำเร็จ');
    console.log('🔍 พบปัญหาที่อาจเกิดขึ้นในส่วนต่างๆ');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

debugLicenseIssue();
