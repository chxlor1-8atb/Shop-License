
import { fetchAll, fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAdmin, getCurrentUser } from '@/lib/api-helpers';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    // Require admin access for user management
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        // Check authentication/authorization here (omitted for brevity, assumption: middleare or session check done)

        if (id) {
            const user = await fetchOne('SELECT id, username, full_name, role, created_at FROM users WHERE id = $1', [id]);
            return NextResponse.json({ success: true, user });
        }

        const page = parseInt(searchParams.get('page'), 10) || 1;
        const limit = parseInt(searchParams.get('limit'), 10) || 20;
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

        const users = await fetchAll(`
            SELECT id, username, full_name, role, created_at 
            FROM users 
            ORDER BY id ASC
            LIMIT ${limit} OFFSET ${offset}
        `);

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
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    // Require admin access
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { username, full_name, password, role } = body;

        if (!username || !password || !role) {
            return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Check if username exists
        const existing = await fetchOne('SELECT id FROM users WHERE username = $1', [username]);
        if (existing) {
            return NextResponse.json({ success: false, message: 'Username already exists' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

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
            entityId: result?.rows?.[0]?.id || null,
            details: `เพิ่มผู้ใช้: ${username} (สิทธิ์: ${role})`
        });

        return NextResponse.json({ success: true, message: 'User created successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    // Require admin access
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const { id, full_name, password, role } = body;

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
        }

        // Get user info for logging
        const targetUser = await fetchOne('SELECT username FROM users WHERE id = $1', [id]);

        let query = 'UPDATE users SET full_name = $1, role = $2';
        let params = [full_name || '', role];
        let paramIndex = 3;

        if (password) {
            if (password.length < 6) {
                return NextResponse.json({ success: false, message: 'Password must be at least 6 characters' }, { status: 400 });
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            query += `, password = $${paramIndex}`;
            params.push(hashedPassword);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex}`;
        params.push(id);

        await executeQuery(query, params);

        // Log activity
        const currentUser = await getCurrentUser();
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.USER,
            entityId: parseInt(id),
            details: `แก้ไขผู้ใช้: ${targetUser?.username || id}${password ? ' (รวมเปลี่ยนรหัสผ่าน)' : ''}`
        });

        return NextResponse.json({ success: true, message: 'User updated successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    // Require admin access
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, message: 'ID is required' }, { status: 400 });
        }

        // Get user info for logging
        const targetUser = await fetchOne('SELECT username FROM users WHERE id = $1', [id]);

        // Prevent deleting self
        const currentUser = await getCurrentUser();
        if (currentUser?.id === parseInt(id)) {
            return NextResponse.json({ success: false, message: 'ไม่สามารถลบบัญชีตัวเองได้' }, { status: 400 });
        }

        await executeQuery('DELETE FROM users WHERE id = $1', [id]);

        // Log activity
        await logActivity({
            userId: currentUser?.id || null,
            action: ACTIVITY_ACTIONS.DELETE,
            entityType: ENTITY_TYPES.USER,
            entityId: parseInt(id),
            details: `ลบผู้ใช้: ${targetUser?.username || id}`
        });

        return NextResponse.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
