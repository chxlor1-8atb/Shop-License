require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function fetchAll(query, params) {
    return await sql(query, params);
}

async function testExportFilter() {
    console.log('--- Testing Export Filters ---');

    // MOCK PARAMETERS
    const license_type = ''; // Set a valid ID to test
    const status = 'active';
    const search = '';
    const shop_id = '';

    console.log(`Filters: Status=${status}, Search=${search}`);

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (license_type) {
        whereClauses.push(`l.license_type_id = $${paramIndex++}`);
        params.push(license_type);
    }
    if (shop_id) {
        whereClauses.push(`l.shop_id = $${paramIndex++}`);
        params.push(shop_id);
    }
    if (search) {
        whereClauses.push(`(
            s.shop_name ILIKE $${paramIndex} OR 
            l.license_number ILIKE $${paramIndex} OR 
            lt.name ILIKE $${paramIndex} OR 
            l.status ILIKE $${paramIndex} OR 
            l.notes ILIKE $${paramIndex} OR
            l.issue_date::text ILIKE $${paramIndex} OR
            l.expiry_date::text ILIKE $${paramIndex} OR
            EXISTS (
                SELECT 1 FROM custom_field_values cfv2
                WHERE cfv2.entity_id = l.id 
                AND cfv2.field_value ILIKE $${paramIndex}
            )
        )`);
        params.push(`%${search}%`);
        paramIndex++;
    }
    if (status) {
        whereClauses.push(`l.status = $${paramIndex++}`);
        params.push(status);
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    console.log('Generated WHERE Clause:', whereSQL);
    console.log('Params:', params);

    const query = `
        SELECT 
            l.license_number, 
            l.status,
            s.shop_name
        FROM licenses l
        LEFT JOIN shops s ON l.shop_id = s.id
        LEFT JOIN license_types lt ON l.license_type_id = lt.id
        ${whereSQL}
        LIMIT 5
    `;

    try {
        const results = await fetchAll(query, params);
        console.log(`Found ${results.length} rows matching filters.`);
        console.table(results);
    } catch (e) {
        console.error('Query Failed:', e);
    }
}

testExportFilter();
