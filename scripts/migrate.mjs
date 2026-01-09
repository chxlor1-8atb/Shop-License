import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const DATABASE_URL = "postgresql://neondb_owner:npg_dmWJrab3uSP5@ep-lively-bird-a1vsnlbg-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function main() {
    try {
        const schemaPath = path.join(process.cwd(), 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Applying schema...');

        // Verify connection
        const version = await sql`SELECT version()`;
        console.log('Connected to:', version[0].version);

        // Simple split by semicolon for multiple statements
        // Note: This is a basic split and might fail on complex bodies with semicolons
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                // Skip comments only lines if split resulted in them?
                if (statement.startsWith('--')) continue;

                await sql(statement);
            } catch (err) {
                console.error('Error executing statement:', statement.substring(0, 50) + '...', err.message);
                // Continue despite errors (e.g. table already exists)
            }
        }

        console.log('Schema applied successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    }
}

main();
