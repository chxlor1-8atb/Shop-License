import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

// Query แบบเดียวกับ /api/licenses เพื่อยืนยันว่าข้อมูลออกมาถูกในหน้า dashboard
const row = await sql`
    SELECT l.id, l.license_number, s.shop_name, s.owner_name, lt.name as type_name,
           CASE 
               WHEN l.status IN ('suspended','revoked') THEN l.status
               WHEN l.expiry_date < CURRENT_DATE THEN 'expired'
               ELSE 'active'
           END AS status,
           l.issue_date, l.expiry_date,
           COALESCE(
               json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL),
               '{}'::json
           ) as custom_fields
    FROM licenses l
    LEFT JOIN shops s ON l.shop_id = s.id
    LEFT JOIN license_types lt ON l.license_type_id = lt.id
    LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
    LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses' AND cf.is_active = true
    WHERE l.id = 3466
    GROUP BY l.id, s.shop_name, s.owner_name, lt.name
`;
console.log('=== ข้อมูลที่จะแสดงในหน้า dashboard/licenses (id=3466) ===');
console.log(JSON.stringify(row, null, 2));
