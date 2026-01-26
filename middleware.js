import { NextResponse } from 'next/server';

/**
 * Next.js Middleware for Security & Performance Headers
 * Optimized for minimal overhead
 */

export function middleware(request) {
    const { pathname } = request.nextUrl;

    // Skip middleware for API routes with their own caching
    // This reduces middleware overhead for API calls
    if (pathname.startsWith('/api/')) {
        return NextResponse.next();
    }

    const response = NextResponse.next();

    // ===== Security Headers =====
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');


    // ===== Performance Headers =====

    // Enable HTTP/2 Server Push hints for critical resources
    response.headers.set('Link', [
        '</image/shop-logo.png>; rel=preload; as=image',
    ].join(', '));

    // Server Timing (for debugging in DevTools)
    if (process.env.NODE_ENV !== 'production') {
        response.headers.set('Server-Timing', `middleware;dur=1;desc="Middleware processing"`);
    }

    return response;
}

// Optimized matcher - exclude more static paths
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico, favicon.png
         * - public folder assets
         */
        '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.png|image/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ttf|woff2?)$).*)',
    ],
};

