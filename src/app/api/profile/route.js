import { fetchOne, executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';
import { requireAuth, getSession, safeErrorMessage } from '@/lib/api-helpers';
import { validatePassword } from '@/lib/security';

export const dynamic = 'force-dynamic';

const BCRYPT_ROUNDS = 12;

export async function GET(request) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const session = await getSession();
        const user = await fetchOne(
            'SELECT id, username, full_name, role, created_at FROM users WHERE id = $1',
            [session.id]
        );

        if (!user) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user });
    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}

export async function PUT(request) {
    const authError = await requireAuth();
    if (authError) return authError;

    try {
        const session = await getSession();
        const body = await request.json();
        const { full_name, current_password, new_password } = body;

        // Fetch current user data including password hash
        const currentUser = await fetchOne('SELECT * FROM users WHERE id = $1', [session.id]);

        if (!currentUser) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        let query = 'UPDATE users SET full_name = $1';
        let params = [full_name || currentUser.full_name];
        let paramIndex = 2;
        let updateDetails = [`แก้ไขข้อมูลส่วนตัว`];

        // Handle Password Change
        if (new_password) {
            if (!current_password) {
                return NextResponse.json({
                    success: false,
                    message: 'กรุณาระบุรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนแปลง'
                }, { status: 400 });
            }

            // Verify current password
            const isValid = await bcrypt.compare(current_password, currentUser.password);
            if (!isValid) {
                return NextResponse.json({
                    success: false,
                    message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
                }, { status: 400 });
            }

            // Validate new password
            const passwordCheck = validatePassword(new_password);
            if (!passwordCheck.valid) {
                return NextResponse.json({
                    success: false,
                    message: passwordCheck.message
                }, { status: 400 });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
            query += `, password = $${paramIndex}`;
            params.push(hashedPassword);
            paramIndex++;
            updateDetails.push('เปลี่ยนรหัสผ่าน');
        }

        query += ` WHERE id = $${paramIndex}`;
        params.push(session.id);

        await executeQuery(query, params);

        // Log Activity
        await logActivity({
            userId: session.id,
            action: ACTIVITY_ACTIONS.UPDATE,
            entityType: ENTITY_TYPES.USER,
            entityId: session.id,
            details: updateDetails.join(', ')
        });

        return NextResponse.json({
            success: true,
            message: 'บันทึกข้อมูลเรียบร้อยแล้ว'
        });

    } catch (err) {
        return NextResponse.json({ success: false, message: safeErrorMessage(err) }, { status: 500 });
    }
}
