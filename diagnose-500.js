console.log('Starting diagnosis script...');
require('dotenv').config({ path: '.env.local' });
console.log('Loaded environment variables.');

const { neon } = require('@neondatabase/serverless');

async function diagnose() {
    console.log('Checking DATABASE_URL...');
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing in .env.local');
        return;
    }
    console.log('DATABASE_URL is set (starts with ' + process.env.DATABASE_URL.substring(0, 15) + '...)');

    const sql = neon(process.env.DATABASE_URL);

    console.log('\n1. Checking custom_fields columns...');
    try {
        // Add a race with timeout
        const columnsPromise = sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'custom_fields'
        `;

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timed out after 5000ms')), 5000)
        );

        const columns = await Promise.race([columnsPromise, timeoutPromise]);

        console.log('custom_fields columns:', columns.map(c => c.column_name).join(', '));
    } catch (e) {
        console.error('Error checking custom_fields:', e.message);
        if (e.message.includes('timed out')) {
            console.error('⚠️ The database connection is timing out. Check your internet connection or if the database is paused.');
        }
    }

    console.log('\n2. Checking custom_field_values columns...');
    try {
        const columns = await sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'custom_field_values'
        `;
        console.log('custom_field_values columns:', columns.map(c => c.column_name).join(', '));
    } catch (e) {
        console.error('Error checking custom_field_values:', e.message);
    }

    console.log('\n3. Testing the failing query...');
    try {
        const entityType = 'license_types';
        // Simplified query from route.js
        const query = `
            SELECT 
                cfv.id,
                cfv.entity_id,
                cfv.field_value as value,
                cf.id as field_id,
                cf.field_name
            FROM custom_field_values cfv
            JOIN custom_fields cf ON cfv.custom_field_id = cf.id
            WHERE cf.entity_type = '${entityType}' AND cf.is_active = true
        `;

        const res = await sql(query);
        console.log('✅ Query executed successfully');
        console.log('Rows found:', res.length);
        if (res.length > 0) {
            console.log('Sample row:', res[0]);
        }
    } catch (e) {
        console.error('❌ Query failed:', e.message);
        // Hint at the error
        if (e.message.includes('does not exist')) {
            console.log('Hint: A column or table is missing.');
        }
    }
}

diagnose();
