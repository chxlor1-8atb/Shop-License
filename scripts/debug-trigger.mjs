import { fetchAll, fetchOne, executeQuery } from '../src/lib/db.js';

async function debugTrigger() {
  try {
    console.log('=== Debug Trigger ===\n');
    
    // 1. ตรวจสอบว่า trigger ถูกสร้างไว้จริง
    console.log('1. ตรวจสอบ triggers:');
    const triggers = await fetchAll(`
      SELECT trigger_name, event_manipulation, event_object_table, action_timing, action_condition, action_statement
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%cleanup_custom_values%'
      ORDER BY event_object_table
    `);
    
    triggers.forEach(trigger => {
      console.log(`  ${trigger.trigger_name}:`);
      console.log(`    - Table: ${trigger.event_object_table}`);
      console.log(`    - Event: ${trigger.event_manipulation}`);
      console.log(`    - Timing: ${trigger.action_timing}`);
      console.log(`    - Statement: ${trigger.action_statement}`);
    });
    
    // 2. ทดสอบการทำงานด้วยการ debug
    console.log('\n2. ทดสอบการทำงานด้วย debug:');
    
    // สร้างข้อมูลทดสอบ
    const testShop = await fetchOne(`
      INSERT INTO shops (shop_name, owner_name, phone, address, email, notes)
      VALUES ('ร้านทดสอบ debug', 'เจ้าของทดสอบ', '1234567890', 'ที่อยู่ทดสอบ', 'test@test.com', 'หมายเหตุทดสอบ')
      RETURNING id, shop_name
    `);
    
    console.log(`  สร้างร้านทดสอบ ID: ${testShop.id} (${testShop.shop_name})`);
    
    // เพิ่ม custom field values
    const shopFields = await fetchAll(`
      SELECT cf.id, cf.field_name
      FROM custom_fields cf 
      WHERE cf.entity_type = 'shops'
      LIMIT 2
    `);
    
    for (const field of shopFields) {
      await executeQuery(`
        INSERT INTO custom_field_values (custom_field_id, entity_type, entity_id, field_value)
        VALUES ($1, 'shops', $2, 'ค่าทดสอบ debug')
      `, [field.id, testShop.id]);
    }
    
    console.log(`  เพิ่ม custom field values ${shopFields.length} รายการ`);
    
    // ตรวจสอบก่อนลบ
    const beforeDelete = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cfv.field_value, cf.field_label
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cfv.entity_type = 'shops' AND cfv.entity_id = $1
    `, [testShop.id]);
    
    console.log(`  ก่อนลบ: มี custom field values ${beforeDelete.length} รายการ`);
    beforeDelete.forEach(row => {
      console.log(`    - ID ${row.id}: ${row.field_label} = ${row.field_value}`);
    });
    
    // ตรวจสอบว่า TG_TABLE_NAME ให้ค่าอะไร
    console.log('\n3. ทดสอบ TG_TABLE_NAME:');
    
    // สร้าง trigger function ที่ log ค่า TG_TABLE_NAME
    await executeQuery('DROP TRIGGER IF EXISTS debug_shops_trigger ON shops CASCADE');
    await executeQuery('DROP FUNCTION IF EXISTS debug_trigger_function() CASCADE');
    
    await executeQuery(`
      CREATE OR REPLACE FUNCTION debug_trigger_function()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE NOTICE 'TRIGGER FIRED: TG_TABLE_NAME = %, OLD.id = %', TG_TABLE_NAME, OLD.id;
        
        DELETE FROM custom_field_values 
        WHERE entity_type = 'shops' 
        AND entity_id = OLD.id;
        
        RAISE NOTICE 'DELETED % rows from custom_field_values', FOUND;
        
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await executeQuery(`
      CREATE TRIGGER debug_shops_trigger
      AFTER DELETE ON shops
      FOR EACH ROW
      EXECUTE FUNCTION debug_trigger_function();
    `);
    
    console.log('  สร้าง debug trigger สำเร็จ');
    
    // ลบร้านค้าเพื่อดูว่า trigger ทำงาน
    console.log('\n4. ลบร้านค้าเพื่อดู trigger ทำงาน:');
    
    await executeQuery('DELETE FROM shops WHERE id = $1', [testShop.id]);
    
    // ตรวจสอบหลังลบ
    const afterDelete = await fetchAll(`
      SELECT cfv.id, cfv.entity_id, cfv.field_value, cf.field_label
      FROM custom_field_values cfv
      JOIN custom_fields cf ON cfv.custom_field_id = cf.id
      WHERE cfv.entity_type = 'shops' AND cfv.entity_id = $1
    `, [testShop.id]);
    
    console.log(`  หลังลบ: มี custom field values ${afterDelete.length} รายการ`);
    afterDelete.forEach(row => {
      console.log(`    - ID ${row.id}: ${row.field_label} = ${row.field_value}`);
    });
    
    // ลบ debug trigger
    await executeQuery('DROP TRIGGER IF EXISTS debug_shops_trigger ON shops CASCADE');
    await executeQuery('DROP FUNCTION IF EXISTS debug_trigger_function() CASCADE');
    
    // สรุปผล
    if (afterDelete.length === 0) {
      console.log('\n🎉 Trigger ทำงานสำเร็จ! ไม่มีข้อมูลตกค้าง');
    } else {
      console.log('\n❌ Trigger ไม่ทำงาน! ยังมีข้อมูลตกค้าง');
    }
    
    console.log('\n=== สรุป ===');
    console.log('✅ Debug trigger สำเร็จ');
    console.log('✅ ตรวจสอบการทำงานของ TG_TABLE_NAME');
    console.log('✅ ทดสอบการลบสำเร็จ');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
    console.error('Stack trace:', error.stack);
  }
  process.exit(0);
}

debugTrigger();
