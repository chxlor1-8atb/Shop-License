/**
 * Rate Limiter with Redis (Upstash) + In-Memory Fallback
 * 
 * ✅ Edge Runtime compatible (ใช้ได้ใน Next.js middleware)
 * ✅ ถ้ามี UPSTASH_REDIS_REST_URL → ใช้ Redis (shared across instances, survives cold starts)
 * ✅ ถ้าไม่มี → fallback เป็น in-memory Map (เหมือนเดิม)
 * ✅ Redis error → auto-fallback เป็น in-memory ระบบไม่ล่ม
 */

import { Redis } from '@upstash/redis';

// ========================================
// Redis Client (lazy singleton)
// ========================================
let _redis = undefined; // undefined = not initialized, null = no config/failed

function getRedisClient() {
    if (_redis !== undefined) return _redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
        try {
            _redis = new Redis({ url, token });
        } catch {
            _redis = null;
        }
    } else {
        _redis = null;
    }

    return _redis;
}

// ========================================
// In-Memory Fallback (existing behavior)
// ========================================
const memoryStore = new Map();

function memoryRateLimit(key, windowMs, maxRequests) {
    const now = Date.now();
    let data = memoryStore.get(key);

    if (!data) {
        data = { count: 1, startTime: now };
        memoryStore.set(key, data);
        return { allowed: true, remaining: maxRequests - 1, resetIn: Math.ceil(windowMs / 1000) };
    }

    if (now - data.startTime > windowMs) {
        data.count = 1;
        data.startTime = now;
        return { allowed: true, remaining: maxRequests - 1, resetIn: Math.ceil(windowMs / 1000) };
    }

    data.count++;
    const remaining = Math.max(0, maxRequests - data.count);
    const resetIn = Math.ceil((data.startTime + windowMs - now) / 1000);

    return { allowed: data.count <= maxRequests, remaining, resetIn };
}

// Periodic cleanup (only in non-edge environments)
if (typeof globalThis !== 'undefined' && !globalThis._rlCleanup) {
    globalThis._rlCleanup = setInterval(() => {
        const now = Date.now();
        for (const [key, data] of memoryStore.entries()) {
            if (now - data.startTime > 120000) memoryStore.delete(key);
        }
    }, 60000);
}

// ========================================
// Redis Rate Limit (fixed window counter)
// ========================================
async function redisRateLimit(redis, key, windowMs, maxRequests) {
    const windowSec = Math.ceil(windowMs / 1000);
    const redisKey = `rl:${key}`;

    // INCR is atomic — perfect for rate limiting
    const count = await redis.incr(redisKey);

    if (count === 1) {
        // First request — set TTL
        await redis.expire(redisKey, windowSec);
    }

    const ttl = await redis.ttl(redisKey);
    const remaining = Math.max(0, maxRequests - count);

    return {
        allowed: count <= maxRequests,
        remaining,
        resetIn: ttl > 0 ? ttl : windowSec
    };
}

// ========================================
// Public API
// ========================================

/**
 * Check rate limit for a given key
 * @param {string} key - Rate limit key (e.g., "192.168.1.1:login")
 * @param {number} windowMs - Window duration in ms (e.g., 60000 = 1 min)
 * @param {number} maxRequests - Max requests allowed per window
 * @returns {Promise<{ allowed: boolean, remaining: number, resetIn: number }>}
 */
export async function checkRateLimit(key, windowMs, maxRequests) {
    const redis = getRedisClient();

    if (redis) {
        try {
            return await redisRateLimit(redis, key, windowMs, maxRequests);
        } catch {
            // Redis error → fallback silently
            return memoryRateLimit(key, windowMs, maxRequests);
        }
    }

    return memoryRateLimit(key, windowMs, maxRequests);
}

/**
 * @returns {boolean} true if using Redis, false if in-memory fallback
 */
export function isUsingRedis() {
    return getRedisClient() !== null;
}
