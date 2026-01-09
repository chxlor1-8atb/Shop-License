const { neon } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error('DATABASE_URL not found');
    process.exit(1);
}

const sql = neon(databaseUrl);

async function resetPassword() {
    try {
        const username = 'admin';
        const newPassword = '1234';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log(`Resetting password for user '${username}'...`);

        await sql('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, username]);

        console.log('Password reset successfully.');
        console.log(`Username: ${username}`);
        console.log(`New Password: ${newPassword}`);

    } catch (err) {
        console.error('Error resetting password:', err);
    }
}

resetPassword();
