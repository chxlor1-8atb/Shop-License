import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

const CF_TYPE = 128; // custom field "ประเภท"

console.log('=== ตรวจสอบ licenses ที่อาจมีปัญหา (เบื้องต้น) ===');

// 1. Licenses ที่ shop_name ว่าง แต่ owner_name มี
//    (เช็คว่า render front-end ควรจะแสดง owner_name แทน shop_name)
console.log('\n--- Licenses ที่ shop_name ว่าง (จาก Excel import) ---');
const emptyShopName = await sql`
    SELECT l.id, l.license_number, s.owner_name, s.phone
    FROM licenses l
    JOIN shops s ON l.shop_id = s.id
    WHERE l.license_type_id = 165 
      AND (s.shop_name IS NULL OR s.shop_name = '')
    ORDER BY l.id DESC LIMIT 5;
`;
console.table(emptyShopName);

// 2. Licenses ที่ custom field 'ประเภท' ยังเป็น '-' (ไม่ควรมีแล้ว)
console.log('\n--- Licenses ที่ "ประเภท" ยังเป็น '-' (ไม่ควรมีแล้ว) ---');
const dashStillExists = await sql`
    SELECT l.id, l.license_number, s.owner_name, cfv.field_value as business
    FROM licenses l
    JOIN shops s ON l.shop_id = s.id
    JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.custom_field_id = ${CF_TYPE}
    WHERE l.license_type_id = 165 
      AND cfv.field_value = '-'
    LIMIT 5;
`;
if (dashStillExists.length === 0) console.log('✅ ไม่มี custom field \"ประเภท\" ที่เป็น \"-\" แล้ว');
else console.table(dashStillExists);

// 3. Licenses ที่ไม่มี owner_name หรือ license_number (ข้อมูลไม่สมบูรณ์)
console.log('\n--- Licenses ที่ข้อมูลหลักไม่สมบูรณ์ ---');
const incompleteData = await sql`
    SELECT l.id, l.license_number, s.owner_name, s.phone, l.status, l.issue_date, l.expiry_date
    FROM licenses l
    JOIN shops s ON l.shop_id = s.id
    WHERE l.license_type_id = 165 
      AND (s.owner_name IS NULL OR s.owner_name = '' OR l.license_number IS NULL OR l.license_number = '')
    LIMIT 5;
`;
if (incompleteData.length === 0) console.log('✅ ไม่มี licenses ที่ข้อมูลหลักไม่สมบูรณ์');
else console.table(incompleteData);

// 4. สรุปสถานะ active/expired ของ licenses ทั้งหมด
console.log('\n--- สรุปสถานะใบอนุญาตทั้งหมดที่ import ---');
const statusSummary = await sql`
    SELECT 
        CASE 
            WHEN l.status IN ('suspended', 'revoked') THEN l.status
            WHEN l.expiry_date < CURRENT_DATE THEN 'expired'
            ELSE 'active'
        END as computed_status,
        COUNT(*)::int as count
    FROM licenses l
    WHERE l.license_type_id = 165
    GROUP BY computed_status ORDER BY count DESC;
`;
console.table(statusSummary);

