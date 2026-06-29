import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

// เช็คว่า owner_name มี "-" หรือเบอร์โทรปนไหม
console.log('=== owner_name ที่มี "-" หรือตัวเลขปน ===');
const weirdNames = await sql`
    SELECT id, owner_name, phone FROM shops
    WHERE owner_name ~ '[-0-9]'
    ORDER BY id LIMIT 20
`;
if (weirdNames.length === 0) console.log('ไม่มี — owner_name สะอาด');
else console.table(weirdNames);

// นับสรุป
console.log('\n=== สรุป ===');
const totalShops = await sql`SELECT COUNT(*)::int as cnt FROM shops WHERE id >= 1764`;
console.log(`shops ที่ import ทั้งหมด: ${totalShops[0].cnt}`);

const withPhone = await sql`SELECT COUNT(*)::int as cnt FROM shops WHERE phone IS NOT NULL AND phone != ''`;
console.log(`ที่มีเบอร์โทร: ${withPhone[0].cnt}`);

const dashBiz = await sql`
    SELECT COUNT(*)::int as cnt FROM custom_field_values cfv
    JOIN custom_fields cf ON cf.id = cfv.custom_field_id
    WHERE cf.field_label = 'ประเภท' AND (cfv.field_value = '-' OR cfv.field_value = '')
`;
console.log(`ประเภทที่เป็น "-" หรือว่าง: ${dashBiz[0].cnt}`);
