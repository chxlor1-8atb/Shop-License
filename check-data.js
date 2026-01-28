// Quick check what data exists in database
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = "postgresql://neondb_owner:npg_dmWJrab3uSP5@ep-lively-bird-a1vsnlbg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function checkData() {
    const sql = neon(DATABASE_URL);

    try {
        console.log('📊 Checking database data...\n');

        // Check licenses
        const licenses = await sql`SELECT COUNT(*) as count FROM licenses`;
        console.log(`Licenses: ${licenses[0].count}`);

        // Check shops
        const shops = await sql`SELECT COUNT(*) as count FROM shops`;
        console.log(`Shops: ${shops[0].count}`);

        // Check license_types
        const types = await sql`SELECT COUNT(*) as count FROM license_types`;
        console.log(`License Types: ${types[0].count}`);

        // If there are licenses, show first one
        if (parseInt(licenses[0].count) > 0) {
            console.log('\n📄 Sample License:');
            const sample = await sql`
                SELECT l.*, s.shop_name, lt.name as type_name
                FROM licenses l
                LEFT JOIN shops s ON l.shop_id = s.id
                LEFT JOIN license_types lt ON l.license_type_id = lt.id
                LIMIT 1
            `;
            console.log(JSON.stringify(sample[0], null, 2));
        } else {
            console.log('\n⚠️  No licenses in database!');
            console.log('You need to create a license first via the UI.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkData().then(() => process.exit(0));
