import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { timingSafeEqual } from 'crypto';

/**
 * Security: Timing-safe string comparison to prevent timing attacks
 */
function safeCompare(a, b) {
    if (!a || !b || typeof a !== 'string' || typeof b !== 'string') return false;
    try {
        const bufA = Buffer.from(a);
        const bufB = Buffer.from(b);
        if (bufA.length !== bufB.length) return false;
        return timingSafeEqual(bufA, bufB);
    } catch {
        return false;
    }
}

export const dynamic = 'force-dynamic';

/**
 * Cron Job: Cleanup old audit logs
 * Runs weekly via Vercel Cron (every Monday at 3:00 AM UTC)
 * 
 * Vercel Cron sends a GET request to this endpoint automatically.
 * Protected by CRON_SECRET to prevent unauthorized access.
 */
export async function GET(request) {
    try {
        // Verify the request is from Vercel Cron
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || !safeCompare(authHeader, `Bearer ${cronSecret}`)) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Delete audit logs older than 30 days (1 month)
        const result = await query(
            `DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days'`
        );

        const deletedCount = result?.length || 0;

        console.log(`[Cron Cleanup] Deleted ${deletedCount} old audit logs`);

        return NextResponse.json({
            success: true,
            message: `Cleanup completed. Deleted ${deletedCount} old audit logs.`,
            deletedCount,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[Cron Cleanup] Error:', error);
        const message = process.env.NODE_ENV === 'production'
            ? 'Cleanup failed'
            : 'Cleanup failed: ' + error.message;
        return NextResponse.json(
            { success: false, message },
            { status: 500 }
        );
    }
}
