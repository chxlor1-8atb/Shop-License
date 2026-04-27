// Migration: ลบคอลัมน์ email ออกจากตาราง shops
// รัน: node scripts/drop-shops-email.mjs
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function main() {
  console.log('🔍 ตรวจสอบคอลัมน์ email ในตาราง shops...');
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'shops' AND column_name = 'email'
  `;

  if (cols.length === 0) {
    console.log('✅ ไม่พบคอลัมน์ email — ไม่ต้องทำอะไร');
    return;
  }

  console.log('🗑️  กำลังลบคอลัมน์ shops.email...');
  await sql`ALTER TABLE shops DROP COLUMN IF EXISTS email`;
  console.log('✅ ลบสำเร็จ');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
