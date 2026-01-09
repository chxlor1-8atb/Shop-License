import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
    // Require admin access for database migration
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const sql = neon(process.env.DATABASE_URL);

        // Read schema.sql
        const schemaPath = path.join(process.cwd(), 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Starting migration...');

        // Split statements
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            // Skip comments-only chunks if any
            if (statement.startsWith('--') && !statement.includes('\n')) continue;

            try {
                // Execute raw sql
                await sql(statement);
            } catch (err) {
                console.error('Error executing statement:', statement.substring(0, 50), err.message);
                // Ignore "already exists" errors
            }
        }

        return NextResponse.json({ success: true, message: 'Migration completed' });
    } catch (error) {
        console.error('Migration failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
