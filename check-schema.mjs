import { fetchAll, fetchOne, executeQuery } from './src/lib/db.js';

async function checkSchema() {
  try {
    console.log('=== ตรวจสอบโครงสร้าง custom_field_values ===');
    
    const columns = await fetchAll(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'custom_field_values'
      ORDER BY ordinal_position
    `);
    
    console.log('คอลัมน์ในตาราง custom_field_values:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
  process.exit(0);
}

checkSchema();
