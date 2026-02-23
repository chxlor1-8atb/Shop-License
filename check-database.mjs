import { fetchAll, fetchOne, executeQuery } from './src/lib/db.js';

async function checkDatabase() {
  try {
    console.log('=== ตรวจสอบข้อมูลใน Database ===\n');
    
    // ตรวจสอบจำนวนข้อมูลในแต่ละตาราง
    const tables = ['users', 'shops', 'license_types', 'licenses'];
    
    for (const table of tables) {
      const result = await fetchOne(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`${table}: ${result.count} รายการ`);
    }
    
    console.log('\n=== ตรวจสอบ Custom Fields ===\n');
    
    // ตรวจสอบ custom fields
    const customFields = await fetchAll('SELECT * FROM custom_fields ORDER BY entity_type, display_order');
    console.log('Custom Fields:', customFields.length, 'รายการ');
    
    if (customFields.length > 0) {
      customFields.forEach(field => {
        console.log(`- ${field.entity_type}: ${field.field_label} (${field.field_name}) - ${field.field_type}`);
      });
    }
    
    console.log('\n=== ตรวจสอบตัวอย่างข้อมูลร้านค้า ===\n');
    
    // ตรวจสอบข้อมูลร้านค้าพร้อมจำนวนใบอนุญาต
    const shops = await fetchAll(`
      SELECT s.id, s.shop_name, s.owner_name, s.phone, s.email,
             (SELECT COUNT(*) FROM licenses l WHERE l.shop_id = s.id) as license_count
      FROM shops s 
      ORDER BY s.id DESC 
      LIMIT 5
    `);
    
    shops.forEach(shop => {
      console.log(`ร้าน ${shop.id}: ${shop.shop_name} - มีใบอนุญาต ${shop.license_count} ใบ`);
    });
    
    console.log('\n=== ตรวจสอบตัวอย่างข้อมูลใบอนุญาต ===\n');
    
    // ตรวจสอบข้อมูลใบอนุญาต
    const licenses = await fetchAll(`
      SELECT l.id, l.license_number, l.status, l.issue_date, l.expiry_date,
             s.shop_name, lt.name as type_name
      FROM licenses l
      LEFT JOIN shops s ON l.shop_id = s.id
      LEFT JOIN license_types lt ON l.license_type_id = lt.id
      ORDER BY l.id DESC
      LIMIT 5
    `);
    
    licenses.forEach(license => {
      console.log(`ใบอนุญาต ${license.id}: ${license.license_number} - ${license.shop_name} - ${license.type_name} - ${license.status}`);
    });
    
    console.log('\n=== ตรวจสอบ Custom Field Values ===\n');
    
    // ตรวจสอบ custom field values
    const customValues = await fetchAll(`
      SELECT cf.entity_type, cf.field_label, cfv.field_value, cfv.entity_id
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      LIMIT 10
    `);
    
    console.log('Custom Field Values:', customValues.length, 'รายการ');
    
    customValues.forEach(value => {
      console.log(`- ${value.entity_type} ID ${value.entity_id}: ${value.field_label} = ${value.field_value}`);
    });
    
    console.log('\n=== ตรวจสอบ License Types ===\n');
    
    // ตรวจสอบประเภทใบอนุญาตพร้อมจำนวนใบอนุญาต
    const licenseTypes = await fetchAll(`
      SELECT lt.id, lt.name, lt.description, lt.validity_days,
             (SELECT COUNT(*) FROM licenses l WHERE l.license_type_id = lt.id) as license_count
      FROM license_types lt
      ORDER BY lt.id
    `);
    
    licenseTypes.forEach(type => {
      console.log(`ประเภท ${type.id}: ${type.name} - มีใบอนุญาต ${type.license_count} ใบ - อายุ ${type.validity_days} วัน`);
    });
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

checkDatabase();
