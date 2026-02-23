// แก้ไข field_name และ display_order ของสถานที่จำหน่าย
import { config } from 'dotenv';
import { fetchAll, executeQuery } from './src/lib/db.js';

// โหลด environment variables
config({ path: '.env.local' });

async function fixLocationField() {
  try {
    console.log('🔧 Fixing location field...\n');
    
    // ตรวจสอบ field ปัจจุบัน
    const currentField = await fetchAll(`
      SELECT id, field_name, field_label, field_type, display_order, is_active
      FROM custom_fields 
      WHERE entity_type = 'licenses' 
      AND field_label = 'สถานที่จำหน่าย'
    `);
    
    console.log('📍 Current Location Field:');
    if (currentField.length > 0) {
      const field = currentField[0];
      console.log(`- ID: ${field.id}`);
      console.log(`- Name: ${field.field_name}`);
      console.log(`- Label: ${field.field_label}`);
      console.log(`- Current Order: ${field.display_order}`);
      console.log(`- Type: ${field.field_type}`);
      console.log(`- Active: ${field.is_active}`);
      
      // อัปเดต field_name และ display_order
      await executeQuery(`
        UPDATE custom_fields 
        SET field_name = 'cf_selling_location', display_order = 2
        WHERE id = $1
      `, [field.id]);
      
      console.log('\n✅ Updated field_name to "cf_selling_location" and display_order to 2');
      
    } else {
      console.log('❌ Location field not found!');
    }
    
    // ตรวจสอบลำดับใหม่
    const updatedFields = await fetchAll(`
      SELECT field_name, field_label, field_type, display_order, is_active
      FROM custom_fields 
      WHERE entity_type = 'licenses' 
      ORDER BY display_order ASC, field_name ASC
    `);
    
    console.log('\n📊 Updated Custom Fields Order:');
    updatedFields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.field_name} (${field.field_label}) - Order: ${field.display_order}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixLocationField();
