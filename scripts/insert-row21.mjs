// Insert แถวลำดับ 21 (นายครรชิต ทวีเกต, 3/9)
// วันหมดอายุ 29 ก.พ. 2570 ไม่มีจริง → ข้ามไปเดือนถัดไป 1 วัน = 1 มี.ค. 2570 (2027-03-01)
import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

const LICENSE_TYPE_ID = 165;
const CF_MONEY = 127;
const CF_TYPE = 128;

function looksLikePhone(s) {
    if (!s) return false;
    const digits = String(s).replace(/[^\d]/g, '');
    return /^\d{9,10}$/.test(digits);
}

const wb = XLSX.readFile(path.resolve('C:/Users/Admin/Downloads/อนุญาตจำหน่ายสินค้า_มาร์กสี (3).xlsx'));
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], { header: 1, defval: '' });
const row = rows.find(r => r[0] === 21);

const name = String(row[1]).replace(/\s+/g, ' ').trim();
const business = String(row[2] || '').trim();
const issueDate = '2026-06-16';   // 16 มิ.ค. 2569
const expiryDate = '2027-03-01';  // 29 ก.พ. 2570 → 1 มี.ค. 2570
const licenseNumber = `${row[4]}/${row[5]}`; // 3/9
const tempSell = Number(row[7]) || 0;
const permSell = Number(row[8]) || 0;
const money = permSell > 0 ? permSell : (tempSell > 0 ? tempSell : 0);
const phone = looksLikePhone(row[9]) ? String(row[9]).replace(/[^\d]/g, '') : null;
const status = 'active'; // 2027-03-01 > วันนี้

console.log('ข้อมูลที่จะ insert (ลำดับ 21):');
console.log(`  ${name} | ${business || '-'} | ${licenseNumber}`);
console.log(`  issue=${issueDate} | expiry=${expiryDate} (ปรับจาก 29 ก.พ.→1 มี.ค.) | status=${status}`);
console.log(`  money=${money} | phone=${phone || '-'}`);

// เช็คซ้ำ
const dup = await sql`
    SELECT l.id FROM licenses l
    LEFT JOIN shops s ON l.shop_id = s.id
    WHERE l.license_number = ${licenseNumber} AND s.owner_name = ${name}
    LIMIT 1
`;
if (dup.length > 0) {
    console.log(`⚠️ มีอยู่แล้ว id=${dup[0].id} → ข้าม`);
    process.exit(0);
}

// หา/สร้าง shop
let shopId;
const foundShop = await sql`SELECT id FROM shops WHERE owner_name = ${name} AND COALESCE(phone,'') = ${phone||''} ORDER BY id LIMIT 1`;
if (foundShop.length > 0) {
    shopId = foundShop[0].id;
    console.log(`♻️ reuse shop id=${shopId}`);
} else {
    const ns = await sql`INSERT INTO shops (shop_name, owner_name, phone) VALUES ('', ${name}, ${phone}) RETURNING id`;
    shopId = ns[0].id;
    console.log(`✅ created shop id=${shopId}`);
}

// insert license
const nl = await sql`
    INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status)
    VALUES (${shopId}, ${LICENSE_TYPE_ID}, ${licenseNumber}, ${issueDate}, ${expiryDate}, ${status})
    RETURNING id
`;
const licenseId = nl[0].id;
console.log(`✅ created license id=${licenseId}`);

// custom fields
await sql`INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value, updated_at)
          VALUES (${CF_MONEY}, ${licenseId}, 'licenses', ${String(money)}, NOW())
          ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()`;
await sql`INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value, updated_at)
          VALUES (${CF_TYPE}, ${licenseId}, 'licenses', ${business}, NOW())
          ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()`;
console.log(`✅ custom fields: จำนวนเงิน=${money}, ประเภท=${business}`);
console.log('🎉 insert ลำดับ 21 สำเร็จ (วันหมดอายุปรับเป็น 1 มี.ค. 2570)');
