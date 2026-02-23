import { fetchAll, fetchOne, executeQuery } from './src/lib/db.js';

async function checkLicenseTypes() {
  try {
    console.log('=== ตรวจสอบ License Types ===');
    
    const types = await fetchAll('SELECT id, name FROM license_types ORDER BY id');
    console.log('License Types ที่มีในระบบ:');
    types.forEach(type => {
      console.log(`  ID ${type.id}: ${type.name}`);
    });
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

checkLicenseTypes();
