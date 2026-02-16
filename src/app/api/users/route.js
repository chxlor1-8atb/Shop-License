
import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAdmin, getCurrentUser, safeErrorMessage } from '@/lib/api-helpers';
import { validatePassword, validateUsername, sanitizeInt, sanitizeString } from '@/lib/security';

export const dynamic = 'force-dynamic';

// Security: bcrypt cost factor (12+ recommended for production)
const BCRYPT_ROUNDS = 12;

export async function GET(request) {
    // Require admin access for user management
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            // Security: Validate ID is a positive integer
            const safeId = sanitizeInt(id, 0, 1);
            if (safeId < 1) {
                return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
            }
            const user = await fetchOne('SELECT id, username, full_name, role, created_at FROM users WHERE id = $1', [safeId]);
            return NextResponse.json({ success: true, user });
        }

        // Security: Sanitize pagination parameters
        const page = sanitizeInt(searchParams.get('page'), 1, 1, 1000);
        const limit = sanitizeInt(searchParams.get('limit'), 20, 1, 100);
        const offset = (page - 1) * limit;

        const statsResult = await fetchOne(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins,
                SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users
            FROM users
        `);

        const total = parseInt(statsResult?.total || 0, 10);
        const stats = {
            totalUsers: total,
            totalAdmins: parseInt(statsResult?.admins || 0, 10),
            totalRegularUsers: parseInt(statsResult?.regular_users || 0, 10)
        };

        const totalPages = Math.ceil(total / limit);

        // Security: Use parameterized query for LIMIT/OFFSET to prevent SQL injection
        const users = await fetchAll(`
            SELECT id, username, full_name, role, created_at 
            FROM users 
            ORDER BY id ASC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        return NextResponse.json({
            success: true,
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages
            },
            stats
        });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

export async function POST(request) {
    // Require admin access
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { username, password, role } = body;
        const full_name = sanitizeString(body.full_name || '', 255);

        if (!username || !password || !role) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        // Security: Validate username format
        const usernameCheck = validateUsername(username);
        if (!usernameCheck.valid) {
            return NextResponse.json({ success: false, message: usernameCheck.message }, { status: 400 });
        }

        // Security: Strong password validation
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.valid) {
            return NextResponse.json({ success: false, message: passwordCheck.message }, { status: 400 });
        }

        // Security: Validate role against whitelist
        const allowedRoles = ['admin', 'user'];
        if (!allowedRoles.includes(role)) {
            return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
        }

        // Check if username exists
        const existing = await fetchOne('SELECT id FROM users WHERE username = $1', [username]);
        if (existing) {
            return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 400 });
        }

        // Security: Use higher bcrypt rounds for better protection
        const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

        const result = await executeQuery(
            `INSERT INTO users (username, full_name, password, role) VALUES ($1, $2, $3, $4) RETURNING id`,
            [username, full_name || '', hashedPassword, role]
        );

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.CREATE,
            entityType: ENTITY_TYPES.USER,
            entityId: result?.[0]?.id || null,
            details: `เพิ่มผู้ใช้: ${username} (สิทธิ์: ${role})`
        });

        return NextResponse.json({ success: true, message: 'User created successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

export async function PUT(request) {
    // Require admin access
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { id, password, role } = body;
        const full_name = sanitizeString(body.full_name || '', 255);

        // Security: Validate ID
        const safeId = sanitizeInt(id, 0, 1);
        if (safeId < 1) {
            return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
        }

        // Security: Validate role against whitelist
        const allowedRoles = ['admin', 'user'];
        if (role && !allowedRoles.includes(role)) {
            return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
        }

        // Get user info for logging
        const targetUser = await fetchOne('SELECT username FROM users WHERE id = $1', [safeId]);
        if (!targetUser) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        let query = 'UPDATE users SET full_name = $1, role = $2';
        let params = [full_name || '', role];
        let paramIndex = 3;

        if (password) {
            // Security: Strong password validation
            const passwordCheck = validatePassword(password);
            if (!passwordCheck.valid) {
                return NextResponse.json({ success: false, message: passwordCheck.message }, { status: 400 });
            }
            const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
            query += `, password = $${paramIndex}`;
            params.push(hashedPassword);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex}`;
        params.push(safeId);

        await executeQuery(query, params);

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.USER,
            entityId: safeId,
            details: `แก้ไขผู้ใช้: ${targetUser?.username || id}${password ? ' (รวมเปลี่ยนรหัสผ่าน)' : ''}`
        });

        return NextResponse.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

export async function DELETE(request) {
    // Require admin access
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // Security: Validate ID
        const safeId = sanitizeInt(id, 0, 1);
        if (safeId < 1) {
            return NextResponse.json({ success: false, message: 'Invalid user ID' }, { status: 400 });
        }

        // Get user info for logging
        const targetUser = await fetchOne('SELECT username FROM users WHERE id = $1', [safeId]);
        if (!targetUser) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // Prevent deleting self
        const currentUser = await getCurrentUser();
        if (currentUser?.id === safeId) {
            return NextResponse.json({ success: false, message: 'ไม่สามารถลบบัญชีตัวเองได้' }, { status: 400 });
        }

        await executeQuery('DELETE FROM users WHERE id = $1', [safeId]);

        // Log activity
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.USER,
            entityId: safeId,
            details: `ลบผู้ใช้: ${targetUser.username}`
        });

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
