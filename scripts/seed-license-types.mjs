import { fetchAll, fetchOne, executeQuery } from '../src/lib/db.js';

async function seedLicenseTypes() {
  try {
    console.log('=== สร้าง License Types ===\n');
    
    // ตรวจสอบ license types ที่มีอยู่แล้ว
    const existingTypes = await fetchAll('SELECT id, name FROM license_types ORDER BY id');
    console.log(`พบ License Types ที่มีอยู่: ${existingTypes.length} รายการ`);
    
    if (existingTypes.length > 0) {
      console.log('License Types ที่มีอยู่:');
      existingTypes.forEach(type => {
        console.log(`  ID ${type.id}: ${type.name}`);
      });
      console.log('✅ มี License Types อยู่แล้ว ไม่ต้องสร้างใหม่');
      return;
    }
    
    // สร้าง license types ใหม่
    const licenseTypes = [
      {
        name: 'ใบอนุญาตจำหน่ายสุรา ประเภทที่ 2',
        description: 'ใบอนุญาตสำหรับจำหน่ายสุราประเภทที่ 2 ตามพระราชบัญญัติ',
        validity_days: 365
      },
      {
        name: 'ใบอนุญาตจำหน่ายยาสูบ',
        description: 'ใบอนุญาตสำหรับจำหน่ายยาสูบและผลิตภัณฑ์ยาสูบ',
        validity_days: 365
      },
      {
        name: 'ใบอนุญาตจัดตั้งสถานที่จำหน่ายอาหาร',
        description: 'ใบอนุญาตสำหรับจัดตั้งสถานที่จำหน่ายอาหาร',
        validity_days: 365
      },
      {
        name: 'หนังสือรับรองการแจ้งจัดตั้งสถานที่จำหน่ายอาหาร',
        description: 'หนังสือรับรองสำหรับสถานที่จำหน่ายอาหาร',
        validity_days: 365
      },
      {
        name: 'ใบอนุญาตประกอบกิจการที่เป็นอันตรายต่อสุขภาพ',
        description: 'ใบอนุญาตสำหรับกิจการที่เป็นอันตรายต่อสุขภาพ',
        validity_days: 365
      },
      {
        name: 'ใบอนุญาตสะสมอาหาร',
        description: 'ใบอนุญาตสำหรับสะสมอาหาร',
        validity_days: 365
      }
    ];
    
    console.log('กำลังสร้าง License Types...');
    
    for (const typeData of licenseTypes) {
      const type = await fetchOne(`
        INSERT INTO license_types (name, description, validity_days)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, validity_days
      `, [typeData.name, typeData.description, typeData.validity_days]);
      
      console.log(`  ✅ สร้าง: ${type.name} (ID: ${type.id})`);
    }
    
    // ตรวจสอบผลลัพธ์
    const finalTypes = await fetchAll('SELECT id, name FROM license_types ORDER BY id');
    console.log(`\nสรุป: สร้าง License Types สำเร็จ ${finalTypes.length} รายการ`);
    
    console.log('\n🎉 สร้าง License Types สำเร็จแล้ว!');
    console.log('🚀 ตอนนี้สามารถสร้างข้อมูลทดสอบได้เต็มรูปแบบแล้ว!');
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
    console.error('Stack trace:', error.stack);
  }
  process.exit(0);
}

seedLicenseTypes();
