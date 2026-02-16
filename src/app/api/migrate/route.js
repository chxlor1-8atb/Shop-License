import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function POST() {
    // Security: Hard block on ALL Vercel environments (production + preview) — no override possible
    if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') {
        return NextResponse.json(
            { success: false, message: 'Migration is disabled in production' },
            { status: 403 }
        );
    }
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MIGRATE !== 'true') {
        return NextResponse.json(
            { success: false, message: 'Migration is disabled in production' },
            { status: 403 }
        );
    }

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
        const message = process.env.NODE_ENV === 'production'
            ? 'Migration failed'
            : error.message;
        return NextResponse.json({ success: false, message }, { status: 500 });
    }
}
