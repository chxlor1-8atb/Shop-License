import { NextResponse } from 'next/server';
import { authenticateUser, createSession, logoutUser } from '@/lib/auth-service';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        switch (action) {
            case 'login':
                return await handleLogin(request);
            case 'logout':
                return await handleLogout();
            default:
                return NextResponse.json({ success: false, message: 'Invalid action' });
        }
    } catch (err) {
        console.error('Auth error:', err);
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดภายในระบบ' },
            { status: 500 }
        );
    }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action === 'check') {
            return await handleCheckAuth();
        }

        return NextResponse.json({ success: false, message: 'Invalid action' });
    } catch (err) {
        console.error('Auth error:', err);
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดภายในระบบ' },
            { status: 500 }
        );
    }
}

async function handleLogin(request) {
    try {
        const data = await request.json();
        const username = (data.username || '').trim();
        const password = data.password || '';

        const user = await authenticateUser(username, password);
        await createSession(user);

        return NextResponse.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
            },
        });
    } catch (error) {
        return NextResponse.json({
            success: false,
            message: error.message || 'เข้าสู่ระบบไม่สำเร็จ'
        });
    }
}

async function handleLogout() {
    try {
        await logoutUser();
        return new NextResponse(
            JSON.stringify({ success: true, message: 'ออกจากระบบสำเร็จ' }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            }
        );
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json(
            { success: false, message: 'เกิดข้อผิดพลาดในการออกจากระบบ' },
            { status: 500 }
        );
    }
}

async function handleCheckAuth() {
    // Ideally this should also be in auth-service as 'getSessionUser' but keeping here is acceptable for now
    // or I can move it to auth-service as getSessionUser() and return user or null.
    // But checkAuth returns a Response object in the original code? 
    // No, original checkAuth returned NextResponse.
    
    const cookieStore = await cookies();
    const session = await getIronSession(cookieStore, sessionOptions);

    if (session.userId) {
        return NextResponse.json({
            success: true,
            message: 'Authenticated',
            user: {
                id: session.userId,
                username: session.username,
                full_name: session.fullName,
                role: session.role,
            },
        });
    }

    return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 200 }
    );
}
