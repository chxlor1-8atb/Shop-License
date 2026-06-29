import XLSX from 'xlsx';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
}

const sql = neon(DATABASE_URL);

// ===== Excel Config =====
const EXCEL_PATH = path.resolve('C:\\Users\\Admin\\Downloads\\อนุญาตจำหน่ายสินค้า_มาร์กสี (3).xlsx');
const DATA_START_ROW = 2; // Row index 2 = ลำดับที่ 1 (0-based, header row = index 1)

// ข้อ 4: ชื่อตลาดใส่ใน description/notes ของ license
const MARKET_NAME = 'ตลาดถมหมืด - ถมมอ';

// ===== Thai Date Parser =====
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
    
    console.warn(`⚠️ Cannot parse date: "${dateStr}"`);
    return null;
}

// ===== Determine license status from expiry date =====
function getStatus(expiryDate) {
    if (!expiryDate) return 'active';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    
    if (expiry < today) return 'expired';
    return 'active';
}

// ===== Main Import =====
async function main() {
    console.log('📖 Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets['Sheet1'];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // Row 0 = title, Row 1 = headers, Row 2+ = data
    const headers = rows[1];
    console.log('📋 Headers:', headers);
    console.log('📊 Total data rows:', rows.length - 2);
    
    // ===== STEP 1: Use existing license type =====
    // ข้อ 1: ใช้ประเภท "ใบอนุญาตจำหน่ายสินค้าในที่หรือทางสาธารณะ" ที่มีอยู่แล้ว
    console.log('\n🔧 Step 1: Finding existing license type...');
    const existingType = await sql`
        SELECT id, name FROM license_types 
        WHERE name = ${'ใบอนุญาตจำหน่ายสินค้าในที่หรือทางสาธารณะ'}
        LIMIT 1
    `;
    
    let licenseTypeId;
    if (existingType.length > 0) {
        licenseTypeId = existingType[0].id;
        console.log(`✅ Found existing license type: id=${licenseTypeId} "${existingType[0].name}"`);
    } else {
        console.error('❌ License type "ใบอนุญาตจำหน่ายสินค้าในที่หรือทางสาธารณะ" not found!');
        process.exit(1);
    }
    
    // ===== STEP 2: Import Row 1 (TEST) =====
    console.log('\n🧪 Step 2: Testing import with row #1 only...');
    
    const row = rows[DATA_START_ROW]; // Row index 2 = ลำดับที่ 1
    
    const seq = row[0];       // ลำดับ
    const name = String(row[1]).trim();   // ชื่อ-สกุล
    const business = String(row[2]).trim(); // กิจการ
    const issueDateRaw = row[3]; // วันที่อนุญาต
    const volume = row[4];    // เล่มที่
    const number = row[5];    // เลขที่
    const expiryDateRaw = row[6]; // วันหมดอายุ
    const tempSell = row[7];  // ขายชั่วคราว
    const permSell = row[8];  // ขายประจำ
    const remark = String(row[9]).trim(); // หมายเหตุ
    
    console.log('---');
    console.log(`ลำดับ: ${seq}`);
    console.log(`ชื่อ-สกุล: ${name}`);
    console.log(`กิจการ: ${business}`);
    console.log(`วันที่อนุญาต: ${issueDateRaw} → ${parseThaiDate(issueDateRaw)}`);
    console.log(`เล่มที่: ${volume}, เลขที่: ${number}`);
    console.log(`วันหมดอายุ: ${expiryDateRaw} → ${parseThaiDate(expiryDateRaw)}`);
    console.log(`ขายชั่วคราว: ${tempSell}, ขายประจำ: ${permSell}`);
    console.log(`หมายเหตุ: ${remark}`);
    console.log('---');
    
    const issueDate = parseThaiDate(issueDateRaw);
    const expiryDate = parseThaiDate(expiryDateRaw);
    const status = getStatus(expiryDate);
    
    // ข้อ 3: เล่มที่/เลขที่ รูปแบบ "1/17"
    const licenseNumber = `${volume}/${number}`;
    
    // Shop name: กิจการ (ชื่อเจ้าของ)
    const shopName = business || name;
    
    // ข้อ 2: จำนวนเงิน = ขายชั่วคราว + ขายประจำ
    // Notes: ตลาดถมหมืด - ถมมอ + หมายเหตุ
    const notesParts = [];
    notesParts.push(MARKET_NAME); // ข้อ 4: ใส่ชื่อตลาด
    if (remark) notesParts.push(remark);
    const notes = notesParts.join(', ');
    
    // Custom fields JSON — ข้อ 2: ขายชั่วคราว/ประจำ → จำนวนเงิน
    const customFields = {
        จำนวนเงิน: String(permSell || 0),
        ขายชั่วคราว: String(tempSell || 0),
    };
    
    try {
        // Check duplicate shop
        const existingShop = await sql`
            SELECT id FROM shops 
            WHERE shop_name = ${shopName} AND owner_name = ${name}
            LIMIT 1
        `;
        
        let shopId;
        if (existingShop.length > 0) {
            shopId = existingShop[0].id;
            console.log(`⚠️ Shop already exists (id=${shopId}), reusing...`);
        } else {
            // Insert shop
            const newShop = await sql`
                INSERT INTO shops (shop_name, owner_name, notes, custom_fields)
                VALUES (${shopName}, ${name}, ${notes}, ${JSON.stringify(customFields)})
                RETURNING id
            `;
            shopId = newShop[0].id;
            console.log(`✅ Created shop: id=${shopId}`);
        }
        
        // Check duplicate license
        const existingLic = await sql`
            SELECT id FROM licenses 
            WHERE license_number = ${licenseNumber}
            LIMIT 1
        `;
        
        if (existingLic.length > 0) {
            console.log(`⚠️ License "${licenseNumber}" already exists (id=${existingLic[0].id}), skipping...`);
        } else {
            // Insert license
            const newLic = await sql`
                INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes, custom_fields)
                VALUES (${shopId}, ${licenseTypeId}, ${licenseNumber}, ${issueDate}, ${expiryDate}, ${status}, ${notes}, ${JSON.stringify(customFields)})
                RETURNING id
            `;
            console.log(`✅ Created license: id=${newLic[0].id}`);
        }
        
        // ===== Summary =====
        console.log('\n===== ผลลัพธ์ =====');
        console.log(`ประเภทใบอนุญาต: id=${licenseTypeId} (ใบอนุญาตจำหน่ายสินค้าในที่หรือทางสาธารณะ)`);
        console.log(`ร้านค้า: "${shopName}" — เจ้าของ: "${name}"`);
        console.log(`เลขที่ใบอนุญาต: "${licenseNumber}" (เล่ม ${volume}/${number})`);
        console.log(`วันที่ออก: ${issueDate}`);
        console.log(`วันหมดอายุ: ${expiryDate}`);
        console.log(`สถานะ: ${status}`);
        console.log(`จำนวนเงิน (custom_fields): ${permSell || 0}`);
        console.log(`ขายชั่วคราว (custom_fields): ${tempSell || 0}`);
        console.log(`หมายเหตุ (notes): ${notes}`);
        console.log('\n🎉 Test import SUCCESS! Row #1 imported correctly.');
        
    } catch (err) {
        console.error('❌ Import error:', err);
    }
}

main();
