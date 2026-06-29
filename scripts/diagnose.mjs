import { neon } from '@neondatabase/serverless';
import XLSX from 'xlsx';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
const sql = neon(process.env.DATABASE_URL);

console.log('=== ปัญหา 1: ประเภทที่เป็น "-" มาจาก Excel จริงไหม? ===');
const wb = XLSX.readFile(path.resolve('C:/Users/Admin/Downloads/อนุญาตจำหน่ายสินค้า_มาร์กสี (3).xlsx'));
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Sheet1'], { header: 1, defval: '' });
const dataRows = rows.slice(2);
const dashInExcel = dataRows.filter(r => String(r[2]||'').trim() === '-');
console.log(`แถวที่คอลัมน์ "กิจการ" = "-" ใน Excel: ${dashInExcel.length} แถว`);
console.log('ตัวอย่าง:', dashInExcel.slice(0,5).map(r => `#${r[0]} ${String(r[1]).trim()}`));

console.log('\n=== ปัญหา 2: คอลัมน์ "ร้านค้า" fallback ไป label ที่มีเบอร์ ===');
// ข้อมูลที่ import มาทั้งหมด shop_name = '' → ใน dropdown render จะ fallback ไป label
const empties = await sql`
    SELECT COUNT(*)::int as cnt FROM shops
    WHERE id >= 1764 AND (shop_name = '' OR shop_name IS NULL)
`;
console.log(`shops ที่ shop_name ว่าง (จาก import): ${empties[0].cnt} รายการ`);
console.log('→ เมื่อ shop_name ว่าง, คอลัมน์ "ร้านค้า" จะ fallback ไปแสดง label = "— เจ้าของ (เบอร์)"');

console.log('\n=== ตัวอย่าง label ที่จะแสดง (3 แรกที่มีเบอร์) ===');
const sample = await sql`
    SELECT s.id, s.shop_name, s.owner_name, s.phone
    FROM shops s
    WHERE s.id >= 1764 AND s.phone IS NOT NULL AND s.phone != ''
    ORDER BY s.id LIMIT 3
`;
for (const s of sample) {
    const label = [s.shop_name || '', s.owner_name ? `— ${s.owner_name}` : '', s.phone ? `(${s.phone})` : ''].filter(x=>x).join(' ');
    console.log(`  id=${s.id}: label = "${label}"`);
}
