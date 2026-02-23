import { fetchAll, fetchOne, executeQuery } from './src/lib/db.js';

async function cleanupOrphanData() {
  try {
    console.log('=== ทำความสะอาดข้อมูลตกค้างใน custom_field_values ===\n');
    
    // 1. ตรวจสอบ orphan data ก่อน cleanup
    const orphanCheck = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cf.field_label, cfv.field_value, cf.entity_type
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cf.entity_type = 'licenses' 
      AND cfv.entity_id NOT IN (SELECT id FROM licenses)
    `);
    
    console.log(`พบ orphan data ที่จะ cleanup: ${orphanCheck.length} รายการ`);
    
    if (orphanCheck.length === 0) {
      console.log('✅ ไม่มีข้อมูลตกค้างที่ต้อง cleanup');
      process.exit(0);
    }
    
    // 2. แสดงรายการที่จะลบ
    console.log('\nรายการที่จะลบ:');
    orphanCheck.forEach(orphan => {
      console.log(`  - ${orphan.entity_type} ID ${orphan.entity_id}: ${orphan.field_label} = ${orphan.field_value}`);
    });
    
    // 3. ทำการ cleanup
    console.log('\nกำลังทำการ cleanup...');
    
    const result = await executeQuery(`
      DELETE FROM custom_field_values 
      WHERE entity_type = 'licenses' 
      AND entity_id NOT IN (SELECT id FROM licenses)
    `);
    
    console.log(`✅ ลบข้อมูลตกค้าง ${result.rowCount} รายการเรียบร้อย`);
    
    // 4. ตรวจสอบผลลัพธ์
    const afterCheck = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cf.field_label, cfv.field_value, cf.entity_type
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cf.entity_type = 'licenses' 
      AND cfv.entity_id NOT IN (SELECT id FROM licenses)
    `);
    
    console.log(`หลัง cleanup: พบ orphan data ${afterCheck.length} รายการ`);
    
    if (afterCheck.length === 0) {
      console.log('✅ Cleanup สำเร็จ ไม่มีข้อมูลตกค้างแล้ว');
    } else {
      console.log('⚠️ ยังมีข้อมูลตกค้างบางรายการ');
    }
    
    // 5. แสดงสถิติหลัง cleanup
    const totalValues = await fetchAll(`
      SELECT cfv.entity_type, COUNT(*) as count
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      GROUP BY cfv.entity_type
    `);
    
    console.log('\nสถิติหลัง cleanup:');
    totalValues.forEach(stat => {
      console.log(`  - ${stat.entity_type}: ${stat.count} รายการ`);
    });
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

cleanupOrphanData();
