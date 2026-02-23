import { fetchAll, fetchOne, executeQuery } from '../src/lib/db.js';

async function fixDuplicateCustomFields() {
  try {
    console.log('=== แก้ไข Custom Fields ซ้ำซ้อน ===\n');
    
    // 1. ตรวจสอบ custom fields ที่ซ้ำซ้อนกับ standard fields
    console.log('1. ตรวจสอบ Custom Fields ที่ซ้ำซ้อน:');
    
    const duplicateFields = await fetchAll(`
      SELECT id, field_name, field_label, field_type
      FROM custom_fields 
      WHERE entity_type = 'licenses' 
      AND field_name IN (
        'shop_id', 'license_type_id', 'license_number', 
        'issue_date', 'expiry_date', 'status', 'notes'
      )
      ORDER BY id
    `);
    
    console.log(`  📄 พบ Custom Fields ซ้ำซ้อน: ${duplicateFields.length} ฟิลด์`);
    duplicateFields.forEach(field => {
      console.log(`    - ID ${field.id}: ${field.field_label} (${field.field_name})`);
    });
    
    if (duplicateFields.length === 0) {
      console.log('  ✅ ไม่พบ Custom Fields ซ้ำซ้อน');
      return;
    }
    
    // 2. ลบ custom field values ที่เกี่ยวข้องกับ fields ซ้ำซ้อน
    console.log('\n2. ลบ Custom Field Values ที่ซ้ำซ้อน:');
    
    for (const field of duplicateFields) {
      const deletedValues = await executeQuery(`
        DELETE FROM custom_field_values 
        WHERE custom_field_id = $1
      `, [field.id]);
      
      console.log(`    - ลบ values สำหรับ field ${field.field_label}: ${deletedValues.rowCount} รายการ`);
    }
    
    // 3. ลบ custom fields ที่ซ้ำซ้อน
    console.log('\n3. ลบ Custom Fields ที่ซ้ำซ้อน:');
    
    for (const field of duplicateFields) {
      await executeQuery(`
        DELETE FROM custom_fields 
        WHERE id = $1
      `, [field.id]);
      
      console.log(`    - ลบ field: ${field.field_label} (${field.field_name})`);
    }
    
    // 4. ตรวจสอบผลลัพธ์
    console.log('\n4. ตรวจสอบผลลัพธ์:');
    
    const remainingFields = await fetchAll(`
      SELECT id, field_name, field_label, field_type
      FROM custom_fields 
      WHERE entity_type = 'licenses'
      ORDER BY display_order
    `);
    
    console.log(`  📄 Custom Fields ที่เหลือ: ${remainingFields.length} ฟิลด์`);
    remainingFields.forEach(field => {
      console.log(`    - ID ${field.id}: ${field.field_label} (${field.field_name})`);
    });
    
    console.log('\n✅ แก้ไข Custom Fields ซ้ำซ้อนสำเร็จ!');
    console.log('🚀 ตอนนี้ระบบเพิ่ม/แก้ไขข้อมูลจะทำงานได้ถูกต้อง');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

fixDuplicateCustomFields();
