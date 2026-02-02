require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function executeQuery(query, params = []) {
    try {
        return await sql(query, params);
    } catch (e) {
        console.error('SQL Error:', e.message);
        throw e;
    }
}

async function verifyCustomFields() {
    console.log('--- STARTING VERIFICATION ---');
    const timestamp = Date.now();
    const shopField = `shop_cf_${timestamp}`;
    const licenseField = `lic_cf_${timestamp}`;

    // 1. Create definitions for Shops and Licenses
    console.log(`Creating custom field definitions: ${shopField}, ${licenseField}`);
    try {
        const shopDef = await executeQuery(`
            INSERT INTO custom_fields (entity_type, field_name, field_label, field_type)
            VALUES ('shops', $1, 'Test Shop Field', 'text') RETURNING id
        `, [shopField]);
        console.log('Created Shop CF Definition ID:', shopDef[0].id);

        const licDef = await executeQuery(`
            INSERT INTO custom_fields (entity_type, field_name, field_label, field_type)
            VALUES ('licenses', $1, 'Test License Field', 'text') RETURNING id
        `, [licenseField]);
        console.log('Created License CF Definition ID:', licDef[0].id);

        const licDefId = licDef[0].id;

        // 2. Insert Shop Data (Simulating api/shops/route.js POST logic)
        // Shops API stores in JSONB column 'custom_fields'
        const customFieldsShop = {};
        customFieldsShop[shopField] = "ShopValue123";

        console.log('Inserting Shop with JSONB custom_fields...');
        const shopRes = await executeQuery(`
            INSERT INTO shops (shop_name, custom_fields) 
            VALUES ($1, $2) RETURNING id
        `, [`Test Shop ${timestamp}`, JSON.stringify(customFieldsShop)]);
        const shopId = shopRes[0].id;
        console.log('Created Shop ID:', shopId);

        // 3. Verify Shop Data Retrieval
        console.log('Verifying Shop Data...');
        const fetchedShop = await executeQuery('SELECT * FROM shops WHERE id = $1', [shopId]);
        const shopData = fetchedShop[0];
        console.log('Fetched Shop Custom Fields:', shopData.custom_fields);

        if (shopData.custom_fields && shopData.custom_fields[shopField] === "ShopValue123") {
            console.log('✅ SHOPS: JSONB storage working correctly.');
        } else {
            console.log('❌ SHOPS: Data mismatch or missing.');
        }

        // 4. Insert License Data (Simulating api/licenses/route.js POST logic)
        // Licenses API expects licenses rows + entries in custom_field_values table
        console.log('Inserting License...');
        const licRes = await executeQuery(`
            INSERT INTO licenses (shop_id, license_number, status)
            VALUES ($1, $2, 'active') RETURNING id
        `, [shopId, `LIC-${timestamp}`]);
        const licId = licRes[0].id;
        console.log('Created License ID:', licId);

        console.log('Inserting License Custom Field Value (EAV)...');
        await executeQuery(`
            INSERT INTO custom_field_values (custom_field_id, entity_id, field_value, entity_type)
            VALUES ($1, $2, $3, 'licenses')
        `, [licDefId, licId, "LicenseValue999"]);

        // 5. Verify License Data Retrieval (Simulating api/licenses/route.js GET logic)
        console.log('Verifying License Data...');
        const query = `
            SELECT l.*, 
                   COALESCE(
                       json_object_agg(cf.field_name, cfv.field_value) FILTER (WHERE cf.field_name IS NOT NULL),
                       '{}'::json
                   ) as custom_fields
            FROM licenses l
            LEFT JOIN custom_field_values cfv ON cfv.entity_id = l.id AND cfv.entity_type = 'licenses'
            LEFT JOIN custom_fields cf ON cfv.custom_field_id = cf.id AND cf.entity_type = 'licenses'
            WHERE l.id = $1
            GROUP BY l.id
        `;
        const fetchedLic = await executeQuery(query, [licId]);
        const licData = fetchedLic[0];
        console.log('Fetched License Custom Fields:', licData.custom_fields);

        if (licData.custom_fields && licData.custom_fields[licenseField] === "LicenseValue999") {
            console.log('✅ LICENSES: EAV storage working correctly.');
        } else {
            console.log('❌ LICENSES: Data mismatch or missing.');
        }

        // Cleanup based on ID
        console.log('Cleaning up...');
        await executeQuery('DELETE FROM custom_field_values WHERE entity_id = $1', [licId]); // Clean values first
        await executeQuery('DELETE FROM licenses WHERE id = $1', [licId]);
        await executeQuery('DELETE FROM shops WHERE id = $1', [shopId]);
        await executeQuery('DELETE FROM custom_fields WHERE id = $1', [shopDef[0].id]);
        await executeQuery('DELETE FROM custom_fields WHERE id = $1', [licDefId]);
        console.log('Cleanup complete.');

    } catch (e) {
        console.error('VERIFICATION FAILED:', e);
    }
}

verifyCustomFields();
