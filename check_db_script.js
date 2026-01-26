require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function run() {
    try {
        console.log('--- Checking License Types ---');
        const types = await sql`SELECT id, name FROM license_types`;
        console.log(JSON.stringify(types, null, 2));

        console.log('\n--- Checking Shops (First 3) ---');
        const shops = await sql`SELECT id, shop_name FROM shops LIMIT 3`;
        console.log(JSON.stringify(shops, null, 2));
    } catch (err) {
        console.error('Error:', err);
    }
}

run();
