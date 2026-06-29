import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

console.log('=== ตรวจสอบข้อมูลที่ Import จาก Excel (257 รายการ) ===');

// 1. ตรวจสอบ owner_name, shop_name, phone
console.log('\n1. owner_name, shop_name, phone (10 รายการแรก)');
const shopsData = await sql`
    SELECT s.id, s.owner_name, s.shop_name, s.phone
    FROM shops s
    JOIN licenses l ON l.shop_id = s.id
    WHERE l.license_type_id = 165 
    ORDER BY s.id DESC
    LIMIT 10
`;
console.table(shopsData);

// 2. ตรวจสอบ custom field \"ประเภท\" (field_value) ที่ไม่ใช่ '' (ว่าง)
console.log('\n2. custom field \"ประเภท\" ที่มีค่า (10 รายการแรก)');
const customFieldData = await sql`
    SELECT l.id as license_id, s.owner_name, cfv.field_value as business_type
    FROM licenses l
    JOIN shops s ON l.shop_id = s.id
    JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
    JOIN custom_fields cf ON cf.id = cfv.custom_field_id
    WHERE l.license_type_id = 165 AND cf.field_name = 'cf_1781150536281' -- custom field for \"ประเภท\"
      AND cfv.field_value != ''
    ORDER BY l.id DESC
    LIMIT 10
`;
console.table(customFieldData);

// 3. ตรวจสอบ custom field \"ประเภท\" ที่ยังเป็น \"-\"
console.log('\n3. custom field \"ประเภท\" ที่ยังเป็น \"-\"');
const dashStillExist = await sql`
    SELECT l.id as license_id, s.owner_name, cfv.field_value as business_type
    FROM licenses l
    JOIN shops s ON l.shop_id = s.id
    JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
    JOIN custom_fields cf ON cf.id = cfv.custom_field_id
    WHERE l.license_type_id = 165 AND cf.field_name = 'cf_1781150536281' -- custom field for \"ประเภท\"
      AND cfv.field_value = '-'
`;
console.table(dashStillExist);

// 4. ตรวจสอบว่ามี owner_name ที่มีขีดกลาง (hyphen) หรือวงเล็บเหลืออยู่หรือไม่
console.log('\n4. owner_name ที่มีขีดกลาง (-) หรือวงเล็บ () (ควรจะไม่มี)');
const ownerNameIssue = await sql`
    SELECT s.id, s.owner_name, s.phone
    FROM shops s
    WHERE s.owner_name ~ '[\-()]' -- ตรวจสอบ hyphen หรือวงเล็บ
    ORDER BY s.id DESC
    LIMIT 10
`;
console.table(ownerNameIssue);

// 5. นับจำนวน licenses ที่มีค่า shop_name ไม่ใช่ '' (ควรจะเป็น 0 ถ้า import ตามที่ตกลง)
console.log('\n5. licenses ที่มี shop_name ไม่ใช่ \'\' (should be 0 or old data)');
const shopNameNotEmpty = await sql`
    SELECT COUNT(*)::int as cnt
    FROM shops
    WHERE id >= 1764 AND shop_name != ''
`;
console.table(shopNameNotEmpty);
