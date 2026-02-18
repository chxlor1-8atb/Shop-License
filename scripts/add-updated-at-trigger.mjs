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
    console.log('Adding updated_at trigger for custom_field_values...');
    try {
        // Drop existing trigger if it exists
        await sql('DROP TRIGGER IF EXISTS update_custom_field_values_updated_at ON custom_field_values');
        console.log('Dropped existing trigger (if any)');
        
        // Create the trigger function
        await sql(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
        `);
        console.log('Created trigger function');
        
        // Create the trigger
        await sql(`
            CREATE TRIGGER update_custom_field_values_updated_at
                BEFORE UPDATE ON custom_field_values
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);
        console.log('Created trigger for custom_field_values table');
        
        console.log('Migration completed successfully!');
        
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

run();
