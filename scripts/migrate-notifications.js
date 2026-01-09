const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

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
        console.log('Migrating Notifications Tables...');

        // Create notification_settings table
        await sql(`
            CREATE TABLE IF NOT EXISTS notification_settings (
                id SERIAL PRIMARY KEY,
                telegram_bot_token TEXT,
                telegram_chat_id TEXT,
                days_before_expiry INTEGER DEFAULT 30,
                is_active BOOLEAN DEFAULT false,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created notification_settings table.');

        // Insert default row if empty
        const count = await sql`SELECT COUNT(*) FROM notification_settings`;
        if (parseInt(count[0].count) === 0) {
            await sql`
                INSERT INTO notification_settings (days_before_expiry, is_active)
                VALUES (30, false)
            `;
            console.log('Inserted default notification settings.');
        }

        // Create notification_logs table
        await sql(`
            CREATE TABLE IF NOT EXISTS notification_logs (
                id SERIAL PRIMARY KEY,
                shop_name TEXT,
                status TEXT,
                message TEXT,
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created notification_logs table.');

        console.log('Migration completed.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

main();
