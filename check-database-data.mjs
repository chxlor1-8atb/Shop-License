// ตรวจสอบข้อมูลใน database โดยตรง
import { config } from 'dotenv';
import { fetchAll, fetchOne } from './src/lib/db.js';

// โหลด environment variables จาก .env.local
config({ path: '.env.local' });

async function checkDatabaseData() {
  try {
    console.log('🔍 Checking database data...\n');
    console.log('DATABASE_URL loaded:', process.env.DATABASE_URL ? '✅' : '❌');
    
    // ตรวจสอบ licenses ทั้งหมด
    const licenses = await fetchAll(`
      SELECT l.*, s.shop_name, lt.name as type_name,
             json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL) as custom_fields
      FROM licenses l
      LEFT JOIN shops s ON l.shop_id = s.id
      LEFT JOIN license_types lt ON l.license_type_id = lt.id
      LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
      LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
      GROUP BY l.id, s.shop_name, lt.name
      ORDER BY l.id DESC
      LIMIT 5
    `);
    
    console.log('Database licenses found:');
    licenses.forEach((license, index) => {
      console.log(`\n--- License ${index + 1} (ID: ${license.id}) ---`);
      console.log(`License Number: ${license.license_number}`);
      console.log(`Shop: ${license.shop_name}`);
      console.log(`Issue Date: ${license.issue_date}`);
      console.log(`Expiry Date: ${license.expiry_date}`);
      console.log(`Custom Fields:`, license.custom_fields);
      
      if (license.custom_fields) {
        console.log(`- สถานที่จำหน่าย: ${license.custom_fields.cf_selling_location || 'N/A'}`);
        console.log(`- จำนวนเงิน: ${license.custom_fields.cf_amount || 'N/A'}`);
      }
    });
    
    // ตรวจสอบ custom_field_values โดยตรง
    console.log('\n🔍 Checking custom_field_values table...');
    const customValues = await fetchAll(`
      SELECT cfv.*, cf.field_name, cf.field_label
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cfv.entity_type = 'licenses'
      ORDER BY cfv.entity_id, cf.field_name
      LIMIT 10
    `);
    
    console.log('Custom field values found:');
    customValues.forEach(val => {
      console.log(`- Entity ${val.entity_id}: ${val.field_name} = ${val.field_value}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkDatabaseData();
