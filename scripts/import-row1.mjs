// Import เฉพาะ "ลำดับที่ 1" จาก Excel เพื่อทดสอบก่อน
// Mapping ตามรูปแบบข้อมูลเดิมในระบบ:
//   - shop_name = ชื่อตลาด (จากหัวไฟล์)
//   - owner_name = ชื่อ-สกุล
//   - license_number = "เล่มที่/เลขที่" (เช่น 1/17)
//   - custom field "ประเภท" = กิจการ (col กิจการ)
//   - custom field "จำนวนเงิน" = ขายประจำ (ถ้ามี) ไม่งั้นเอา ขายชั่วคราว (เอาแค่ตัวเลข)
import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL ไม่พบใน .env.local');
    process.exit(1);
}
const sql = neon(DATABASE_URL);

const EXCEL_PATH = path.resolve('C:/Users/Admin/Downloads/อนุญาตจำหน่ายสินค้า_มาร์กสี (3).xlsx');
const MARKET_NAME = 'ตลาดถมหมืด - ถมมอ'; // ข้อ 4: ชื่อตลาด → shop_name

const LICENSE_TYPE_ID = 165; // ใบอนุญาตจำหน่ายสินค้าในที่หรือทางสาธารณะ
const CF_MONEY = 127;        // custom field "จำนวนเงิน"
const CF_TYPE = 128;         // custom field "ประเภท"

// ===== แปลงวันที่ไทย (พ.ศ.) → ISO (ค.ศ.) =====
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
        const year = parseInt(parts[2], 10);
        if (month && !isNaN(year)) {
            return `${year - 543}-${month}-${day}`;
        }
    }
    console.warn(`⚠️ แปลงวันที่ไม่ได้: "${dateStr}"`);
    return null;
}

function getStatus(expiryDate) {
    if (!expiryDate) return 'active';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate); expiry.setHours(0, 0, 0, 0);
    return expiry < today ? 'expired' : 'active';
}

async function main() {
    console.log('📖 อ่าน Excel...');
    const wb = XLSX.readFile(EXCEL_PATH);
    const sh = wb.Sheets['Sheet1'];
    const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });

    // row index 2 = ลำดับที่ 1 (row 0 = title, row 1 = header)
    const row = rows[2];
    const name = String(row[1]).replace(/\s+/g, ' ').trim();       // ชื่อ-สกุล
    const business = String(row[2]).trim();                         // กิจการ → ประเภท
    const issueDateRaw = row[3];
    const volume = row[4];
    const number = row[5];
    const expiryDateRaw = row[6];
    const tempSell = Number(row[7]) || 0;                           // ขายชั่วคราว
    const permSell = Number(row[8]) || 0;                           // ขายประจำ

    const issueDate = parseThaiDate(issueDateRaw);
    const expiryDate = parseThaiDate(expiryDateRaw);
    const status = getStatus(expiryDate);
    const licenseNumber = `${volume}/${number}`;                    // ข้อ 3: "1/17"

    // ข้อ 2: จำนวนเงิน = ขายประจำ (ถ้ามี) ไม่งั้นเอา ขายชั่วคราว (เอาแค่ตัวเลข ไม่เอาคำว่าขาย...)
    const money = permSell > 0 ? permSell : (tempSell > 0 ? tempSell : 0);

    console.log('--- ข้อมูลลำดับที่ 1 (ที่จะ insert) ---');
    console.log(`ชื่อ-สกุล (owner_name) : ${name}`);
    console.log(`ตลาด (shop_name)      : ${MARKET_NAME}`);
    console.log(`กิจการ→ประเภท (cf 128) : ${business}`);
    console.log(`เลขที่ (license_number): ${licenseNumber}`);
    console.log(`วันที่อนุญาต          : ${issueDateRaw} → ${issueDate}`);
    console.log(`วันหมดอายุ            : ${expiryDateRaw} → ${expiryDate}`);
    console.log(`สถานะ                : ${status}`);
    console.log(`ขายประจำ=${permSell}, ขายชั่วคราว=${tempSell} → จำนวนเงิน (cf 127): ${money}`);
    console.log('------------------------------------------');

    try {
        // ===== 1. shop =====
        const dupShop = await sql`
            SELECT id FROM shops
            WHERE shop_name = ${MARKET_NAME} AND owner_name = ${name}
            LIMIT 1
        `;
        let shopId;
        if (dupShop.length > 0) {
            shopId = dupShop[0].id;
            console.log(`⚠️ มี shop นี้อยู่แล้ว id=${shopId} → ใช้ซ้ำ`);
        } else {
            const newShop = await sql`
                INSERT INTO shops (shop_name, owner_name)
                VALUES (${MARKET_NAME}, ${name})
                RETURNING id
            `;
            shopId = newShop[0].id;
            console.log(`✅ สร้าง shop id=${shopId}`);
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
                INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status)
                VALUES (${shopId}, ${LICENSE_TYPE_ID}, ${licenseNumber}, ${issueDate}, ${expiryDate}, ${status})
                RETURNING id
            `;
            licenseId = newLic[0].id;
            console.log(`✅ สร้าง license id=${licenseId} (${licenseNumber})`);
        }

        // ===== 3. custom_field_values (entity_type = 'licenses' ตาม schema) =====
        await sql`
            DELETE FROM custom_field_values
            WHERE entity_id = ${licenseId}
              AND entity_type = 'licenses'
              AND custom_field_id IN (${CF_MONEY}, ${CF_TYPE})
        `;
        await sql`
            INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value, updated_at)
            VALUES (${CF_MONEY}, ${licenseId}, 'licenses', ${String(money)}, NOW())
            ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()
        `;
        console.log(`✅ custom field "จำนวนเงิน" = ${money}`);

        await sql`
            INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value, updated_at)
            VALUES (${CF_TYPE}, ${licenseId}, 'licenses', ${business}, NOW())
            ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()
        `;
        console.log(`✅ custom field "ประเภท" = ${business}`);

        // ===== สรุป =====
        console.log('\n========== สรุปผลลัพธ์ ==========');
        console.log(`shopId=${shopId} | "${MARKET_NAME}" / owner="${name}"`);
        console.log(`licenseId=${licenseId} | ${licenseNumber}`);
        console.log(`วันออก: ${issueDate} | หมดอายุ: ${expiryDate} | status: ${status}`);
        console.log(`จำนวนเงิน: ${money} | ประเภท: ${business}`);
        console.log('🎉 นำเข้าลำดับที่ 1 สำเร็จ');
    } catch (err) {
        console.error('❌ error:', err);
        process.exit(1);
    }
}

main();
