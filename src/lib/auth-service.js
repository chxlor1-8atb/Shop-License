import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { fetchOne } from '@/lib/db';
import { sessionOptions, SESSION_TTL } from '@/lib/session';
import { logActivity, ACTIVITY_ACTIONS, ENTITY_TYPES } from '@/lib/activityLogger';

/**
 * Authenticate a user by username and password.
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<object>} The authenticated user object (without password).
 * @throws {Error} If authentication fails.
 */
export async function authenticateUser(username, password) {
    if (!username || !password) {
        throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    }

    const user = await fetchOne(
        'SELECT * FROM users WHERE username = $1',
        [username]
    );

    if (!user) {
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

/**
 * Create a session for the given user.
 * @param {object} user 
 * @param {object} options
 * @param {boolean} options.rememberMe - Extend session to 7 days
 */
export async function createSession(user, options = {}) {
    const { rememberMe = false } = options;
    const cookieStore = await cookies();

    const opts = { ...sessionOptions };
    if (rememberMe) {
        opts.ttl = SESSION_TTL.REMEMBER_ME;
        opts.cookieOptions = {
            ...sessionOptions.cookieOptions,
            maxAge: SESSION_TTL.REMEMBER_ME,
        };
    }

    const session = await getIronSession(cookieStore, opts);

    session.userId = user.id;
    session.username = user.username;
    session.fullName = user.full_name;
    session.role = user.role;
    session.loginTime = Date.now();
    session.rememberMe = rememberMe;
    await session.save();

    await logActivity({
        userId: user.id,
        action: ACTIVITY_ACTIONS.LOGIN,
        entityType: ENTITY_TYPES.AUTH,
        details: `เข้าสู่ระบบด้วยชื่อผู้ใช้: ${user.username}`
    });

    return session;
}

/**
 * Log out the current user and destroy the session.
 */
export async function logoutUser() {
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    if (session.userId) {
        await logActivity({
            userId: session.userId,
            action: ACTIVITY_ACTIONS.LOGOUT,
            entityType: ENTITY_TYPES.AUTH,
            details: `ออกจากระบบ: ${session.username}`
        });
    }

    await session.destroy();
}
