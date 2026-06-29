import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

// ดูข้อมูลที่ import มา ว่า owner_name และ phone เก็บอะไรจริง
console.log('=== ข้อมูลที่มี phone (เบอร์โทร) 10 แถวแรก ===');
const withPhone = await sql`
    SELECT l.id, s.owner_name, s.phone,
           (SELECT cfv.field_value FROM custom_field_values cfv
            JOIN custom_fields cf ON cf.id = cfv.custom_field_id
            WHERE cfv.entity_id = l.id AND cf.field_label = 'ประเภท') as business
    FROM licenses l
    JOIN shops s ON l.shop_id = s.id
    WHERE l.license_type_id = 165 AND s.phone IS NOT NULL AND s.phone != ''
    ORDER BY l.id LIMIT 10
`;
console.table(withPhone);

// ดูแถวที่ business (ประเภท) เป็น "-" หรือว่าง
console.log('\n=== แถวที่ ประเภท = "-" หรือว่าง (10 แถวแรก) ===');
const dashRows = await sql`
    SELECT l.id, s.owner_name, s.phone,
           (SELECT cfv.field_value FROM custom_field_values cfv
            JOIN custom_fields cf ON cf.id = cfv.custom_field_id
            WHERE cfv.entity_id = l.id AND cf.field_label = 'ประเภท') as business
    FROM licenses l
    JOIN shops s ON l.shop_id = s.id
    WHERE l.license_type_id = 165
    ORDER BY l.id LIMIT 10
`;
console.table(dashRows);
