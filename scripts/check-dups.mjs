import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

console.log('=== license_number ที่ซ้ำกับ DB เดิม (สุ่ม 10) ===');
const dups = await sql`
    SELECT license_number, COUNT(*)::int as cnt
    FROM licenses
    WHERE license_number IS NOT NULL AND license_number != ''
    GROUP BY license_number
    HAVING COUNT(*) > 1
    LIMIT 10
`;
console.table(dups);

console.log('\n=== จำนวน licenses ที่ license_type_id = 165 (ประเภทนี้) ===');
const cnt = await sql`SELECT COUNT(*)::int as cnt FROM licenses WHERE license_type_id = 165`;
console.table(cnt);

console.log('\n=== ตัวอย่าง license_number ที่มีใน DB เดิม (10 ล่าสุดที่ type=165) ===');
const sample = await sql`
    SELECT id, license_number, created_at FROM licenses
    WHERE license_type_id = 165 ORDER BY id DESC LIMIT 10
`;
console.table(sample);
