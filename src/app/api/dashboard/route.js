import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { fetchAll } from '@/lib/db';
import { sessionOptions, isSessionValid } from '@/lib/session';
import { NextResponse } from 'next/server';
import {
    getCachedDashboardStats,
    getCachedLicenseBreakdown,
    getCachedExpiringCount,
    getWarningDays
} from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        // Check authentication
        const cookieStore = await cookies();
        const session = await getIronSession(cookieStore, sessionOptions);

        if (!session.userId || !isSessionValid(session)) {
            if (session.userId) await session.destroy();
            return NextResponse.json(
                { success: false, message: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'stats';

        // Fetch warning days once for all actions
        const warningDays = await getWarningDays();

        switch (action) {
            case 'stats':
                return await getStats(warningDays);
            case 'expiring_count':
                return await getExpiringCount(warningDays);
            case 'license_breakdown':
                return await getLicenseBreakdown(warningDays);
            case 'recent_activity':
                return await getRecentActivity(session, searchParams);
            default:
                return await getStats(warningDays);
        }
    } catch (err) {
        console.error('Dashboard error:', err);
        return NextResponse.json(
            { success: false, message: process.env.NODE_ENV === 'production' ? 'เกิดข้อผิดพลาดภายในระบบ' : 'เกิดข้อผิดพลาด: ' + err.message },
            { status: 500 }
        );
    }
}

async function getStats(warningDays) {
    // ===== Using Data Cache =====
    const result = await getCachedDashboardStats(warningDays);

    return NextResponse.json({
        success: true,
        message: 'Success',
        stats: {
            total_shops: parseInt(result?.total_shops || 0),
            total_licenses: parseInt(result?.total_licenses || 0),
            active_licenses: parseInt(result?.active_licenses || 0),
            expired_licenses: parseInt(result?.expired_licenses || 0),
            expiring_soon: parseInt(result?.expiring_soon || 0),
            total_users: parseInt(result?.total_users || 0),
            expiry_warning_days: warningDays
        },
        expiring: []
    });
}

async function getLicenseBreakdown(warningDays) {
    // ===== Using Data Cache =====
    const breakdown = await getCachedLicenseBreakdown(warningDays);

    return NextResponse.json({
        success: true,
        message: 'Success',
        breakdown
    });
}

async function getExpiringCount(warningDays) {
    // ===== Using Data Cache =====
    const count = await getCachedExpiringCount(warningDays);

    return NextResponse.json({
        success: true,
        count
    });
}

async function getRecentActivity(session, searchParams) {
    // Security check: Only admins can see activity logs
    if (session.role !== 'admin') {
        return NextResponse.json({ success: true, activities: [] });
    }

    const type = searchParams.get('type') || 'ALL';
    let whereClause = "a.action IN ('CREATE', 'UPDATE', 'DELETE')";
    const params = [];

    if (type !== 'ALL' && ['CREATE', 'UPDATE', 'DELETE'].includes(type)) {
        whereClause = `a.action = $1`;
        params.push(type);
    }

    const activities = await fetchAll(`
        SELECT a.*, COALESCE(u.full_name, 'System') as user_name 
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE ${whereClause}
        ORDER BY a.created_at DESC 
        LIMIT 20
    `, params);
    return NextResponse.json({ success: true, activities });
}

