
const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

dotenv.config();

const sql = neon(process.env.DATABASE_URL);

async function checkLicenseType() {
    try {
        console.log('Checking license types...');
        const result = await sql`SELECT * FROM license_types WHERE name LIKE '%สุขภาพ%'`;
        console.log('Found:', result);

        const allTypes = await sql`SELECT id, name FROM license_types`;
        console.log('All types:', allTypes);
    } catch (error) {
        console.error('Error:', error);
    }
}

checkLicenseType();
