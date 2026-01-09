const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Load env
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[match[1]] = value;
    }
});

const sql = neon(env.DATABASE_URL);

async function main() {
    try {
        console.log('Listing all tables in the current database...');

        const result = await sql(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);

        console.log('Found tables:', result.map(r => r.table_name));

    } catch (err) {
        console.error('Failed to list tables:', err);
    }
}

main();
