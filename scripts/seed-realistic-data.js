
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Configuration
const SHOP_COUNT = 30; // Number of shops to generate
const LICENSE_PER_SHOP_MIN = 1;
const LICENSE_PER_SHOP_MAX = 3;

// Dataset for generation
const THAI_FIRST_NAMES = ['สมชาย', 'สมศรี', 'วิชัย', 'ธนพล', 'กานดา', 'ประวิทย์', 'สุดา', 'มงคล', 'วันเพ็ญ', 'อารี', 'สุรศักดิ์', 'นิภา', 'วีระ', 'สมศักดิ์', 'พรทิพย์', 'อำนาจ', 'รัตนา', 'วิไล', 'สมบูรณ์', 'สุชาติ'];
const THAI_LAST_NAMES = ['ใจดี', 'รักชาติ', 'มีสุข', 'สุขใจ', 'เจริญรุ่งเรือง', 'มั่นคง', 'สมบูรณ์', 'รักษ์ไทย', 'ศรีสวัสดิ์', 'วงศ์สวัสดิ์', 'ทองมี', 'มีทรัพย์', 'จันทร์เพ็ญ', 'แสงทอง', 'รุ่งเรือง', 'คงกระพัน', 'ยอดเยี่ยม', 'ดีจริง'];
const SHOP_PREFIXES = ['ร้าน', 'หจก.', 'บจก.', 'กิจการ', 'โรงงาน'];
const SHOP_NAMES = ['สมบูรณ์การค้า', 'เจริญพานิชย์', 'รุ่งเรืองบริการ', 'มินิมาร์ท 24 ชม.', 'ครัวคุณต้อย', 'กาแฟโบราณลุงดำ', 'สยามวัสดุก่อสร้าง', 'อู่ช่างวิชิต', 'คลินิกทันตกรรมยิ้มสวย', 'ร้านยาเภสัชชุมชน', 'ตลาดสดเทศบาล', 'ขนมไทยแม่นงนุช', 'คาร์แคร์สะอาดยิ่ง', 'โรงน้ำแข็งใส', 'ฟาร์มไก่ไข่สุขสันต์', 'ร้านอาหารตามสั่งป้าแดง', 'โชห่วยยายเมี้ยน', 'คาเฟ่แมวน่ารัก', 'ร้านซ่อมมอเตอร์ไซค์พี่หนุ่ม', 'สำนักงานบัญชีแม่นยำ'];
const STREETS = ['ถ.สุขุมวิท', 'ถ.พหลโยธิน', 'ถ.เพชรเกษม', 'ถ.วิภาวดีรังสิต', 'ถ.ลาดพร้าว', 'ถ.รามคำแหง', 'ถ.แจ้งวัฒนะ', 'ซ.สุขสวัสดิ์', 'ซ.เจริญกรุง'];
const DISTRICTS = ['เมือง', 'บางละมุง', 'ศรีราชา', 'สัตหีบ', 'พานทอง', 'บ้านบึง', 'หนองใหญ่'];
const PROVINCE = 'ชลบุรี'; // Assuming a local system context

// License Types Data
const LICENSE_TYPES_SEED = [
    { name: 'ใบอนุญาตจำหน่ายสุรา ประเภทที่ 2', description: 'สำหรับร้านค้าปลีกที่จำหน่ายสุรา', price: 500, validity_days: 365 },
    { name: 'ใบอนุญาตจำหน่ายยาสูบ', description: 'สำหรับร้านค้าที่จำหน่ายยาสูบ', price: 100, validity_days: 365 },
    { name: 'ใบอนุญาตจัดตั้งสถานที่จำหน่ายอาหาร', description: 'สำหรับร้านอาหาร พื้นที่เกิน 200 ตร.ม.', price: 3000, validity_days: 365 },
    { name: 'หนังสือรับรองการแจ้งจัดตั้งสถานที่จำหน่ายอาหาร', description: 'สำหรับร้านอาหาร พื้นที่ไม่เกิน 200 ตร.ม.', price: 1000, validity_days: 365 },
    { name: 'ใบอนุญาตประกอบกิจการที่เป็นอันตรายต่อสุขภาพ', description: 'เช่น อู่ซ่อมรถ, ฟาร์มเลี้ยงสัตว์', price: 5000, validity_days: 365 },
    { name: 'ใบอนุญาตสะสมอาหาร', description: 'สำหรับโกดังเก็บสินค้าอาหาร', price: 2500, validity_days: 365 }
];

// Helper Functions
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const generatePhone = () => `0${randomInt(6, 9)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}`;
const generateTaxId = () => `${randomInt(1, 9)}${randomInt(1000, 9999)}${randomInt(10000, 99999)}${randomInt(10, 99)}${randomInt(1, 9)}`;

// Database Logic
async function seedRequests() {
    console.log('🌱 Starting realistic data seeding...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing in .env.local');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Upsert License Types
        console.log('📚 Seeding License Types...');
        const typeIds = [];
        for (const type of LICENSE_TYPES_SEED) {
            const res = await client.query(`
                INSERT INTO license_types (name, description, price, validity_days)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT DO NOTHING
                RETURNING id;
            `, [type.name, type.description, type.price, type.validity_days]);

            if (res.rows.length > 0) {
                typeIds.push(res.rows[0].id);
            } else {
                // Fetch existing ID if conflict
                const existing = await client.query('SELECT id FROM license_types WHERE name = $1', [type.name]);
                if (existing.rows.length > 0) typeIds.push(existing.rows[0].id);
            }
        }

        // Fetch all type IDs to be sure
        const allTypes = await client.query('SELECT id, name, validity_days FROM license_types');
        const typeList = allTypes.rows;

        // 2. Generate Shops
        console.log(`🏪 Generating ${SHOP_COUNT} Shops...`);
        const shopIds = [];
        for (let i = 0; i < SHOP_COUNT; i++) {
            const shopName = `${randomElement(SHOP_PREFIXES)} ${randomElement(SHOP_NAMES)} ${randomInt(1, 99)}`;
            const ownerName = `${randomElement(THAI_FIRST_NAMES)} ${randomElement(THAI_LAST_NAMES)}`;
            const address = `${randomInt(1, 999)} หมู่ ${randomInt(1, 15)} ${randomElement(STREETS)} ต.${randomElement(DISTRICTS)} อ.${randomElement(DISTRICTS)} จ.${PROVINCE} ${randomInt(20000, 20200)}`;
            const phone = generatePhone();
            const email = `shop${randomInt(1000, 9999)}@example.com`;

            // Random custom fields for implementation_details
            const customFields = process.env.DATABASE_URL.includes('neon') ? {} : JSON.stringify({}); // If using JSON column directly in query params, pg handles object to jsonb automatically often, but let's be safe.
            // Actually pg driver handles simple objects for jsonb

            const res = await client.query(`
                INSERT INTO shops (shop_name, owner_name, address, phone, email, notes, custom_fields)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id;
            `, [shopName, ownerName, address, phone, email, 'Generated data', {}]);

            shopIds.push(res.rows[0].id);
        }

        // 2.5 Fetch Custom Fields for Licenses
        console.log('📋 Fetching Custom Field Definitions...');
        const cfRes = await client.query("SELECT id, field_name FROM custom_fields WHERE entity_type = 'licenses' AND is_active = true");
        const customFieldDefs = cfRes.rows;

        // 3. Generate Licenses for each Shop
        console.log(`📄 Generating Licenses for shops...`);
        let licenseCount = 0;
        for (const shopId of shopIds) {
            const numLicenses = randomInt(LICENSE_PER_SHOP_MIN, LICENSE_PER_SHOP_MAX);

            for (let j = 0; j < numLicenses; j++) {
                const type = randomElement(typeList);
                const licenseNumber = `${randomInt(60, 68)}/${randomInt(1000, 9999)}`;

                // Date logic
                const statusChance = Math.random();
                let status = 'active';
                let issueDate = new Date();
                let expiryDate = new Date();

                if (statusChance < 0.1) {
                    status = 'expired';
                    issueDate.setFullYear(issueDate.getFullYear() - 2);
                    expiryDate.setFullYear(expiryDate.getFullYear() - 1);
                } else if (statusChance < 0.2) {
                    status = 'active';
                    issueDate.setFullYear(issueDate.getFullYear() - 1);
                    expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + randomInt(1, 20));
                } else {
                    status = 'active';
                    issueDate.setMonth(issueDate.getMonth() - randomInt(1, 6));
                    expiryDate = new Date(issueDate);
                    expiryDate.setDate(expiryDate.getDate() + type.validity_days);
                }

                const licRes = await client.query(`
                    INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id
                `, [shopId, type.id, licenseNumber, issueDate, expiryDate, status, 'Auto-generated']);

                const newLicenseId = licRes.rows[0].id;
                licenseCount++;

                // Populate Custom Fields
                for (const def of customFieldDefs) {
                    let val = '';
                    switch (def.field_name) {
                        case 'cf_amount': val = (randomInt(1, 50) * 100).toString(); break;
                        case 'cf_area_sqm': val = randomInt(20, 500).toString(); break;
                        case 'cf_area_hp': val = randomInt(5, 100).toString(); break;
                        case 'cf_selling_location': val = randomElement(['หน้าร้าน', 'ตลาดนัด', 'ออนไลน์', 'บูธกิจกรรม']); break;
                        case 'cf_contact_person': val = `${randomElement(THAI_FIRST_NAMES)} ${randomElement(THAI_LAST_NAMES)}`; break;
                        case 'cf_payment_status': val = randomElement(['ชำระแล้ว', 'รอชำระ', 'ค้างชำระ']); break;
                        default: val = '-';
                    }

                    // Skip standard fields present in custom_fields table (like shop_id, etc if any)
                    // The query above fetches all. But strict custom fields usually start with cf_ or aren't standard cols.
                    // Based on previous `custom_fields` output, standard cols like 'shop_id' are in there too (as system fields?).
                    // We should ONLY insert for fields that require separate storage or if UI expects it.
                    // Actually, for "system fields" (is_system_field=false?? No, previous output showed shop_id as is_system_field=false but valid).
                    // Wait, previous output showed: "field_name": "shop_id" ... "is_system_field": false. 
                    // This implies the system treats them as configurable cols.
                    // BUT they map to actual DB columns. 
                    // 'custom_field_values' table is usually for EXTRA fields not in main table.
                    // If we insert 'shop_id' into 'custom_field_values', it might be redundant or display double.
                    // Let's check usually: valid identifiers like 'cf_abc' are definitely custom. 
                    // Standard cols: shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes.
                    // We should SKIP inserting these into custom_field_values table.

                    const standardCols = ['shop_id', 'license_type_id', 'license_number', 'issue_date', 'expiry_date', 'status', 'notes', 'id', 'created_at', 'updated_at'];
                    if (standardCols.includes(def.field_name)) continue;

                    await client.query(`
                        INSERT INTO custom_field_values (custom_field_id, entity_id, entity_type, field_value)
                        VALUES ($1, $2, 'licenses', $3)
                    `, [def.id, newLicenseId, val]);
                }
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Success! Created/Updated ${typeList.length} license types, ${SHOP_COUNT} shops, and ${licenseCount} licenses.`);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding data:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seedRequests();
