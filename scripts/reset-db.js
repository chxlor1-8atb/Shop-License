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

const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
    try {
        const schemaPath = path.join(process.cwd(), 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Resetting database...');

        // Split statements safely
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            if (statement.startsWith('--') && !statement.includes('\n')) continue;
            try {
                await sql(statement);
                console.log('Executed statement.');
            } catch (err) {
                console.error('Error executing statement:', statement.substring(0, 50) + '...', err.message);
            }
        }

        console.log('Database reset completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

main();
