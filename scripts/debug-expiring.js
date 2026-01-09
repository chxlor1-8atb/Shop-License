
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(process.cwd(), '.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    if (match) databaseUrl = match[1];
}

const sql = neon(databaseUrl);

async function checkExpiring() {
    try {
        console.log('Testing Expiring Query...');
        const query = `
            SELECT 
                l.id, l.license_number, l.expiry_date, l.status,
                s.shop_name, s.shop_code,
                lt.name as type_name,
                (l.expiry_date - CURRENT_DATE) as days_until_expiry
            FROM licenses l
            LEFT JOIN shops s ON l.shop_id = s.id
            LEFT JOIN license_types lt ON l.license_type_id = lt.id
            WHERE 
                (l.status = 'active' AND l.expiry_date <= CURRENT_DATE + INTERVAL '60 day')
                OR 
                (l.status = 'expired')
                OR
                (l.expiry_date < CURRENT_DATE)
            ORDER BY days_until_expiry ASC
        `;

        const results = await sql(query);
        console.log(`Found ${results.length} results.`);
        if (results.length > 0) {
            console.log('Sample Row:', JSON.stringify(results[0], null, 2));
        }

        console.log('Checking distinct statuses in DB:');
        const statuses = await sql('SELECT status, count(*) FROM licenses GROUP BY status');
        console.log(statuses);

    } catch (err) {
        console.error('Error:', err);
    }
}

checkExpiring();
