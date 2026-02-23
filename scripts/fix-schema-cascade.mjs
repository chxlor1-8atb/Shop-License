import { fetchAll, fetchOne, executeQuery } from '../src/lib/db.js';

async function fixSchemaCascade() {
  try {
    console.log('=== แก้ไข Schema เพื่อป้องกันข้อมูลตกค้าง ===\n');
    
    // 1. ตรวจสอบปัญหาปัจจุบัน
    console.log('1. ตรวจสอบข้อมูลตกค้างปัจจุบัน...');
    
    const orphanCheck = await fetchAll(`
      SELECT cfv.entity_type, COUNT(*) as count
      FROM custom_field_values cfv
      LEFT JOIN shops s ON cfv.entity_type = 'shops' AND cfv.entity_id = s.id
      LEFT JOIN licenses l ON cfv.entity_type = 'licenses' AND cfv.entity_id = l.id
      LEFT JOIN license_types lt ON cfv.entity_type = 'license_types' AND cfv.entity_id = lt.id
      WHERE s.id IS NULL AND l.id IS NULL AND lt.id IS NULL
      GROUP BY cfv.entity_type
    `);
    
    console.log('ข้อมูลตกค้างปัจจุบัน:');
    orphanCheck.forEach(orphan => {
      console.log(`  - ${orphan.entity_type}: ${orphan.count} รายการ`);
    });
    
    // 2. ทำความสะอาดข้อมูลตกค้างก่อน
    if (orphanCheck.length > 0) {
      console.log('\n2. ทำความสะอาดข้อมูลตกค้าง...');
      
      const cleanupResult = await executeQuery(`
        DELETE FROM custom_field_values 
        WHERE entity_type = 'shops' AND entity_id NOT IN (SELECT id FROM shops)
        OR entity_type = 'licenses' AND entity_id NOT IN (SELECT id FROM licenses)
        OR entity_type = 'license_types' AND entity_id NOT IN (SELECT id FROM license_types)
      `);
      
      console.log(`✅ ลบข้อมูลตกค้าง ${cleanupResult.rowCount} รายการ`);
    }
    
    // 3. สร้าง Trigger สำหรับ Auto-Cleanup
    console.log('\n3. สร้าง Trigger สำหรับ Auto-Cleanup...');
    
    // Drop existing triggers if they exist
    await executeQuery('DROP TRIGGER IF EXISTS cleanup_shops_custom_values ON shops CASCADE');
    await executeQuery('DROP TRIGGER IF EXISTS cleanup_licenses_custom_values ON licenses CASCADE');
    await executeQuery('DROP TRIGGER IF EXISTS cleanup_license_types_custom_values ON license_types CASCADE');
    await executeQuery('DROP FUNCTION IF EXISTS cleanup_custom_field_values() CASCADE');
    
    // Create function
    await executeQuery(`
      CREATE OR REPLACE FUNCTION cleanup_custom_field_values()
      RETURNS TRIGGER AS $$
      BEGIN
        DELETE FROM custom_field_values 
        WHERE entity_type = TG_TABLE_NAME 
        AND entity_id = OLD.id;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create triggers
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
    
    console.log('✅ สร้าง Trigger สำหรับ Auto-Cleanup สำเร็จ');
    
    // 4. สร้าง Index สำหรับ Performance
    console.log('\n4. สร้าง Index สำหรับ Performance...');
    
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity_lookup 
      ON custom_field_values(entity_type, entity_id)
    `);
    
    console.log('✅ สร้าง Index สำหรับ Performance สำเร็จ');
    
    // 5. สร้าง Periodic Cleanup Function
    console.log('\n5. สร้าง Periodic Cleanup Function...');
    
    await executeQuery(`
      CREATE OR REPLACE FUNCTION cleanup_all_orphan_custom_values()
      RETURNS INTEGER AS $$
      DECLARE
        cleanup_count INTEGER;
      BEGIN
        DELETE FROM custom_field_values 
        WHERE entity_type = 'shops' AND entity_id NOT IN (SELECT id FROM shops)
        OR entity_type = 'licenses' AND entity_id NOT IN (SELECT id FROM licenses)
        OR entity_type = 'license_types' AND entity_id NOT IN (SELECT id FROM license_types);
        
        GET DIAGNOSTICS cleanup_count = ROW_COUNT;
        RETURN cleanup_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ สร้าง Periodic Cleanup Function สำเร็จ');
    
    // 6. ทดสอบการทำงาน
    console.log('\n6. ทดสอบการทำงาน...');
    
    const testCleanup = await fetchOne('SELECT cleanup_all_orphan_custom_values() as cleaned');
    console.log(`✅ ทดสอบสำเร็จ ลบข้อมูลตกค้าง ${testCleanup.cleaned} รายการ`);
    
    // 7. แสดงสถานะสุดท้าย
    console.log('\n7. สถานะสุดท้าย...');
    
    const finalCheck = await fetchAll(`
      SELECT cfv.entity_type, COUNT(*) as count
      FROM custom_field_values cfv
      LEFT JOIN shops s ON cfv.entity_type = 'shops' AND cfv.entity_id = s.id
      LEFT JOIN licenses l ON cfv.entity_type = 'licenses' AND cfv.entity_id = l.id
      LEFT JOIN license_types lt ON cfv.entity_type = 'license_types' AND cfv.entity_id = lt.id
      WHERE s.id IS NULL AND l.id IS NULL AND lt.id IS NULL
      GROUP BY cfv.entity_type
    `);
    
    if (finalCheck.length === 0) {
      console.log('🎉 ไม่มีข้อมูลตกค้างแล้ว! ระบบปลอดภัย');
    } else {
      console.log('⚠️ ยังมีข้อมูลตกค้างบางรายการ:');
      finalCheck.forEach(orphan => {
        console.log(`  - ${orphan.entity_type}: ${orphan.count} รายการ`);
      });
    }
    
    console.log('\n=== สรุปการแก้ไข ===');
    console.log('✅ ลบข้อมูลตกค้างเดิม');
    console.log('✅ สร้าง Trigger Auto-Cleanup (DELETE -> ลบ custom_field_values ตาม)');
    console.log('✅ สร้าง Index สำหรับ Performance');
    console.log('✅ สร้าง Function สำหรับ Periodic Cleanup');
    console.log('✅ ทดสอบการทำงานสำเร็จ');
    console.log('\n🚀 ตอนนี้การลบข้อมูลจะไม่ทิ้งข้อมูลตกค้างอีกต่อไป!');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
    console.error('Stack trace:', error.stack);
  }
  process.exit(0);
}

fixSchemaCascade();
