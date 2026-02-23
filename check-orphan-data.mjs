import { fetchAll, fetchOne, executeQuery } from './src/lib/db.js';

async function checkOrphanData() {
  try {
    console.log('=== ตรวจสอบข้อมูลตกค้างใน custom_field_values ===\n');
    
    // 1. ตรวจสอบ custom_field_values ทั้งหมด
    const allValues = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cfv.custom_field_id, cfv.field_value,
             cf.entity_type, cf.field_name, cf.field_label
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      ORDER BY cfv.entity_type, cfv.entity_id
    `);
    
    console.log(`Custom field values ทั้งหมด: ${allValues.length} รายการ`);
    
    if (allValues.length > 0) {
      allValues.forEach(value => {
        console.log(`- ${value.entity_type} ID ${value.entity_id}: ${value.field_label} = ${value.field_value}`);
      });
    }
    
    console.log('\n=== ตรวจสอบ Orphan Data ===\n');
    
    // 2. ตรวจสอบ orphan data สำหรับ shops
    const shopOrphans = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cf.field_label, cfv.field_value
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cf.entity_type = 'shops' 
      AND cfv.entity_id NOT IN (SELECT id FROM shops)
    `);
    
    console.log(`Shops orphan values: ${shopOrphans.length} รายการ`);
    shopOrphans.forEach(orphan => {
      console.log(`  - Shop ID ${orphan.entity_id} (ถูกลบแล้ว): ${orphan.field_label} = ${orphan.field_value}`);
    });
    
    // 3. ตรวจสอบ orphan data สำหรับ licenses
    const licenseOrphans = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cf.field_label, cfv.field_value
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cf.entity_type = 'licenses' 
      AND cfv.entity_id NOT IN (SELECT id FROM licenses)
    `);
    
    console.log(`Licenses orphan values: ${licenseOrphans.length} รายการ`);
    licenseOrphans.forEach(orphan => {
      console.log(`  - License ID ${orphan.entity_id} (ถูกลบแล้ว): ${orphan.field_label} = ${orphan.field_value}`);
    });
    
    // 4. ตรวจสอบ orphan data สำหรับ license_types
    const licenseTypeOrphans = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cf.field_label, cfv.field_value
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cf.entity_type = 'license_types' 
      AND cfv.entity_id NOT IN (SELECT id FROM license_types)
    `);
    
    console.log(`License Types orphan values: ${licenseTypeOrphans.length} รายการ`);
    licenseTypeOrphans.forEach(orphan => {
      console.log(`  - License Type ID ${orphan.entity_id} (ถูกลบแล้ว): ${orphan.field_label} = ${orphan.field_value}`);
    });
    
    // 5. ตรวจสอบว่ามี custom field ที่ถูกลบไปแล้วหรือไม่
    console.log('\n=== ตรวจสอบ Custom Fields ที่ถูกลบไปแล้ว ===\n');
    const orphanFieldValues = await fetchAll(`
      SELECT cfv.id, cfv.custom_field_id, cfv.entity_id, cfv.field_value
      FROM custom_field_values cfv
      WHERE cfv.custom_field_id NOT IN (SELECT id FROM custom_fields)
    `);
    
    console.log(`Values with deleted custom fields: ${orphanFieldValues.length} รายการ`);
    orphanFieldValues.forEach(orphan => {
      console.log(`  - Custom Field ID ${orphan.custom_field_id} (ถูกลบแล้ว): Entity ${orphan.entity_id} = ${orphan.field_value}`);
    });
    
    // 6. ตรวจสอบ DELETE CASCADE ใน schema
    console.log('\n=== ตรวจสอบ Foreign Key Constraints ===\n');
    const constraints = await fetchAll(`
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND (tc.table_name = 'custom_field_values' OR tc.table_name = 'shops' OR tc.table_name = 'licenses' OR tc.table_name = 'license_types')
    `);
    
    console.log('Foreign Key Constraints:');
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
    });
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

checkOrphanData();
