import { neon } from '@neondatabase/serverless';
import XLSX from 'xlsx';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

console.log('=== สรุปจำนวนข้อมูลหลัง import ===');
const total = await sql`SELECT COUNT(*)::int as cnt FROM licenses WHERE license_type_id = 165`;
console.log(`licenses (type 165): ${total[0].cnt} รายการ`);

const shopsCnt = await sql`
    SELECT COUNT(DISTINCT s.id)::int as cnt
    FROM shops s
    JOIN licenses l ON l.shop_id = s.id
    WHERE l.license_type_id = 165
`;
console.log(`shops ที่เกี่ยวข้อง: ${shopsCnt[0].cnt} รายการ`);

const cfvCnt = await sql`
    SELECT COUNT(*)::int as cnt FROM custom_field_values cfv
    JOIN licenses l ON l.id = cfv.entity_id AND cfv.entity_type = 'licenses'
    WHERE l.license_type_id = 165
`;
console.log(`custom_field_values: ${cfvCnt[0].cnt} รายการ (ควรเป็น ~2x ของ licenses)`);

// เช็คแถว 21 (ที่ error: 2027-02-29)
console.log('\n=== แถวที่ error (ลำดับ 21): 2027-02-29 ไม่มีจริง ===');
const wb = XLSX.readFile(path.resolve('C:/Users/Admin/Downloads/อนุญาตจำหน่ายสินค้า_มาร์กสี (3).xlsx'));
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], { header: 1, defval: '' });
const r21 = rows.find(r => r[0] === 21);
if (r21) {
    console.log(`ลำดับ ${r21[0]}: ${r21[1]} | ${r21[2]} | ${r21[3]} | vol=${r21[4]} num=${r21[5]} | expiry=${r21[6]}`);
}

// ตรวจสถานะ active/expired
console.log('\n=== สถานะรวม ===');
const byStatus = await sql`
    SELECT 
        CASE 
            WHEN status IN ('suspended','revoked') THEN status
            WHEN expiry_date < CURRENT_DATE THEN 'expired'
            ELSE 'active'
        END as computed_status,
        COUNT(*)::int as cnt
    FROM licenses WHERE license_type_id = 165
    GROUP BY computed_status ORDER BY cnt DESC
`;
console.table(byStatus);

// ตัวอย่างข้อมูล 5 แถวล่าสุด
console.log('=== ตัวอย่าง 5 แถวล่าสุด (API query) ===');
const sample = await sql`
    SELECT l.id, l.license_number, s.owner_name,
           CASE WHEN l.expiry_date < CURRENT_DATE THEN 'expired' ELSE 'active' END as status,
           l.issue_date, l.expiry_date,
           COALESCE(json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL), '{}'::json) as custom_fields
    FROM licenses l
    LEFT JOIN shops s ON l.shop_id = s.id
    LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
    LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses'
    WHERE l.license_type_id = 165
    GROUP BY l.id, s.owner_name
    ORDER BY l.id DESC LIMIT 5
`;
console.table(sample);
