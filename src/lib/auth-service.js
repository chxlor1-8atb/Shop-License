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
// In-memory failed login tracker (per-instance; complements DB-level lockout if added later)
// ⚠️ SECURITY NOTE: This Map resets on cold starts and is NOT shared across serverless instances.
// For production hardening, migrate to Redis (Upstash) or DB-based lockout tracking.
// The middleware rate limiter (10 req/min for login) provides the primary brute-force protection.
const failedLogins = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
// Dummy hash for timing-safe comparison when user not found (VULN-16)
const DUMMY_HASH = '$2a$12$000000000000000000000uGQDEbG1sDh9B3AFIfKaXiNRPJiDnbbG';

export async function authenticateUser(username, password) {
    if (!username || !password) {
        throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
    }

    // Check lockout status
    const lockoutKey = username.toLowerCase();
    const lockoutData = failedLogins.get(lockoutKey);
    if (lockoutData && lockoutData.count >= MAX_FAILED_ATTEMPTS) {
        const elapsed = Date.now() - lockoutData.lastAttempt;
        if (elapsed < LOCKOUT_DURATION_MS) {
            const remainMin = Math.ceil((LOCKOUT_DURATION_MS - elapsed) / 60000);
            throw new Error(`บัญชีถูกล็อคชั่วคราว กรุณาลองใหม่ในอีก ${remainMin} นาที`);
        }
        // Lockout expired — reset
        failedLogins.delete(lockoutKey);
    }

    const user = await fetchOne(
        'SELECT * FROM users WHERE username = $1',
        [username]
    );

    if (!user) {
        // VULN-16: Timing-safe — run bcrypt compare even when user not found
        await bcrypt.compare(password, DUMMY_HASH);
        recordFailedLogin(lockoutKey);
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        recordFailedLogin(lockoutKey);
        throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    // Successful login — clear failed attempts
    failedLogins.delete(lockoutKey);

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

function recordFailedLogin(key) {
    const data = failedLogins.get(key) || { count: 0, lastAttempt: 0 };
    data.count++;
    data.lastAttempt = Date.now();
    failedLogins.set(key, data);
    // Cleanup: remove old entries if map grows too large
    if (failedLogins.size > 10000) {
        const now = Date.now();
        for (const [k, v] of failedLogins) {
            if (now - v.lastAttempt > LOCKOUT_DURATION_MS) failedLogins.delete(k);
        }
    }
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
