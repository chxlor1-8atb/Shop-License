import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ No DATABASE_URL found.");
    process.exit(1);
}

const sql = neon(DATABASE_URL);

// --- Data Generators ---

const firstNames = ['สมชาย', 'สมหญิง', 'วิชัย', 'สุชาติ', 'กานดา', 'ประวิทย์', 'มานะ', 'มานี', 'ปิติ', 'ชูใจ', 'วีระ', 'อารีย์', 'วรพล', 'นภา', 'กมล'];
const lastNames = ['ใจดี', 'รักชาติ', 'มีสุข', 'เจริญรุ่งเรือง', 'มั่งคั่ง', 'ศรีสวัสดี', 'ทองมี', 'เงินมา', 'สุขใจ', 'มั่นคง', 'พาณิชย์', 'การค้า', 'กิจเจริญ'];
const shopPrefixes = ['ร้าน', 'บริษัท', 'หจก.', 'โรงงาน', 'กิจการ', 'สวน'];
const shopNouns = ['รวมเจริญ', 'รุ่งเรือง', 'ถาวร', 'มั่นคง', 'ทรัพย์เจริญ', 'โชคชัย', 'วัฒนา', 'สยาม', 'ไทย', 'นคร', 'บุรี', 'ทอง', 'เงิน', 'เพชร'];
const roadNames = ['สุขุมวิท', 'เพชรบุรี', 'พหลโยธิน', 'วิภาวดี', 'ลาดพร้าว', 'รามคำแหง', 'บางนา-ตราด', 'พระราม 9', 'พระราม 4', 'เจริญกรุง'];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone() {
    return '08' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
}

function generateShop() {
    const owner = `${randomItem(firstNames)} ${randomItem(lastNames)}`;
    const shopName = `${randomItem(shopPrefixes)} ${randomItem(shopNouns)}${randomItem(shopNouns)} ${randomItem(['ค้าของเก่า', 'พาณิชย์', 'เทรดดิ้ง', 'บริการ', 'รีไซเคิล', ''])}`;
    const address = `${Math.floor(Math.random() * 999) + 1} ถ.${randomItem(roadNames)} แขวง${randomItem(roadNames)} เขต${randomItem(roadNames)} กทม.`;

    return {
        shop_name: shopName.trim(),
        owner_name: owner,
        address: address,
        phone: randomPhone(),
        email: `contact${Math.floor(Math.random() * 1000)}@example.com`
    };
}

async function main() {
    try {
        console.log('🌱 Seeding LARGE realistic data set...');

        // 1. Insert License Types
        console.log('Checking/Inserting License Types...');
        const types = [
            { name: 'ใบอนุญาตขายของเก่า', description: 'สำหรับผู้ประกอบกิจการค้าของเก่า ตามกฎหมายว่าด้วยการควบคุมการขายทอดตลาดและค้าของเก่า', validity_days: 365 },
            { name: 'ใบอนุญาตสถานบริการ', description: 'สำหรับสถานบริการ ตามพระราชบัญญัติสถานบริการ', validity_days: 365 },
            { name: 'ใบอนุญาตสะสมอาหาร', description: 'สำหรับสถานที่สะสมอาหาร พื้นที่เกิน 200 ตร.ม.', validity_days: 365 },
            { name: 'ใบอนุญาตจำหน่ายสินค้าในที่สาธารณะ', description: 'สำหรับการจำหน่ายสินค้าในที่หรือทางสาธารณะ', validity_days: 365 },
            { name: 'ใบอนุญาตประกอบกิจการที่เป็นอันตรายต่อสุขภาพ', description: 'กิจการที่อาจก่อให้เกิดเหตุรำคาญ', validity_days: 365 }
        ];

        let typeIds = [];

        for (const t of types) {
            const existing = await sql`SELECT id FROM license_types WHERE name = ${t.name} LIMIT 1`;
            if (existing.length > 0) {
                typeIds.push(existing[0].id);
            } else {
                const res = await sql`
                    INSERT INTO license_types (name, description, validity_days) 
                    VALUES (${t.name}, ${t.description}, ${t.validity_days})
                    RETURNING id
                `;
                typeIds.push(res[0].id);
            }
        }
        console.log(`Verified ${typeIds.length} license types.`);

        // 2. Generate and Insert Shops (Target 50 shops)
        console.log('Generating 50 Shops...');
        let shopIds = [];

        // Generate batch of 50
        for (let i = 0; i < 50; i++) {
            const s = generateShop();
            const res = await sql`
                INSERT INTO shops (shop_name, owner_name, address, phone, email) 
                VALUES (${s.shop_name}, ${s.owner_name}, ${s.address}, ${s.phone}, ${s.email})
                RETURNING id
            `;
            shopIds.push(res[0].id);
            if (i % 10 === 0) process.stdout.write('.');
        }
        console.log('\n✅ Created 50 shops.');

        // 3. Generate Licenses
        console.log('Generating Licenses for Shops...');

        const today = new Date();
        const oneDay = 24 * 60 * 60 * 1000;

        let licenseCount = 0;

        for (const shopId of shopIds) {
            // Each shop gets 1-3 licenses
            const numLicenses = Math.floor(Math.random() * 3) + 1;

            for (let j = 0; j < numLicenses; j++) {
                const typeId = randomItem(typeIds);

                // Determine status and dates randomly to visualize dashboard
                const rand = Math.random();
                let status = 'active';
                let daysOffset = 0; // Days from today for expiry
                let note = '';

                if (rand < 0.1) {
                    // 10% Expired
                    status = 'expired';
                    daysOffset = - Math.floor(Math.random() * 60) - 1; // Expired 1-60 days ago
                    note = 'ขาดต่ออายุ';
                } else if (rand < 0.3) {
                    // 20% Expiring Soon (within 30 days)
                    status = 'active';
                    daysOffset = Math.floor(Math.random() * 29) + 1; // Expiring in 1-29 days
                    note = 'ใกล้หมดอายุ รีบดำเนินการ';
                } else {
                    // 70% Active (Good for > 30 days)
                    status = 'active';
                    daysOffset = Math.floor(Math.random() * 300) + 31; // Expiring in 31-330 days
                }

                const expiryDate = new Date(today.getTime() + (daysOffset * oneDay));
                const issueDate = new Date(expiryDate.getTime() - (365 * oneDay));

                // Format YYYY-MM-DD
                const expiryStr = expiryDate.toISOString().split('T')[0];
                const issueStr = issueDate.toISOString().split('T')[0];

                // License Number format: TYPE-XXXX/YYYY
                const year = new Date().getFullYear() + 543; // Buddhist Eraish
                const runNum = Math.floor(Math.random() * 9000) + 1000;
                const licNum = `${randomItem(['A', 'B', 'C'])}-${runNum}/${year.toString().substr(2)}`;

                await sql`
                    INSERT INTO licenses (shop_id, license_type_id, license_number, issue_date, expiry_date, status, notes) 
                    VALUES (${shopId}, ${typeId}, ${licNum}, ${issueStr}, ${expiryStr}, ${status}, ${note})
                `;
                licenseCount++;
            }
            if (licenseCount % 10 === 0) process.stdout.write('.');
        }

        console.log(`\n✅ Created ${licenseCount} licenses.`);

        // 4. Generate Audit Logs
        console.log('Generating Audit Logs...');

        // Get Users
        const users = await sql`SELECT id FROM users`;
        const userIds = users.map(u => u.id);

        // If no users, create one or skip
        if (userIds.length === 0) {
            console.log('No users found. Skipping audit logs.');
        } else {
            const actions = ['LOGIN', 'CREATE', 'UPDATE', 'DELETE'];
            const entities = ['LICENSE', 'SHOP', 'USER'];

            for (let i = 0; i < 50; i++) { // Generate 50 logs
                const userId = userIds[Math.floor(Math.random() * userIds.length)];
                const action = actions[Math.floor(Math.random() * actions.length)];
                const entity = entities[Math.floor(Math.random() * entities.length)];
                const entityId = Math.floor(Math.random() * 100) + 1;

                // Random time in last 7 days
                const date = new Date(today.getTime() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000));

                await sql`
                    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, created_at)
                    VALUES (${userId}, ${action}, ${entity}, ${entityId}, 'System generated log', '192.168.1.1', ${date.toISOString()})
                `;
            }
            console.log('✅ Generated 50 audit logs.');
        }
        console.log('🎉 Seed Complete! Admin user: admin / 1234 (ensure you ran reset-password.js if needed)');

    } catch (err) {
        console.error('❌ Error seeding data:', err);
    }
}

main();
