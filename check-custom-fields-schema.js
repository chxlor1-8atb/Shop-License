require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function check() {
    console.log('Checking schema...');
    try {
        const columns = await sql`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('custom_fields', 'custom_field_values', 'shops', 'licenses')
            ORDER BY table_name, ordinal_position;
        `;
        console.table(columns);
    } catch (e) {
        console.error(e);
    }
}

check();
