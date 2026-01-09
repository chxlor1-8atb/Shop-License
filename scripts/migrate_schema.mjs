import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env vars
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.warn('.env.local not found!');
}

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
    console.log('Running migration...');
    try {
        // Add JSONB columns
        await sql('ALTER TABLE shops ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT \'{}\'');
        console.log('Added custom_fields to shops');
        
        await sql('ALTER TABLE licenses ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT \'{}\'');
        console.log('Added custom_fields to licenses');

        // Create Schema Definitions Table
        await sql(`
            CREATE TABLE IF NOT EXISTS schema_definitions (
                id SERIAL PRIMARY KEY,
                table_name VARCHAR(50) NOT NULL,
                column_key VARCHAR(50) NOT NULL,
                column_label VARCHAR(100) NOT NULL,
                column_type VARCHAR(20) DEFAULT 'text',
                is_required BOOLEAN DEFAULT false,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(table_name, column_key)
            )
        `);
        console.log('Created schema_definitions table');
        
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

run();
