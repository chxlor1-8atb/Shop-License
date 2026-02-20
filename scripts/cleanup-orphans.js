
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function cleanup() {
    console.log('🧹 Starting cleanup of orphaned custom field values...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is missing in .env.local');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();

        console.log('🔌 Connected to database.');

        // 1. Cleanup values for deleted Licenses
        console.log('🔍 Checking for orphaned License data...');
        const licensesResult = await client.query(`
            DELETE FROM custom_field_values 
            WHERE id IN (
                SELECT cfv.id 
                FROM custom_field_values cfv
                JOIN custom_fields cf ON cfv.custom_field_id = cf.id
                WHERE cf.entity_type = 'licenses' 
                AND NOT EXISTS (SELECT 1 FROM licenses l WHERE l.id = cfv.entity_id)
            )
            RETURNING id;
        `);
        console.log(`   - Deleted ${licensesResult.rowCount} orphaned records for Licenses.`);

        // 2. Cleanup values for deleted Shops
        console.log('🔍 Checking for orphaned Shop data...');
        const shopsResult = await client.query(`
            DELETE FROM custom_field_values 
            WHERE id IN (
                SELECT cfv.id 
                FROM custom_field_values cfv
                JOIN custom_fields cf ON cfv.custom_field_id = cf.id
                WHERE cf.entity_type = 'shops' 
                AND NOT EXISTS (SELECT 1 FROM shops s WHERE s.id = cfv.entity_id)
            )
            RETURNING id;
        `);
        console.log(`   - Deleted ${shopsResult.rowCount} orphaned records for Shops.`);

        // 3. Cleanup values for deleted Users (if any)
        console.log('🔍 Checking for orphaned User data...');
        const usersResult = await client.query(`
             DELETE FROM custom_field_values 
             WHERE id IN (
                 SELECT cfv.id 
                 FROM custom_field_values cfv
                 JOIN custom_fields cf ON cfv.custom_field_id = cf.id
                 WHERE cf.entity_type = 'users' 
                 AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = cfv.entity_id)
             )
             RETURNING id;
         `);
        console.log(`   - Deleted ${usersResult.rowCount} orphaned records for Users.`);

        // 4. Cleanup values for deleted License Types
        console.log('🔍 Checking for orphaned License Type data...');
        const licenseTypesResult = await client.query(`
             DELETE FROM custom_field_values 
             WHERE id IN (
                 SELECT cfv.id 
                 FROM custom_field_values cfv
                 JOIN custom_fields cf ON cfv.custom_field_id = cf.id
                 WHERE cf.entity_type = 'license_types' 
                 AND NOT EXISTS (SELECT 1 FROM license_types lt WHERE lt.id = cfv.entity_id)
             )
             RETURNING id;
         `);
        console.log(`   - Deleted ${licenseTypesResult.rowCount} orphaned records for License Types.`);

        console.log('✅ Cleanup complete.');
        client.release();
    } catch (err) {
        console.error('❌ Error executing cleanup:', err);
    } finally {
        await pool.end();
    }
}

cleanup();
