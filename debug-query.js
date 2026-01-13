require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function debugQuery() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        return;
    }

    try {
        const sql = neon(process.env.DATABASE_URL);

        console.log('Testing specific query for license_types...');

        const entityType = 'license_types';

        try {
            const result = await sql`
                SELECT 
                    cfv.id,
                    cfv.entity_id,
                    cfv.value,
                    cf.id as field_id,
                    cf.field_name
                FROM custom_field_values cfv
                JOIN custom_fields cf ON cfv.field_id = cf.id
                WHERE cf.entity_type = ${entityType} AND cf.is_active = true
            `;
            console.log('✅ Query successful. Rows:', result.length);
            console.log('Sample row:', result[0]);
        } catch (e) {
            console.log('❌ Query failed:', e.message);
            console.log('Error details:', e);
        }

    } catch (err) {
        console.error('Connection failed:', err);
    }
}

debugQuery();
