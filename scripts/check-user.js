const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

// Load env locally
const envPath = path.join(process.cwd(), '.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
    if (match) databaseUrl = match[1];
}

if (!databaseUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
}

const sql = neon(databaseUrl);

async function checkUsers() {
    try {
        console.log('Querying users...');
        const users = await sql('SELECT id, username, full_name, role FROM users');
        console.log('Found users:', JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error querying users:', err);
    }
}

checkUsers();
