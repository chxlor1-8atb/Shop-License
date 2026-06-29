import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

// แก้ shop id=1764 (ที่ import ลำดับที่ 1) ให้ shop_name เว้นว่าง
const res = await sql`
    UPDATE shops SET shop_name = ''
    WHERE id = 1764
    RETURNING id, shop_name, owner_name
`;
console.log('=== แก้ไขแล้ว ===');
console.table(res);

// ยืนยันผ่าน query แบบ /api/licenses
const row = await sql`
    SELECT l.id, l.license_number, s.shop_name, s.owner_name,
           COALESCE(
               json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL),
               '{}'::json
           ) as custom_fields
    FROM licenses l
    LEFT JOIN shops s ON l.shop_id = s.id
    LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
    LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
    WHERE l.id = 3466
    GROUP BY l.id, s.shop_name, s.owner_name
`;
console.log('=== ข้อมูล id=3466 หลังแก้ไข ===');
console.log(JSON.stringify(row, null, 2));
