// Import ข้อมูลใบอนุญาตจาก Excel ทั้งหมด → Neon
//
// Mapping (ตามที่ user ยืนยัน):
//   1. ชื่อ-สกุล            → shops.owner_name
//   2. shop_name           → '' (ว่าง เพราะ Excel ไม่มีชื่อร้าน)
//   3. กิจการ              → custom field "ประเภท" (id 128)
//   4. เล่มที่/เลขที่        → licenses.license_number ("1/17")
//   5. วันที่อนุญาต/หมดอายุ → issue_date / expiry_date (พ.ศ.→ค.ศ.)
//   6. ขายประจำ (ถ้ามี) ไม่งั้น ขายชั่วคราว → custom field "จำนวนเงิน" (id 127) — เอาแค่ตัวเลข
//   7. หมายเหตุ            → shops.phone (ถ้าเป็นเบอร์โทรไทย 9-10 หลัก) ไม่งั้นเว้นว่าง
//   8. ชื่อตลาด            → ไม่เก็บ
//   9. license_type_id     → 165 (ใบอนุญาตจำหน่ายสินค้าในที่หรือทางสาธารณะ)
//  10. status              → คำนวณจาก expiry_date (เลยวันนี้ = expired)
//  11. duplicate           → เช็คแบบ realtime ด้วย composite key (license_number + owner_name)
//                            insert ทั้งหมด แม้ license_number ซ้ำกันในไฟล์ (เพราะเป็นคนต่างคน)
//
// Usage:
//   node scripts/import-all.mjs --dry-run   # ดูสรุปก่อน ไม่ insert จริง
//   node scripts/import-all.mjs             # insert จริง
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

const DRY_RUN = process.argv.includes('--dry-run');
const EXCEL_PATH = path.resolve('C:/Users/Admin/Downloads/อนุญาตจำหน่ายสินค้า_มาร์กสี (3).xlsx');

const LICENSE_TYPE_ID = 165;
const CF_MONEY = 127;   // จำนวนเงิน
const CF_TYPE = 128;    // ประเภท

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
    return null; // แปลงไม่ได้
}

function getStatus(expiryDate) {
    if (!expiryDate) return 'active';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate); expiry.setHours(0, 0, 0, 0);
    return expiry < today ? 'expired' : 'active';
}

// เบอร์โทรไทย 9-10 หลัก
function looksLikePhone(s) {
    if (!s) return false;
    const digits = String(s).replace(/[^\d]/g, '');
    return /^\d{9,10}$/.test(digits);
}

// ===== Composite duplicate key: license_number + owner_name =====
// เพื่อกัน import ซ้ำรอบ แต่ยังรองรับเลขที่ซ้ำของคนต่างคน
function dupKey(licenseNumber, ownerName) {
    return `${licenseNumber}||${ownerName}`;
}

// เก็บ shop cache เพื่อ reuse (owner_name+phone → shopId)
const shopCache = new Map();

async function findOrCreateShop(ownerName, phone) {
    const cacheKey = `${ownerName}|${phone || ''}`;
    if (shopCache.has(cacheKey)) return shopCache.get(cacheKey);

    // หา shop เดิมจาก owner_name + phone
    const found = await sql`
        SELECT id FROM shops
        WHERE owner_name = ${ownerName}
          AND COALESCE(phone, '') = ${phone || ''}
        ORDER BY id LIMIT 1
    `;
    if (found.length > 0) {
        shopCache.set(cacheKey, found[0].id);
        return found[0].id;
    }

    // สร้างใหม่
    const newShop = await sql`
        INSERT INTO shops (shop_name, owner_name, phone)
        VALUES ('', ${ownerName}, ${phone})
        RETURNING id
    `;
    shopCache.set(cacheKey, newShop[0].id);
    return newShop[0].id;
}

// เช็คว่า (license_number + owner_name) มีใน DB แล้วหรือยัง (realtime ทุกแถว)
async function isDuplicate(licenseNumber, ownerName) {
    const found = await sql`
        SELECT l.id FROM licenses l
        LEFT JOIN shops s ON l.shop_id = s.id
        WHERE l.license_number = ${licenseNumber}
          AND s.owner_name = ${ownerName}
        LIMIT 1
    `;
    return found.length > 0;
}

async function main() {
    console.log(`📖 อ่าน Excel... ${DRY_RUN ? '(DRY-RUN ไม่ insert จริง)' : '(INSERT จริง)'}`);
    const wb = XLSX.readFile(EXCEL_PATH);
    const sh = wb.Sheets['Sheet1'];
    const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });

    // row 0 = title, row 1 = header, row 2+ = data
    const dataRows = rows.slice(2).filter(r => r[0] !== '' && r[0] !== undefined);
    console.log(`📊 พบข้อมูล ${dataRows.length} แถว`);

    const stats = {
        total: dataRows.length,
        inserted: 0,
        skippedDuplicate: 0,
        skippedNoData: 0,
        dateParseWarn: 0,
        phoneSet: 0,
        dupNumShared: 0, // แถวที่เลขที่ซ้ำกับแถวอื่น (แต่ insert ได้เพราะคนต่างคน)
    };
    const sampleInserts = [];
    const warnings = [];

    // เก็บเลขที่ที่เห็นแล้ว เพื่อนับสถิติ "เลขที่ซ้ำ"
    const seenNumbers = new Map(); // licenseNumber → count

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const seq = row[0];
        const name = String(row[1] || '').replace(/\s+/g, ' ').trim();
        const business = String(row[2] || '').trim();
        const issueDateRaw = row[3];
        const volume = row[4];
        const number = row[5];
        const expiryDateRaw = row[6];
        const tempSell = Number(row[7]) || 0;
        const permSell = Number(row[8]) || 0;
        const remark = String(row[9] || '').trim();

        // ข้ามถ้าไม่มีชื่อ หรือไม่มีเลขที่
        if (!name || volume === '' || number === undefined || number === '') {
            stats.skippedNoData++;
            warnings.push(`แถว ${seq}: ข้อมูลไม่ครบ (name="${name}", vol=${volume}, num=${number})`);
            continue;
        }

        const issueDate = parseThaiDate(issueDateRaw);
        const expiryDate = parseThaiDate(expiryDateRaw);
        if (!issueDate || !expiryDate) stats.dateParseWarn++;

        const licenseNumber = `${volume}/${number}`;
        const status = getStatus(expiryDate);
        const money = permSell > 0 ? permSell : (tempSell > 0 ? tempSell : 0);
        const phone = looksLikePhone(remark) ? remark.replace(/[^\d]/g, '') : null;
        if (phone) stats.phoneSet++;

        // นับสถิติเลขที่ซ้ำ
        seenNumbers.set(licenseNumber, (seenNumbers.get(licenseNumber) || 0) + 1);

        // เช็ค duplicate (composite: license_number + owner_name) แบบ realtime
        if (await isDuplicate(licenseNumber, name)) {
            stats.skippedDuplicate++;
            continue;
        }

        if (DRY_RUN) {
            stats.inserted++;
            if (sampleInserts.length < 3) {
                sampleInserts.push({ seq, name, business, licenseNumber, issueDate, expiryDate, status, money, phone });
            }
            continue;
        }

        // ===== INSERT จริง =====
        try {
            const shopId = await findOrCreateShop(name, phone);

            const newLic = await sql`
                INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status)
                VALUES (${shopId}, ${LICENSE_TYPE_ID}, ${licenseNumber}, ${issueDate}, ${expiryDate}, ${status})
                RETURNING id
            `;
            const licenseId = newLic[0].id;

            await sql`
                INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value, updated_at)
                VALUES (${CF_MONEY}, ${licenseId}, 'licenses', ${String(money)}, NOW())
                ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()
            `;
            await sql`
                INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value, updated_at)
                VALUES (${CF_TYPE}, ${licenseId}, 'licenses', ${business}, NOW())
                ON CONFLICT (custom_field_id, entity_id) DO UPDATE SET field_value = EXCLUDED.field_value, updated_at = NOW()
            `;
            stats.inserted++;
        } catch (e) {
            warnings.push(`แถว ${seq}: insert ไม่ได้ (${e.message})`);
        }
    }

    // นับแถวที่เลขที่ซ้ำกับแถวอื่น (insert ได้ปกติ)
    for (const [, cnt] of seenNumbers) {
        if (cnt > 1) stats.dupNumShared += cnt; // แถวทั้งหมดที่ใช้เลขซ้ำ
    }

    // ===== สรุป =====
    console.log('\n========== สรุป ==========');
    console.log(`ทั้งหมดในไฟล์     : ${stats.total}`);
    console.log(`${DRY_RUN ? 'จะ insert' : 'insert แล้ว'}    : ${stats.inserted}`);
    console.log(`ข้าม (ซ้ำคนเดิม)  : ${stats.skippedDuplicate}`);
    console.log(`ข้าม (ข้อมูลไม่ครบ): ${stats.skippedNoData}`);
    console.log(`เบอร์โทรเก็บ      : ${stats.phoneSet}`);
    console.log(`วันที่แปลงไม่ได้   : ${stats.dateParseWarn}`);
    console.log(`แถวเลขที่ซ้ำ(คนต่างคน): ${stats.dupNumShared} แถว (insert ปกติ)`);

    if (sampleInserts.length > 0) {
        console.log('\n--- ตัวอย่างที่จะ insert (3 แรก) ---');
        for (const s of sampleInserts) {
            console.log(`  ลำดับ ${s.seq}: ${s.name} | ${s.business} | ${s.licenseNumber} | ${s.issueDate}→${s.expiryDate} | ${s.status} | เงิน=${s.money} | phone=${s.phone || '-'}`);
        }
    }

    if (warnings.length > 0) {
        console.log(`\n⚠️ คำเตือน (${warnings.length} รายการ):`);
        for (const w of warnings.slice(0, 20)) console.log(`  - ${w}`);
        if (warnings.length > 20) console.log(`  ... และอีก ${warnings.length - 20} รายการ`);
    }

    console.log(DRY_RUN ? '\n👀 DRY-RUN เสร็จ — รันอีกครั้งโดยไม่ใส่ --dry-run เพื่อ insert จริง' : '\n🎉 import เสร็จสิ้น');
}

main().catch(e => { console.error('❌', e); process.exit(1); });
