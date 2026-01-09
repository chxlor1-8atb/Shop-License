const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const sql = neon(process.env.DATABASE_URL);

async function main() {
    try {
        console.log('⚠️  STARTING FULL DATABASE NUKE ⚠️');

        // 1. Get all tables
        const tables = await sql(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `);

        if (tables.length > 0) {
            console.log(`Found ${tables.length} tables to delete:`, tables.map(t => t.table_name).join(', '));

            // 2. Drop each table
            for (const row of tables) {
                console.log(`Dropping table: ${row.table_name}...`);
                await sql(`DROP TABLE IF EXISTS "${row.table_name}" CASCADE`);
            }
            console.log('✅ All existing tables dropped.');
        } else {
            console.log('Database is already empty.');
        }

        // 3. Re-run schema.sql
        console.log('Applying new schema...');
        const schemaPath = path.join(process.cwd(), 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            if (statement.startsWith('--') && !statement.includes('\n')) continue;
            try {
                await sql(statement);
            } catch (err) {
                console.error('Error executing statement:', statement.substring(0, 50), err.message);
            }
        }

        console.log('✅ Database successfully recreated from scratch!');

    } catch (err) {
        console.error('Snapshot failed:', err);
    }
}

main();
