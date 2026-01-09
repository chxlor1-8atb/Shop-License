/**
 * API Response helpers สำหรับ optimize response size และ performance
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';

// ========================================
// Authentication Helpers
// ========================================

/**
 * Get current user session
 * @returns {Promise<{id: number, username: string, role: string, fullName: string} | null>}
 */
export async function getSession() {
    try {
        const cookieStore = await cookies();
        const session = await getIronSession(cookieStore, sessionOptions);
        
        if (!session.userId) {
            return null;
        }
        
        return {
            id: session.userId,
            username: session.username,
            role: session.role,
            fullName: session.fullName
        };
    } catch (error) {
        console.error('Session error:', error);
        return null;
    }
}

/**
 * Require authentication - returns error response if not authenticated
 * Usage: const authError = await requireAuth(); if (authError) return authError;
 * @returns {Promise<NextResponse | null>} - Returns error response or null if authenticated
 */
export async function requireAuth() {
    const session = await getSession();
    
    if (!session) {
        return NextResponse.json(
            { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' },
            { status: 401 }
        );
    }
    
    return null; // Authenticated
}

/**
 * Require admin role - returns error response if not admin
 * @returns {Promise<NextResponse | null>} - Returns error response or null if admin
 */
export async function requireAdmin() {
    const session = await getSession();
    
    if (!session) {
        return NextResponse.json(
            { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' },
            { status: 401 }
        );
    }
    
    if (session.role !== 'admin') {
        return NextResponse.json(
            { success: false, message: 'ต้องการสิทธิ์ผู้ดูแลระบบ' },
            { status: 403 }
        );
    }
    
    return null; // Authorized
}

/**
 * Get current user from session (for activity logging)
 * @returns {Promise<{id: number, username: string} | null>}
 */
export async function getCurrentUser() {
    const session = await getSession();
    return session ? { id: session.id, username: session.username } : null;
}

// ========================================
// API Response Helpers
// ========================================

/**
 * สร้าง optimized JSON response พร้อม caching headers
 */
export function jsonResponse(data, options = {}) {
    const {
        status = 200,
        cache = null,  // 'short' | 'medium' | 'long' | 'static' | null
        headers = {},
    } = options;

    const cacheHeaders = getCacheHeaders(cache);

    return NextResponse.json(data, {
        status,
        headers: {
            ...cacheHeaders,
            ...headers,
        }
    });
}

/**
 * สร้าง error response
 */
export function errorResponse(message, status = 500) {
    return NextResponse.json(
        { success: false, message },
        { status }
    );
}

/**
 * Get cache headers based on cache type
 */
function getCacheHeaders(cacheType) {
    switch (cacheType) {
        case 'short':
            // 1 minute, stale for 5 minutes
            return {
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
            };
        case 'medium':
            // 5 minutes, stale for 30 minutes
            return {
                'Cache-Control': 's-maxage=300, stale-while-revalidate=1800',
            };
        case 'long':
            // 1 hour, stale for 24 hours
            return {
                'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
            };
        case 'static':
            // 1 day, immutable
            return {
                'Cache-Control': 'public, max-age=86400, immutable',
            };
        default:
            return {};
    }
}

/**
 * ลด response payload โดยเลือกเฉพาะ fields ที่ต้องการ
 */
export function selectFields(objects, fields) {
    if (!Array.isArray(objects)) {
        return objects ? pick(objects, fields) : objects;
    }
    return objects.map(obj => pick(obj, fields));
}

/**
 * Helper: Pick specific fields from object
 */
function pick(obj, fields) {
    const result = {};
    for (const field of fields) {
        if (field in obj) {
            result[field] = obj[field];
        }
    }
    return result;
}

/**
 * Pagination helper
 */
export function paginateResults(items, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);
    
    return {
        items: paginatedItems,
        pagination: {
            page,
            limit,
            total: items.length,
            totalPages: Math.ceil(items.length / limit),
            hasNext: offset + limit < items.length,
            hasPrev: page > 1,
        }
    };
}

/**
 * Validate required fields
 */
export function validateRequired(body, requiredFields) {
    const missing = requiredFields.filter(field => !body[field]);
    if (missing.length > 0) {
        return {
            valid: false,
            error: `Missing required fields: ${missing.join(', ')}`
        };
    }
    return { valid: true };
}

/**
 * Rate limiting helper (simple in-memory)
 */
const rateLimitMap = new Map();

export function checkRateLimit(key, limit = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    const current = rateLimitMap.get(key) || [];
    const recent = current.filter(time => time > windowStart);
    
    if (recent.length >= limit) {
        return { allowed: false, remaining: 0 };
    }
    
    recent.push(now);
    rateLimitMap.set(key, recent);
    
    return { allowed: true, remaining: limit - recent.length };
}

/**
 * Request logging helper (for debugging slow requests)
 */
export function logRequest(req, startTime) {
    const duration = Date.now() - startTime;
    const url = new URL(req.url);
    
    if (duration > 500) {
        console.warn(`[SLOW REQUEST] ${req.method} ${url.pathname}: ${duration}ms`);
    }
}
