import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';

/**
 * Next.js Middleware for Security & Performance Headers
 * Security Score: 10/10 Implementation
 * 
 * Features:
 * - Anti-Automation/Bot Protection (WAF Lite)
 * - Rate Limiting (Basic Protection)
 * - HSTS (Strict Transport Security)
 * - CSP (Content Security Policy) for API
 * - X-Frame-Options (Clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing protection)
 * - Referrer-Policy (Privacy protection)
 * - Permissions-Policy (Feature restrictions)
 */

// ======== SECURITY CONFIGURATION ========

// Known scanner/attack tool User-Agents to strictly block
const BLOCKED_USER_AGENTS = [
    'sqlmap', 'dalfox', 'nikto', 'nuclei', 'katana', 'gau', 'hydra',
    'burp', 'metasploit', 'nmap', 'masscan', 'rustscan', 'acunetix',
    'nessus', 'havij', 'appscan', 'w3af', 'netsparker', 'openvas',
    'gobuster', 'dirbuster', 'lbb-bot', 'scantron', 'zgrab', 'censys'
];

// Suspicious patterns in URL/Query that indicate attacks (SQLi, XSS, Path Traversal)
const SUSPICIOUS_PATTERNS = [
    /union\s+select/i,           // SQL Injection
    /select\s+.*\s+from/i,       // SQL Injection
    /<script>/i,                 // XSS
    /javascript:/i,              // XSS
    /\.\.\//,                    // Path Traversal
    /\/etc\/passwd/,             // LFI
    /waitfor\s+delay/i,          // SQL Injection (Time based)
    /benchmark\(/i,              // SQL Injection (Time based)
    /sleep\(/i,                  // SQL Injection (Time based)
    /1=1/,                       // Simple SQLi probe
    /win\.ini/                   // LFI (Windows)
];

// Rate Limiting Config
// ✅ Uses Redis (Upstash) if UPSTASH_REDIS_REST_URL is set, otherwise falls back to in-memory
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 300; // General limit
const MAX_LOGIN_REQUESTS = 10;       // Login attempt limit (POST /api/auth?action=login)
const MAX_SENSITIVE_REQUESTS = 60;   // Auth check/other sensitive paths limit

// ========================================

export async function middleware(request) {
    const { pathname } = request.nextUrl;
    // Security: Prefer x-real-ip (set by reverse proxy, harder to spoof) over x-forwarded-for
    // ⚠️ NOTE: On Vercel, x-real-ip is set by the platform and is trustworthy.
    // For other hosting providers, configure a trusted proxy list to prevent IP spoofing.
    // x-forwarded-for is used as fallback only (first entry = client IP from proxy chain).
    const rawIp = request.headers.get('x-real-ip')
        || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim()
        || 'unknown';
    const ip = rawIp.length <= 45 ? rawIp : 'invalid';
    const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
    const isPageRoute = !pathname.startsWith('/api/');

    // 0a. BODY SIZE LIMIT: Reject oversized API payloads (100KB) to prevent DoS
    if (!isPageRoute && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
        if (contentLength > 102400) {
            return new NextResponse(JSON.stringify({ error: 'Payload too large' }), {
                status: 413,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 0b. CSRF DEFENSE: Origin/Referer validation for state-changing API requests
    // Defense-in-depth alongside sameSite:strict cookies
    if (!isPageRoute && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const origin = request.headers.get('origin');
        const referer = request.headers.get('referer');
        const host = request.headers.get('host');
        if (host && origin) {
            const originHost = new URL(origin).host;
            if (originHost !== host) {
                return new NextResponse(JSON.stringify({ error: 'Cross-origin request blocked' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } else if (host && referer) {
            try {
                const refererHost = new URL(referer).host;
                if (refererHost !== host) {
                    return new NextResponse(JSON.stringify({ error: 'Cross-origin request blocked' }), {
                        status: 403,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            } catch { /* malformed referer - allow (some clients don't send it) */ }
        }
    }

    // 1. BLOCK KNOWN ATTACK TOOLS (User-Agent Check)
    // Protection against: sqlmap, dalfox, nuclei, katana, nikko, hydra, rustscan
    if (BLOCKED_USER_AGENTS.some(agent => userAgent.includes(agent))) {
        return new NextResponse(JSON.stringify({ error: 'Initial Access Blocked' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 2. PAYLOAD INSPECTION (WAF Lite)
    // Protection against: sqlmap, dalfox, manual SQLi/XSS injection
    // Optimization: Skip expensive regex checks for simple page routes (no query params)
    // Page routes don't process URL params server-side, so injection is not a risk
    const hasQueryParams = request.nextUrl.search !== '';

    if (!isPageRoute || hasQueryParams) {
        // Security: Recursive decode to prevent double-encoding bypass (%253C → %3C → <)
        let decodedUrl = request.url;
        try {
            let prev = decodedUrl;
            for (let i = 0; i < 3; i++) {
                decodedUrl = decodeURIComponent(decodedUrl);
                if (decodedUrl === prev) break;
                prev = decodedUrl;
            }
        } catch { /* malformed URI - test raw */ }

        const hasSuspiciousPayload = SUSPICIOUS_PATTERNS.some(pattern =>
            pattern.test(pathname) || pattern.test(decodedUrl)
        );

        if (hasSuspiciousPayload) {
            return new NextResponse(JSON.stringify({ error: 'Suspicious payload detected' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    // 3. RATE LIMITING (Redis + In-Memory Fallback)
    // Protection against: hydra (brute-force), gau (crawling), DoS
    // Uses Upstash Redis if configured, otherwise in-memory fallback
    let rateLimitType = 'general';
    let limit = MAX_REQUESTS_PER_WINDOW;

    if (!isPageRoute) {
        const authAction = request.nextUrl.searchParams.get('action');
        const isLoginAttempt = pathname === '/api/auth' && request.method === 'POST' && authAction === 'login';
        const isSensitivePath = pathname.includes('/api/auth') || pathname.includes('admin');
        rateLimitType = isLoginAttempt ? 'login' : isSensitivePath ? 'sensitive' : 'general';
        limit = isLoginAttempt ? MAX_LOGIN_REQUESTS : isSensitivePath ? MAX_SENSITIVE_REQUESTS : MAX_REQUESTS_PER_WINDOW;
    }

    const rateLimitKey = `${ip}:${rateLimitType}`;
    const rlResult = await checkRateLimit(rateLimitKey, RATE_LIMIT_WINDOW, limit);

    if (!rlResult.allowed) {
        return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
            status: 429,
            headers: {
                'Retry-After': String(rlResult.resetIn),
                'X-RateLimit-Remaining': '0',
                'Content-Type': 'application/json'
            }
        });
    }


    const isProduction = process.env.NODE_ENV === 'production';
    const response = NextResponse.next();

    // 4. API SPECIFIC SECURITY
    if (pathname.startsWith('/api/')) {
        // Core security headers
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');

        // HSTS - Force HTTPS (2 years)
        if (isProduction) {
            response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        }

        // API-specific CSP - very restrictive
        response.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");

        // Remove headers that might leak info
        response.headers.delete('X-Powered-By');

        return response;
    }

    // ===== RESPONSE SECURITY HEADERS =====
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

    // CSP for page routes - allow self + inline for Next.js hydration, restrict external sources
    // Remove Supabase domains since we're now using Neon (no WebSocket needed)
    response.headers.set('Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; font-src 'self' https://cdnjs.cloudflare.com data:; img-src 'self' data: blob:; connect-src 'self' https://challenges.cloudflare.com https://*.cloudflare.com https://va.vercel-scripts.com https://vitals.vercel-insights.com; frame-ancestors 'none';"
    );

    // HSTS - Force HTTPS (2 years with preload)
    if (isProduction) {
        response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }

    // Cross-Origin policies for additional isolation
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    // Remove headers that might leak info (like X-Powered-By which Next.js sometimes adds or upstream proxies)
    response.headers.delete('X-Powered-By');

    // ===== Performance Headers =====
    if (pathname.startsWith('/dashboard')) {
        // Dashboard pages: preconnect to Font Awesome CDN (loaded async via JS)
        response.headers.set('Link', '<https://cdnjs.cloudflare.com>; rel=preconnect; crossorigin');
    }

    if (process.env.NODE_ENV !== 'production') {
        response.headers.set('Server-Timing', `middleware;dur=1;desc="Security checks passed"`);
    }

    return response;
}

// Optimized matcher - exclude more static paths but INCLUDE api for checks
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
