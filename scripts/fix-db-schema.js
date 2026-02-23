import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function runFix() {
    console.log('--- Database Fix Script ---');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('1. Creating notification_settings table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notification_settings (
                id SERIAL PRIMARY KEY,
                telegram_bot_token VARCHAR(255),
                telegram_chat_id VARCHAR(255),
                days_before_expiry INTEGER DEFAULT 30,
                is_active BOOLEAN DEFAULT false,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('2. Inserting default notification settings...');
        await pool.query(`
            INSERT INTO notification_settings (id, days_before_expiry, is_active)
            VALUES (1, 30, false)
            ON CONFLICT (id) DO NOTHING;
        `);

        console.log('3. Checking for missing columns in shops/licenses...');
        await pool.query(`ALTER TABLE shops ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';`);
        await pool.query(`ALTER TABLE licenses ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';`);

        console.log('✅ All fixes applied successfully.');
    } catch (err) {
        console.error('❌ Error applying fixes:', err.message);
    } finally {
        await pool.end();
    }
}

runFix();
