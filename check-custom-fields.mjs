import { fetchAll } from './src/lib/db.js';

async function checkCustomFields() {
  try {
    console.log('Checking custom fields for licenses...\n');
    
    // Get all custom fields for licenses
    const fields = await fetchAll(
      'SELECT * FROM custom_fields WHERE entity_type = $1 ORDER BY display_order ASC',
      ['licenses']
    );
    
    console.log('Custom fields found:');
    fields.forEach(field => {
      console.log(`- ${field.field_name} (${field.field_label}) - Order: ${field.display_order}`);
    });
    
    // Check if there are any fields with Thai names
    const thaiFields = fields.filter(f => 
      f.field_label.includes('สถาน') || 
      f.field_label.includes('จำนวน') ||
      f.field_label.includes('เงิน')
    );
    
    if (thaiFields.length > 0) {
      console.log('\nFields with Thai names found:');
      thaiFields.forEach(field => {
        console.log(`- ${field.field_name} = ${field.field_label}`);
      });
    } else {
      console.log('\nNo fields with Thai names found');
    }
    
    // Check sample data in custom_field_values
    const values = await fetchAll(
      `SELECT cfv.*, cf.field_label 
       FROM custom_field_values cfv 
       JOIN custom_fields cf ON cfv.custom_field_id = cf.id 
       WHERE cf.entity_type = $1 
       LIMIT 10`,
      ['licenses']
    );
    
    if (values.length > 0) {
      console.log('\nSample custom field values:');
      values.forEach(val => {
        console.log(`- ${val.field_label}: ${val.field_value}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCustomFields();
