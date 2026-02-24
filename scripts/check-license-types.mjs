import { fetchAll } from '../src/lib/db.js';

async function checkLicenseTypes() {
  try {
    console.log('🔍 ตรวจสอบข้อมูล License Types...');
    
    // Query ที่ใช้ใน API
    const query = `
      SELECT lt.*, 
      (SELECT COUNT(*) FROM licenses l WHERE l.license_type_id = lt.id) as license_count
      FROM license_types lt
      ORDER BY lt.id ASC
    `;
    
    const types = await fetchAll(query);
    
    console.log(`📊 พบ ${types.length} ประเภทใบอนุญาต:`);
    types.forEach((type, index) => {
      console.log(`${index + 1}. ${type.name} (ID: ${type.id})`);
      console.log(`   - license_count: ${type.license_count}`);
      console.log(`   - description: ${type.description || 'N/A'}`);
      console.log(`   - validity_days: ${type.validity_days}`);
      console.log('');
    });
    
    // ตรวจสอบว่ามี licenses จริงหรือไม่
    const licenseCountQuery = `
      SELECT license_type_id, COUNT(*) as count
      FROM licenses
      GROUP BY license_type_id
      ORDER BY license_type_id
    `;
    
    const licenseCounts = await fetchAll(licenseCountQuery);
    console.log('📈 จำนวนใบอนุญาตจริงตาม license_type_id:');
    licenseCounts.forEach(item => {
      console.log(`   Type ID ${item.license_type_id}: ${item.count} ใบอนุญาต`);
    });
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  } finally {
    process.exit(0);
  }
}

checkLicenseTypes();
