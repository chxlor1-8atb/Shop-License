require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function testConnection() {
    console.log('Testing connection to:', process.env.DATABASE_URL);
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is missing');
        return;
    }

    try {
        const sql = neon(process.env.DATABASE_URL);
        const result = await sql`SELECT version()`;
        console.log('Connection successful:', result);
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

testConnection();
