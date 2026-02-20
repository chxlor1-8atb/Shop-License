const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

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

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        console.log('Verifying database state...');

        const tables = ['users', 'shops', 'license_types', 'licenses', 'notification_settings'];
        for (const table of tables) {
            const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`Table ${table}: ${result.rows[0].count} rows`);
        }

        const admin = await pool.query("SELECT username, role FROM users WHERE username = 'admin'");
        console.log('Admin user:', admin.rows[0]);

    } catch (err) {
        console.error('Verification failed:', err);
    } finally {
        await pool.end();
    }
}

main();
