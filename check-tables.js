require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function checkTables() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        return;
    }

    try {
        const sql = neon(process.env.DATABASE_URL);

        console.log('Checking for custom_fields table...');
        try {
            await sql`SELECT count(*) FROM custom_fields`;
            console.log('✅ custom_fields table exists');
        } catch (e) {
            console.log('❌ custom_fields table missing or error:', e.message);
        }

        console.log('Checking for custom_field_values table...');
        try {
            await sql`SELECT count(*) FROM custom_field_values`;
            console.log('✅ custom_field_values table exists');
        } catch (e) {
            console.log('❌ custom_field_values table missing or error:', e.message);
        }

    } catch (err) {
        console.error('Connection failed:', err);
    }
}

checkTables();
