import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { fetchAll, fetchOne } from '@/lib/db';
import { sessionOptions } from '@/lib/session';
import { NextResponse } from 'next/server';
import { sanitizeInt, sanitizeString, validateEnum } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        // Check authentication
        const cookieStore = await cookies();
        const session = await getIronSession(cookieStore, sessionOptions);

        if (!session.userId) {
            return NextResponse.json(
                { success: false, message: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Check admin role
        if (session.role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Admin access required' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'list';

        switch (action) {
            case 'list':
                return await getActivityLogs(searchParams);
            case 'stats':
                return await getActivityStats();
            case 'user_stats':
                return await getUserStats();
            default:
                return await getActivityLogs(searchParams);
        }
    } catch (err) {
        console.error('Activity logs error:', err);
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message },
            { status: 500 }
        );
    }
}

export async function DELETE(request) {
    try {
        const cookieStore = await cookies();
        const session = await getIronSession(cookieStore, sessionOptions);

        if (!session.userId || session.role !== 'admin') {
            return NextResponse.json(
                { success: false, message: 'Admin access required' },
                { status: 403 }
            );
        }

        await fetchAll('DELETE FROM audit_logs');

        return NextResponse.json({
            success: true,
            message: 'ล้างข้อมูลเรียบร้อยแล้ว'
        });
    } catch (err) {
        console.error('Clear logs error:', err);
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาด: ' + err.message },
            { status: 500 }
        );
    }
}

/**
 * Get paginated activity logs with filters
 */
async function getActivityLogs(searchParams) {
    // Security: Sanitize pagination parameters
    const page = sanitizeInt(searchParams.get('page'), 1, 1, 1000);
    const limit = sanitizeInt(searchParams.get('limit'), 20, 1, 100);
    const offset = (page - 1) * limit;

    // Filters
    const userId = searchParams.get('user_id');
    const action = validateEnum(
        searchParams.get('action_type'),
        ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'VIEW'],
        ''
    );
    const entityType = validateEnum(
        searchParams.get('entity_type'),
        ['AUTH', 'USER', 'SHOP', 'LICENSE', 'LICENSE_TYPE', 'CUSTOM_FIELD', 'ENTITY'],
        ''
    );
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const search = sanitizeString(searchParams.get('search') || '', 100);

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (userId) {
        const safeUserId = sanitizeInt(userId, 0, 1);
        if (safeUserId > 0) {
            whereClauses.push(`a.user_id = $${paramIndex++}`);
            params.push(safeUserId);
        }
    }

    if (action) {
        whereClauses.push(`a.action = $${paramIndex++}`);
        params.push(action);
    }

    if (entityType) {
        whereClauses.push(`a.entity_type = $${paramIndex++}`);
        params.push(entityType);
    }

    if (dateFrom) {
        whereClauses.push(`DATE(a.created_at) >= $${paramIndex++}`);
        params.push(dateFrom);
    }

    if (dateTo) {
        whereClauses.push(`DATE(a.created_at) <= $${paramIndex++}`);
        params.push(dateTo);
    }

    if (search) {
        whereClauses.push(`(a.details ILIKE $${paramIndex} OR a.ip_address ILIKE $${paramIndex} OR u.full_name ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    // Count query
    const countQuery = `
        SELECT COUNT(*) as total 
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ${whereSQL}
    `;

    // Security: Use parameterized queries for LIMIT/OFFSET
    const limitParamIndex = paramIndex;
    const offsetParamIndex = paramIndex + 1;

    // Data query with full details
    const dataQuery = `
        SELECT 
            a.id,
            a.user_id,
            a.action,
            a.entity_type,
            a.entity_id,
            a.details,
            a.ip_address,
            a.user_agent,
            a.created_at,
            COALESCE(u.full_name, 'ระบบ') as user_name,
            COALESCE(u.username, 'system') as username,
            COALESCE(u.role, 'system') as user_role
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        ${whereSQL}
        ORDER BY a.created_at DESC
        LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const [countResult, activities] = await Promise.all([
        fetchOne(countQuery, params),
        fetchAll(dataQuery, [...params, limit, offset])
    ]);

    const total = parseInt(countResult?.total || 0, 10);
    const totalPages = Math.ceil(total / limit);

    // Parse user agent for device info
    const activitiesWithDeviceInfo = activities.map(activity => ({
        ...activity,
        device_info: parseUserAgent(activity.user_agent)
    }));

    return NextResponse.json({
        success: true,
        activities: activitiesWithDeviceInfo,
        pagination: {
            page,
            limit,
            total,
            totalPages
        }
    });
}

/**
 * Get activity statistics
 */
async function getActivityStats() {
    const stats = await fetchOne(`
        SELECT 
            (SELECT COUNT(*) FROM audit_logs) as total_activities,
            (SELECT COUNT(*) FROM audit_logs WHERE DATE(created_at) = CURRENT_DATE) as today_activities,
            (SELECT COUNT(*) FROM audit_logs WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as week_activities,
            (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE DATE(created_at) = CURRENT_DATE) as today_active_users,
            (SELECT COUNT(*) FROM audit_logs WHERE action = 'LOGIN' AND DATE(created_at) = CURRENT_DATE) as today_logins,
            (SELECT COUNT(*) FROM audit_logs WHERE action = 'CREATE') as total_creates,
            (SELECT COUNT(*) FROM audit_logs WHERE action = 'UPDATE') as total_updates,
            (SELECT COUNT(*) FROM audit_logs WHERE action = 'DELETE') as total_deletes
    `);

    // Get activity by hour (today)
    const hourlyActivity = await fetchAll(`
        SELECT 
            EXTRACT(HOUR FROM created_at) as hour,
            COUNT(*) as count
        FROM audit_logs
        WHERE DATE(created_at) = CURRENT_DATE
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
    `);

    // Get activity by action type
    const actionBreakdown = await fetchAll(`
        SELECT 
            action,
            COUNT(*) as count
        FROM audit_logs
        GROUP BY action
        ORDER BY count DESC
    `);

    // Get activity by entity type
    const entityBreakdown = await fetchAll(`
        SELECT 
            entity_type,
            COUNT(*) as count
        FROM audit_logs
        GROUP BY entity_type
        ORDER BY count DESC
    `);

    // Get top active users (last 30 days)
    const topUsers = await fetchAll(`
        SELECT 
            u.id,
            u.full_name,
            u.username,
            COUNT(a.id) as activity_count,
            MAX(a.created_at) as last_activity
        FROM users u
        LEFT JOIN audit_logs a ON u.id = a.user_id AND a.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY u.id, u.full_name, u.username
        ORDER BY activity_count DESC
        LIMIT 10
    `);

    // Get recent unique IPs
    const recentIPs = await fetchAll(`
        SELECT 
            ip_address,
            COUNT(*) as access_count,
            MAX(created_at) as last_access
        FROM audit_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY ip_address
        ORDER BY access_count DESC
        LIMIT 10
    `);

    return NextResponse.json({
        success: true,
        stats: {
            total_activities: parseInt(stats?.total_activities || 0),
            today_activities: parseInt(stats?.today_activities || 0),
            week_activities: parseInt(stats?.week_activities || 0),
            today_active_users: parseInt(stats?.today_active_users || 0),
            today_logins: parseInt(stats?.today_logins || 0),
            total_creates: parseInt(stats?.total_creates || 0),
            total_updates: parseInt(stats?.total_updates || 0),
            total_deletes: parseInt(stats?.total_deletes || 0)
        },
        hourlyActivity,
        actionBreakdown,
        entityBreakdown,
        topUsers,
        recentIPs
    });
}

/**
 * Get user-specific statistics
 */
async function getUserStats() {
    const users = await fetchAll(`
        SELECT 
            u.id,
            u.username,
            u.full_name,
            u.role,
            u.created_at,
            (SELECT COUNT(*) FROM audit_logs a WHERE a.user_id = u.id) as total_activities,
            (SELECT COUNT(*) FROM audit_logs a WHERE a.user_id = u.id AND a.action = 'LOGIN') as total_logins,
            (SELECT MAX(a.created_at) FROM audit_logs a WHERE a.user_id = u.id AND a.action = 'LOGIN') as last_login,
            (SELECT MAX(a.created_at) FROM audit_logs a WHERE a.user_id = u.id) as last_activity,
            (SELECT a.ip_address FROM audit_logs a WHERE a.user_id = u.id ORDER BY a.created_at DESC LIMIT 1) as last_ip,
            (SELECT COUNT(DISTINCT DATE(a.created_at)) FROM audit_logs a WHERE a.user_id = u.id AND a.created_at >= CURRENT_DATE - INTERVAL '30 days') as active_days_30
        FROM users u
        ORDER BY last_activity DESC NULLS LAST
    `);

    return NextResponse.json({
        success: true,
        users
    });
}

/**
 * Parse User-Agent string to get device info
 */
function parseUserAgent(ua) {
    if (!ua || ua === 'unknown') {
        return { browser: 'ไม่ทราบ', os: 'ไม่ทราบ', device: 'ไม่ทราบ' };
    }

    let browser = 'ไม่ทราบ';
    let os = 'ไม่ทราบ';
    let device = 'Desktop';

    // Detect browser
    if (ua.includes('Firefox')) {
        browser = 'Firefox';
    } else if (ua.includes('Edg/')) {
        browser = 'Microsoft Edge';
    } else if (ua.includes('Chrome')) {
        browser = 'Chrome';
    } else if (ua.includes('Safari')) {
        browser = 'Safari';
    } else if (ua.includes('Opera') || ua.includes('OPR/')) {
        browser = 'Opera';
    }

    // Detect OS
    if (ua.includes('Windows NT 10')) {
        os = 'Windows 10/11';
    } else if (ua.includes('Windows NT')) {
        os = 'Windows';
    } else if (ua.includes('Mac OS X')) {
        os = 'macOS';
    } else if (ua.includes('Linux')) {
        os = 'Linux';
    } else if (ua.includes('Android')) {
        os = 'Android';
    } else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
        os = 'iOS';
    }

    // Detect device type
    if (ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone')) {
        device = 'Mobile';
    } else if (ua.includes('Tablet') || ua.includes('iPad')) {
        device = 'Tablet';
    }

    return { browser, os, device };
}
