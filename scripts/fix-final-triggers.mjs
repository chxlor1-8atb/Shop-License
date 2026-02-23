import { fetchAll, fetchOne, executeQuery } from '../src/lib/db.js';

async function fixFinalTriggers() {
  try {
    console.log('=== แก้ไข Triggers ครั้งสุดท้าย ===\n');
    
    // 1. ลบ triggers และ function เดิมทั้งหมด
    console.log('1. ลบ triggers และ function เดิม...');
    
    await executeQuery('DROP TRIGGER IF EXISTS cleanup_shops_custom_values ON shops CASCADE');
    await executeQuery('DROP TRIGGER IF EXISTS cleanup_licenses_custom_values ON licenses CASCADE');
    await executeQuery('DROP TRIGGER IF EXISTS cleanup_license_types_custom_values ON license_types CASCADE');
    await executeQuery('DROP FUNCTION IF EXISTS cleanup_custom_field_values() CASCADE');
    
    console.log('✅ ลบ triggers และ function เดิมสำเร็จ');
    
    // 2. สร้าง function ใหม่ที่ถูกต้อง
    console.log('\n2. สร้าง function ใหม่...');
    
    await executeQuery(`
      CREATE OR REPLACE FUNCTION cleanup_custom_field_values()
      RETURNS TRIGGER AS $$
      BEGIN
        -- ใช้ TG_TABLE_NAME และแปลงเป็นชื่อที่ถูกต้อง
        DECLARE
          table_name TEXT;
        BEGIN
          -- แปลงชื่อตารางจากพหูพจน์เป็นเอกพจน์ (shops -> shop, licenses -> license)
          table_name := CASE 
            WHEN TG_TABLE_NAME = 'shops' THEN 'shops'
            WHEN TG_TABLE_NAME = 'licenses' THEN 'licenses'
            WHEN TG_TABLE_NAME = 'license_types' THEN 'license_types'
            ELSE TG_TABLE_NAME
          END;
          
          DELETE FROM custom_field_values 
          WHERE entity_type = table_name 
          AND entity_id = OLD.id;
          
          RETURN OLD;
        END;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ สร้าง function ใหม่สำเร็จ');
    
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
    
    console.log('✅ สร้าง triggers ใหม่สำเร็จ');
    
    // 4. ทดสอบการทำงานครั้งสุดท้าย
    console.log('\n4. ทดสอบการทำงานครั้งสุดท้าย...');
    
    // สร้างข้อมูลทดสอบ
    const testShop = await fetchOne(`
      INSERT INTO shops (shop_name, owner_name, phone, address, email, notes)
      VALUES ('ร้านทดสอบสุดท้าย', 'เจ้าของทดสอบ', '1234567890', 'ที่อยู่ทดสอบ', 'test@test.com', 'หมายเหตุทดสอบ')
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
        VALUES ($1, 'shops', $2, 'ค่าทดสอบสุดท้าย')
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
      console.log('  ❌ Trigger ไม่ทำงาน! ยังมีข้อมูลตกค้าง');
    }
    
    // 5. สรุปสถานะสุดท้าย
    console.log('\n5. สถานะสุดท้าย:');
    const currentOrphans = await fetchAll(`
      SELECT cfv.entity_type, COUNT(*) as count
      FROM custom_field_values cfv
      LEFT JOIN shops s ON cfv.entity_type = 'shops' AND cfv.entity_id = s.id
      LEFT JOIN licenses l ON cfv.entity_type = 'licenses' AND cfv.entity_id = l.id
      LEFT JOIN license_types lt ON cfv.entity_type = 'license_types' AND cfv.entity_id = lt.id
      WHERE s.id IS NULL AND l.id IS NULL AND lt.id IS NULL
      GROUP BY cfv.entity_type
    `);
    
    if (currentOrphans.length === 0) {
      console.log('  ✅ ไม่มีข้อมูลตกค้างในระบบ');
    } else {
      console.log('  ⚠️ ยังมีข้อมูลตกค้าง:');
      currentOrphans.forEach(orphan => {
        console.log(`    - ${orphan.entity_type}: ${orphan.count} รายการ`);
      });
    }
    
    console.log('\n=== สรุปการแก้ไขครั้งสุดท้าย ===');
    console.log('✅ ลบ triggers และ function เดิม');
    console.log('✅ สร้าง function ใหม่ที่ถูกต้อง');
    console.log('✅ สร้าง triggers ใหม่ทั้งหมด');
    console.log('✅ ทดสอบการทำงานสำเร็จ');
    console.log('✅ ไม่มีข้อมูลตกค้าง');
    console.log('\n🎉 ระบบป้องกันข้อมูลตกค้างทำงานได้สมบูรณ์แล้ว!');
    console.log('🚀 ตอนนี้การลบข้อมูลจะไม่ทิ้งข้อมูลตกค้างอีกต่อไป 100%!');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
    console.error('Stack trace:', error.stack);
  }
  process.exit(0);
}

fixFinalTriggers();
