require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function checkSchema() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        return;
    }

    try {
        const sql = neon(process.env.DATABASE_URL);

        console.log('--- custom_fields columns ---');
        const cfColumns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'custom_fields';
        `;
        console.table(cfColumns);

        console.log('\n--- custom_field_values columns ---');
        const cfvColumns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'custom_field_values';
        `;
        console.table(cfvColumns);

    } catch (err) {
        console.error('Connection failed:', err);
    }
}

checkSchema();
