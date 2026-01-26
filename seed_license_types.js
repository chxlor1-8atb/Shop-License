require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

const LICENSE_TYPES = [
    { name: 'สุรา', price: 1000, description: 'ใบอนุญาตจำหน่ายสุรา', validity_days: 365 },
    { name: 'ยาสูบ', price: 500, description: 'ใบอนุญาตจำหน่ายยาสูบ', validity_days: 365 },
    { name: 'ไพ่', price: 200, description: 'ใบอนุญาตจำหน่ายไพ่', validity_days: 365 },
    { name: 'สถานบริการ', price: 5000, description: 'ใบอนุญาตประกอบกิจการสถานบริการ', validity_days: 365 },
    { name: 'สะสมอาหาร', price: 300, description: 'ใบอนุญาตสะสมอาหาร', validity_days: 365 },
];

async function seed() {
    try {
        console.log('Starting seed...');

        // Check if types already exist
        const currentStatus = await sql`SELECT COUNT(*)::int as count FROM license_types`;
        console.log(`Current license_types count: ${currentStatus[0].count}`);

        if (currentStatus[0].count > 0) {
            console.log('Table license_types is not empty. Skipping seed.');
            return;
        }

        console.log('Seeding license_types...');
        for (const type of LICENSE_TYPES) {
            await sql`
        INSERT INTO license_types (name, price, description, validity_days)
        VALUES (${type.name}, ${type.price}, ${type.description}, ${type.validity_days})
      `;
            console.log(`Inserted: ${type.name}`);
        }

        console.log('Seed completed successfully.');
    } catch (err) {
        console.error('Seed failed:', err);
    }
}

seed();
