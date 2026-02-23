// ตรวจสอบลำดับคอลัมน์ custom fields
import { config } from 'dotenv';
import { fetchAll } from './src/lib/db.js';

// โหลด environment variables
config({ path: '.env.local' });

async function checkColumnOrder() {
  try {
    console.log('🔍 Checking custom fields order...\n');
    
    const fields = await fetchAll(`
      SELECT field_name, field_label, field_type, display_order, is_active
      FROM custom_fields 
      WHERE entity_type = 'licenses' 
      ORDER BY display_order ASC, field_name ASC
    `);
    
    console.log('📊 Custom Fields Order:');
    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.field_name} (${field.field_label}) - Order: ${field.display_order}`);
    });
    
    // หาสถานที่จำหน่าย
    const locationField = fields.find(f => f.field_name === 'cf_selling_location');
    console.log('\n📍 Location Field Info:');
    if (locationField) {
      console.log(`- Name: ${locationField.field_name}`);
      console.log(`- Label: ${locationField.field_label}`);
      console.log(`- Current Order: ${locationField.display_order}`);
      console.log(`- Type: ${locationField.field_type}`);
      console.log(`- Active: ${locationField.is_active}`);
    } else {
      console.log('❌ Location field not found!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkColumnOrder();
