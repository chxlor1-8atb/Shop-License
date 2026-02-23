// ทดสอบการแก้ไข custom fields
import { config } from 'dotenv';
import { fetchAll, executeQuery } from './src/lib/db.js';

// โหลด environment variables
config({ path: '.env.local' });

async function testCustomFieldEdit() {
  try {
    console.log('🧪 Testing Custom Field Edit...\n');
    
    // ตรวจสอบ custom fields ทั้งหมด
    const fields = await fetchAll(`
      SELECT id, field_name, field_label, field_type, display_order, is_active
      FROM custom_fields 
      WHERE entity_type = 'licenses' 
      ORDER BY display_order ASC
    `);
    
    console.log('📊 Available Custom Fields:');
    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.field_name} (${field.field_label})`);
      console.log(`   - Type: ${field.field_type}`);
      console.log(`   - Order: ${field.display_order}`);
      console.log(`   - Active: ${field.is_active}`);
      console.log(`   - Editable: ${!field.readOnly || true}`);
      console.log('');
    });
    
    // ตรวจสอบข้อมูลปัจจุบันในตาราง licenses
    const licenses = await fetchAll(`
      SELECT l.id, l.license_number,
             json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL) as custom_fields
      FROM licenses l
      LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
      LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
      GROUP BY l.id, l.license_number
      ORDER BY l.id DESC
      LIMIT 3
    `);
    
    console.log('📋 Sample License Data:');
    licenses.forEach((license, index) => {
      console.log(`${index + 1}. License ${license.id}: ${license.license_number}`);
      console.log(`   - Custom Fields: ${JSON.stringify(license.custom_fields)}`);
      console.log(`   - Has Location: ${license.custom_fields?.cf_selling_location ? 'YES' : 'NO'}`);
      console.log(`   - Location Value: ${license.custom_fields?.cf_selling_location || 'N/A'}`);
      console.log('');
    });
    
    // ทดสอบการอัปเดตข้อมูล
    const testLicense = licenses[0];
    if (testLicense) {
      console.log('🔧 Testing Update Operation:');
      console.log(`- License ID: ${testLicense.id}`);
      console.log(`- Current Location: ${testLicense.custom_fields?.cf_selling_location || 'N/A'}`);
      console.log(`- New Location: TEST_LOCATION_${Date.now()}`);
      
      // สร้างข้อมูลทดสอบ
      const testValue = `TEST_LOCATION_${Date.now()}`;
      
      // อัปเดต custom field value
      await executeQuery(`
        DELETE FROM custom_field_values 
        WHERE entity_id = $1 AND entity_type = 'licenses' AND custom_field_id = (
          SELECT id FROM custom_fields WHERE field_name = 'cf_selling_location'
        )
      `, [testLicense.id]);
      
      await executeQuery(`
        INSERT INTO custom_field_values (entity_id, entity_type, custom_field_id, field_value)
        SELECT $1, 'licenses', id, $2 FROM custom_fields WHERE field_name = 'cf_selling_location'
      `, [testLicense.id, testValue]);
      
      console.log('✅ Test update completed');
      
      // ตรวจสอบผลลัพธ์
      const updatedLicense = await fetchAll(`
        SELECT l.id, l.license_number,
               json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL) as custom_fields
        FROM licenses l
        LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
        LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
        WHERE l.id = $1
        GROUP BY l.id, l.license_number
      `, [testLicense.id]);
      
      if (updatedLicense.length > 0) {
        console.log('🔍 Updated License Data:');
        console.log(`- License ID: ${updatedLicense[0].id}`);
        console.log(`- Custom Fields: ${JSON.stringify(updatedLicense[0].custom_fields)}`);
        console.log(`- New Location: ${updatedLicense[0].custom_fields?.cf_selling_location || 'N/A'}`);
        console.log(`- Update Success: ${updatedLicense[0].custom_fields?.cf_selling_location === testValue ? 'YES' : 'NO'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCustomFieldEdit();
