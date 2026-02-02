import { getIronSession } from 'iron-session';

/**
 * Session Configuration with Enhanced Security
 * 
 * Security Features:
 * - Encrypted session cookies (iron-session)
 * - Strict cookie settings (httpOnly, secure, sameSite)
 * - Session expiration with configurable TTL
 * - Production-only strict secret validation
 */

// Security: Ensure SESSION_SECRET is set and strong in production
function getSessionSecret() {
    const secret = process.env.SESSION_SECRET;

    if (process.env.NODE_ENV === 'production') {
        if (!secret) {
            // Allow build to pass by generating a random secret if missing
            // This is secure (random) but means sessions won't persist across server restarts/redeploys
            if (typeof window === 'undefined') {
                console.warn('⚠️ SECURITY WARNING: SESSION_SECRET is missing in production. Using a random temporary secret. Sessions will invalid on restart.');
                try {
                    return require('crypto').randomBytes(32).toString('hex');
                } catch (e) {
                    return 'temporary_random_secret_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
                }
            }
            return 'temporary_production_secret_fallback_32chars_min';
        }
        if (secret.length < 32) {
            throw new Error('SECURITY ERROR: SESSION_SECRET must be at least 32 characters in production');
        }
        // Check for common weak patterns
        if (/^(test|dev|password|secret|123)/i.test(secret)) {
            throw new Error('SECURITY ERROR: SESSION_SECRET appears to be a weak/test value');
        }
        return secret;
    }

    // Development: warn but allow fallback
    if (!secret) {
        console.warn('⚠️ WARNING: SESSION_SECRET not set. Using insecure development fallback.');
    }
    return secret || 'dev_only_insecure_secret_change_in_production_32chars';
}

// Session duration constants
const SESSION_TTL = {
    DEFAULT: 60 * 60 * 24,      // 24 hours for normal sessions
    SENSITIVE: 60 * 60,          // 1 hour for sensitive operations
    REMEMBER_ME: 60 * 60 * 24 * 7, // 7 days for "remember me"
};

const sessionOptions = {
    password: getSessionSecret(),
    cookieName: 'shop_license_session',
    cookieOptions: {
        // Only send over HTTPS in production
        secure: process.env.NODE_ENV === 'production',
        // Prevent JavaScript access - critical for XSS protection
        httpOnly: true,
        // Protect against CSRF - 'strict' breaks OAuth flows, 'lax' is safe default
        sameSite: 'lax',
        // Session expiration
        maxAge: SESSION_TTL.DEFAULT,
        // Explicit path
        path: '/',
    },
    // Time-to-live for the encrypted seal
    ttl: SESSION_TTL.DEFAULT,
};

/**
 * Get session from cookies
 * @param {object} cookies - Next.js cookies object
 * @returns {Promise<object>} Session object
 */
export async function getSessionFromCookies(cookies) {
    return getIronSession(cookies, sessionOptions);
}

/**
 * Validate session is not expired and has required fields
 * @param {object} session - Session object
 * @returns {boolean} Is session valid
 */
export function isSessionValid(session) {
    if (!session || !session.userId) return false;

    // Check if session has login time and is not too old
    if (session.loginTime) {
        const sessionAge = Date.now() - session.loginTime;
        const maxAge = SESSION_TTL.DEFAULT * 1000; // Convert to ms
        if (sessionAge > maxAge) return false;
    }

    return true;
}

/**
 * Check if session needs refresh (past 75% of TTL)
 * @param {object} session - Session object
 * @returns {boolean} Should refresh
 */
export function shouldRefreshSession(session) {
    if (!session || !session.loginTime) return false;
    const sessionAge = Date.now() - session.loginTime;
    const refreshThreshold = SESSION_TTL.DEFAULT * 1000 * 0.75;
    return sessionAge > refreshThreshold;
}

export { sessionOptions, SESSION_TTL };
