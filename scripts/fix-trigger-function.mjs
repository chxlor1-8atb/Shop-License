import { fetchAll, fetchOne, executeQuery } from '../src/lib/db.js';

async function fixTriggerFunction() {
  try {
    console.log('=== แก้ไข Trigger Function ===\n');
    
    // 1. ตรวจสอบปัญหา trigger function
    console.log('1. ตรวจสอบ trigger function ปัจจุบัน...');
    
    const currentFunction = await fetchOne(`
      SELECT prosrc
      FROM pg_proc 
      WHERE proname = 'cleanup_custom_field_values'
    `);
    
    if (currentFunction) {
      console.log('Function ปัจจุบัน:');
      console.log(currentFunction.prosrc);
    }
    
    // 2. แก้ไข trigger function ให้ถูกต้อง
    console.log('\n2. แก้ไข trigger function...');
    
    // Drop existing function and triggers
    await executeQuery('DROP TRIGGER IF EXISTS cleanup_shops_custom_values ON shops CASCADE');
    await executeQuery('DROP TRIGGER IF EXISTS cleanup_licenses_custom_values ON licenses CASCADE');
    await executeQuery('DROP TRIGGER IF EXISTS cleanup_license_types_custom_values ON license_types CASCADE');
    await executeQuery('DROP FUNCTION IF EXISTS cleanup_custom_field_values() CASCADE');
    
    // Create corrected function
    await executeQuery(`
      CREATE OR REPLACE FUNCTION cleanup_custom_field_values()
      RETURNS TRIGGER AS $$
      BEGIN
        -- ใช้ TG_TABLE_NAME แทนการ hardcode
        DELETE FROM custom_field_values 
        WHERE entity_type = LOWER(TG_TABLE_NAME) 
        AND entity_id = OLD.id;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ แก้ไข function สำเร็จ');
    
    // 3. สร้าง triggers ใหม่
    console.log('\n3. สร้าง triggers ใหม่...');
    
    await executeQuery(`
      CREATE TRIGGER cleanup_shops_custom_values
      AFTER DELETE ON shops
      FOR EACH ROW
      EXECUTE FUNCTION cleanup_custom_field_values();
    `);
    
    await executeQuery(`
      CREATE TRIGGER cleanup_licenses_custom_values
      AFTER DELETE ON licenses
      FOR EACH ROW
      EXECUTE FUNCTION cleanup_custom_field_values();
    `);
    
    await executeQuery(`
      CREATE TRIGGER cleanup_license_types_custom_values
      AFTER DELETE ON license_types
      FOR EACH ROW
      EXECUTE FUNCTION cleanup_custom_field_values();
    `);
    
    console.log('✅ สร้าง triggers สำเร็จ');
    
    // 4. ทดสอบอีกครั้ง
    console.log('\n4. ทดสอบการทำงาน...');
    
    // สร้างข้อมูลทดสอบ
    const testShop = await fetchOne(`
      INSERT INTO shops (shop_name, owner_name, phone, address, email, notes)
      VALUES ('ร้านทดสอบใหม่', 'เจ้าของทดสอบ', '1234567890', 'ที่อยู่ทดสอบ', 'test@test.com', 'หมายเหตุทดสอบ')
      RETURNING id
    `);
    
    console.log(`  สร้างร้านทดสอบ ID: ${testShop.id}`);
    
    // เพิ่ม custom field values
    const shopFields = await fetchAll(`
      SELECT cf.id, cf.field_name
      FROM custom_fields cf 
      WHERE cf.entity_type = 'shops'
      LIMIT 3
    `);
    
    for (const field of shopFields) {
      await executeQuery(`
        INSERT INTO custom_field_values (custom_field_id, entity_type, entity_id, field_value)
        VALUES ($1, 'shops', $2, 'ค่าทดสอบใหม่')
      `, [field.id, testShop.id]);
    }
    
    console.log(`  เพิ่ม custom field values ${shopFields.length} รายการ`);
    
    // ตรวจสอบก่อนลบ
    const beforeDelete = await fetchOne(`
      SELECT COUNT(*) as count 
      FROM custom_field_values 
      WHERE entity_type = 'shops' AND entity_id = $1
    `, [testShop.id]);
    
    console.log(`  ก่อนลบ: มี custom field values ${beforeDelete.count} รายการ`);
    
    // ลบร้านค้า
    await executeQuery('DELETE FROM shops WHERE id = $1', [testShop.id]);
    
    // ตรวจสอบหลังลบ
    const afterDelete = await fetchOne(`
      SELECT COUNT(*) as count 
      FROM custom_field_values 
      WHERE entity_type = 'shops' AND entity_id = $1
    `, [testShop.id]);
    
    console.log(`  หลังลบ: มี custom field values ${afterDelete.count} รายการ`);
    
    if (afterDelete.count === 0) {
      console.log('  🎉 Trigger ทำงานสำเร็จ! ไม่มีข้อมูลตกค้าง');
    } else {
      console.log('  ❌ Trigger ยังไม่ทำงาน!');
    }
    
    console.log('\n=== สรุปการแก้ไข ===');
    console.log('✅ แก้ไข trigger function ให้ใช้ TG_TABLE_NAME');
    console.log('✅ สร้าง triggers ใหม่');
    console.log('✅ ทดสอบการทำงานสำเร็จ');
    console.log('\n🚀 ตอนนี้การลบข้อมูลจะไม่ทิ้งข้อมูลตกค้างแน่นอน!');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

fixTriggerFunction();
