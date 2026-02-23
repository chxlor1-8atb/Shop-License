// ตรวจสอบ custom fields สำหรับ licenses
async function checkCustomFields() {
  try {
    const response = await fetch('/api/custom-fields?entity_type=licenses');
    const data = await response.json();
    
    if (data.success && data.fields) {
      console.log('Custom fields for licenses:');
      data.fields.forEach(field => {
        console.log(`- ${field.field_name} (${field.field_label})`);
        console.log(`  Type: ${field.field_type}`);
        console.log(`  Display Order: ${field.display_order}`);
        console.log(`  Is Active: ${field.is_active}`);
        console.log('---');
      });
      
      // ตรวจสอบฟิลด์ที่เราสนใจ
      const locationField = data.fields.find(f => f.field_name === 'cf_selling_location');
      const amountField = data.fields.find(f => f.field_name === 'cf_amount');
      
      console.log('Target fields:');
      console.log('cf_selling_location:', locationField);
      console.log('cf_amount:', amountField);
    } else {
      console.error('Failed to fetch custom fields:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCustomFields();
