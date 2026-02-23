import { fetchAll, fetchOne, executeQuery } from './src/lib/db.js';

async function checkLicenses() {
  try {
    console.log('=== ตรวจสอบข้อมูลใบอนุญาตทั้งหมด ===\n');
    
    // ตรวจสอบข้อมูลใบอนุญาตทั้งหมด
    const licenses = await fetchAll(`
      SELECT l.id, l.license_number, l.status, l.issue_date, l.expiry_date, l.shop_id, l.license_type_id,
             s.shop_name, lt.name as type_name
      FROM licenses l
      LEFT JOIN shops s ON l.shop_id = s.id
      LEFT JOIN license_types lt ON l.license_type_id = lt.id
      ORDER BY l.id DESC
    `);
    
    console.log(`ใบอนุญาตทั้งหมด: ${licenses.length} รายการ`);
    
    if (licenses.length > 0) {
      licenses.forEach(license => {
        console.log(`ID ${license.id}: ${license.license_number || '(ไม่ระบุ)'} - ร้าน: ${license.shop_name || '(ไม่ระบุ)'} - ประเภท: ${license.type_name || '(ไม่ระบุ)'} - สถานะ: ${license.status}`);
      });
    } else {
      console.log('❌ ไม่พบข้อมูลใบอนุญาตในระบบ');
    }
    
    console.log('\n=== ตรวจสอบข้อมูลที่อาจถูกลบแล้วแต่ยังมี custom field values ===\n');
    
    // ตรวจสอบ custom field values ที่ไม่มี license ที่เกี่ยวข้อง
    const orphanValues = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cf.field_label, cfv.field_value
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cf.entity_type = 'licenses' 
      AND cfv.entity_id NOT IN (SELECT id FROM licenses)
    `);
    
    console.log(`Custom field values ที่ไม่มี license ที่เกี่ยวข้อง: ${orphanValues.length} รายการ`);
    
    orphanValues.forEach(value => {
      console.log(`- License ID ${value.entity_id} (ถูกลบแล้ว): ${value.field_label} = ${value.field_value}`);
    });
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

checkLicenses();
