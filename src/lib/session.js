import { getIronSession } from 'iron-session';

const sessionOptions = {
    password: process.env.SESSION_SECRET || 'change_this_to_a_complex_password_at_least_32_chars_long',
    cookieName: 'shop_license_session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day (86400 seconds)
    },
};

// Check for session secret in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    console.warn('⚠️ WARNING: SESSION_SECRET environment variable is not defined. Using default insecure secret.');
}

export async function getSessionFromCookies(cookies) {
    return getIronSession(cookies, sessionOptions);
}

export { sessionOptions };
