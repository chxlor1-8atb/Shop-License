// ทดลอง import เฉพาะ "ลำดับที่ 1" จาก Excel ตามรูปแบบที่กรอกในระบบแล้ว
// - shops.shop_name = '' (เว้นว่างเพราะ Excel ไม่มีชื่อร้าน)
// - หมายเหตุถ้าเป็นเบอร์โทร → shops.phone, ถ้าไม่ใช่ → ว่าง
// - custom field ใช้ custom_field_values table (เหมือนของเดิม) ไม่ใช่ JSONB
import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('DATABASE_URL ไม่พบใน .env.local');
    process.exit(1);
}
const sql = neon(DATABASE_URL);

const EXCEL_PATH = path.resolve('C:/Users/Admin/Downloads/อนุญาตจำหน่ายสินค้า_มาร์กสี (3).xlsx');

// custom_fields ที่มีอยู่ในระบบ: 127=จำนวนเงิน, 128=ประเภท
const CF_MONEY = 127;   // จำนวนเงิน
const CF_TYPE = 128;    // ประเภท
const LICENSE_TYPE_ID = 165; // ใบอนุญาตจำหน่ายสินค้าในที่หรือทางสาธารณะ

// ===== Thai Date → ISO (พ.ศ. → ค.ศ.) =====
function parseThaiDate(dateStr) {
    if (!dateStr || String(dateStr).trim() === '') return null;
    const str = String(dateStr).trim();
    const thaiMonths = {
        'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03',
        'เมษายน': '04', 'พฤษภาคม': '05', 'มิถุนายน': '06',
        'กรกฎาคม': '07', 'สิงหาคม': '08', 'กันยายน': '09',
        'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12'
    };
    const parts = str.split(/\s+/);
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = thaiMonths[parts[1]];
        let year = parseInt(parts[2]);
        if (month && !isNaN(year)) {
            year = year - 543;
            return `${year}-${month}-${day}`;
        }
    }
    console.warn(`แปลงวันที่ไม่ได้: "${dateStr}"`);
    return null;
}

function getStatus(expiryDate) {
    if (!expiryDate) return 'active';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate); expiry.setHours(0, 0, 0, 0);
    return expiry < today ? 'expired' : 'active';
}

// เบอร์โทรไทย: ตัวเลข 9-10 หลัก (อาจมีขีดก็ได้) — ใช้เช็คว่า col9 เป็นเบอร์หรือไม่
function looksLikePhone(s) {
    if (!s) return false;
    const digits = String(s).replace(/[^\d]/g, '');
    return /^\d{9,10}$/.test(digits);
}

async function main() {
    console.log('📖 อ่าน Excel...');
    const wb = XLSX.readFile(EXCEL_PATH);
    const sh = wb.Sheets['Sheet1'];
    const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });

    // row index 2 = ลำดับที่ 1
    const row = rows[2];
    const seq = row[0];
    const name = String(row[1]).trim();
    const business = String(row[2]).trim();          // กิจการ → ประเภท
    const issueDateRaw = row[3];
    const volume = row[4];
    const number = row[5];
    const expiryDateRaw = row[6];
    const tempSell = Number(row[7]) || 0;            // ขายชั่วคราว
    const permSellRaw = row[8];
    const permSell = String(permSellRaw).trim() === '' ? null : Number(permSellRaw); // ขายประจำ (อาจว่าง)
    const remark = String(row[9]).trim();            // หมายเหตุ → เช็คว่าเป็นเบอร์หรือไม่

    const issueDate = parseThaiDate(issueDateRaw);
    const expiryDate = parseThaiDate(expiryDateRaw);
    const status = getStatus(expiryDate);
    const licenseNumber = `${volume}/${number}`;

    // ข้อ 2: จำนวนเงิน = ขายประจำ (ถ้ามี) ไม่งั้นเอา ขายชั่วคราว
    const money = (permSell !== null && !isNaN(permSell)) ? permSell : tempSell;

    // shop_name: เว้นว่างเพราะ Excel ไม่มีชื่อร้าน
    const shopName = '';
    // phone: ถ้าหมายเหตุเป็นเบอร์โทร
    const phone = looksLikePhone(remark) ? remark : null;

    console.log('--- ข้อมูลที่จะ insert (ลำดับที่ 1) ---');
    console.log(`ชื่อ-สกุล: ${name}`);
    console.log(`กิจการ→ประเภท: ${business}`);
    console.log(`วันที่อนุญาต: ${issueDateRaw} → ${issueDate}`);
    console.log(`เล่ม/เลขที่: ${volume}/${number} → ${licenseNumber}`);
    console.log(`วันหมดอายุ: ${expiryDateRaw} → ${expiryDate}`);
    console.log(`ขายชั่วคราว: ${tempSell}, ขายประจำ: ${permSellRaw} → จำนวนเงิน: ${money}`);
    console.log(`หมายเหตุ: "${remark}" → phone: ${phone}`);
    console.log(`status: ${status}`);
    console.log('--------------------------------------');

    try {
        // ===== 1. shop =====
        const dupShop = await sql`
            SELECT id FROM shops WHERE owner_name = ${name} LIMIT 1
        `;
        let shopId;
        if (dupShop.length > 0) {
            shopId = dupShop[0].id;
            console.log(`⚠️ มี shop (owner="${name}") อยู่แล้ว id=${shopId} → ใช้ซ้ำ`);
        } else {
            const newShop = await sql`
                INSERT INTO shops (shop_name, owner_name, phone, notes)
                VALUES (${shopName}, ${name}, ${phone}, ${null})
                RETURNING id
            `;
            shopId = newShop[0].id;
            console.log(`✅ สร้าง shop id=${shopId} (owner="${name}")`);
        }

        // ===== 2. license =====
        const dupLic = await sql`
            SELECT id FROM licenses WHERE license_number = ${licenseNumber} LIMIT 1
        `;
        let licenseId;
        if (dupLic.length > 0) {
            licenseId = dupLic[0].id;
            console.log(`⚠️ มี license "${licenseNumber}" อยู่แล้ว id=${licenseId} → ข้าม insert license`);
        } else {
            const newLic = await sql`
                INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes)
                VALUES (${shopId}, ${LICENSE_TYPE_ID}, ${licenseNumber}, ${issueDate}, ${expiryDate}, ${status}, ${null})
                RETURNING id
            `;
            licenseId = newLic[0].id;
            console.log(`✅ สร้าง license id=${licenseId} (${licenseNumber})`);
        }

        // ===== 3. custom_field_values (จำนวนเงิน + ประเภท) =====
        // ลบของเก่าก่อน (กรณี re-run) แล้ว insert ใหม่
        await sql`DELETE FROM custom_field_values WHERE entity_id = ${licenseId} AND custom_field_id IN (${CF_MONEY}, ${CF_TYPE})`;

        await sql`
            INSERT INTO custom_field_values (custom_field_id, entity_id, field_value)
            VALUES (${CF_MONEY}, ${licenseId}, ${String(money)})
            ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET field_value = EXCLUDED.field_value
        `;
        console.log(`✅ custom_field: จำนวนเงิน = ${money}`);

        await sql`
            INSERT INTO custom_field_values (custom_field_id, entity_id, field_value)
            VALUES (${CF_TYPE}, ${licenseId}, ${business})
            ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET field_value = EXCLUDED.field_value
        `;
        console.log(`✅ custom_field: ประเภท = ${business}`);

        // ===== สรุป =====
        console.log('\n========== สรุปผล ==========');
        console.log(`shopId=${shopId} | owner="${name}"`);
        console.log(`licenseId=${licenseId} | ${licenseNumber}`);
        console.log(`วันที่ออก: ${issueDate} | หมดอายุ: ${expiryDate} | status: ${status}`);
        console.log(`จำนวนเงิน: ${money} | ประเภท: ${business}`);
        console.log('🎉 insert ลำดับที่ 1 สำเร็จ');
    } catch (err) {
        console.error('❌ error:', err);
        process.exit(1);
    }
}

main();
