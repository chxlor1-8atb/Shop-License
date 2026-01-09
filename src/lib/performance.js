/**
 * Performance utilities for Neon database queries
 * Use these helpers to optimize and monitor query performance
 */

/**
 * Measure query execution time
 * Logs warning for slow queries (>100ms)
 */
export function measureQuery(queryName, queryFn) {
    return async (...args) => {
        const start = performance.now();
        try {
            const result = await queryFn(...args);
            const duration = performance.now() - start;
            
            // Log slow queries in development
            if (process.env.NODE_ENV !== 'production' && duration > 100) {
                console.warn(`[SLOW QUERY] ${queryName}: ${duration.toFixed(2)}ms`);
            }
            
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            console.error(`[QUERY ERROR] ${queryName} (${duration.toFixed(2)}ms):`, error);
            throw error;
        }
    };
}

/**
 * Simple in-memory cache for frequently accessed data
 * Use for data that doesn't change often (e.g., license types)
 */
class SimpleCache {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get value from cache or fetch it
     * @param {string} key - Cache key
     * @param {Function} fetchFn - Function to fetch data if not cached
     * @param {number} ttlMs - Time to live in milliseconds (default: 5 minutes)
     */
    async getOrFetch(key, fetchFn, ttlMs = 300000) {
        const cached = this.cache.get(key);
        
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }

        const data = await fetchFn();
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttlMs
        });

        return data;
    }

    /**
     * Invalidate a cache key
     */
    invalidate(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
    }
}

// Singleton cache instance
export const queryCache = new SimpleCache();

/**
 * Cache keys for consistent naming
 */
export const CACHE_KEYS = {
    LICENSE_TYPES: 'license-types',
    DASHBOARD_STATS: 'dashboard-stats',
};

/**
 * TTL values (in milliseconds)
 */
export const CACHE_TTL = {
    SHORT: 60 * 1000,        // 1 minute
    MEDIUM: 5 * 60 * 1000,   // 5 minutes
    LONG: 60 * 60 * 1000,    // 1 hour
};

/**
 * Debounce function for preventing rapid API calls
 */
export function debounce(fn, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
    };
}

/**
 * Throttle function for rate limiting
 */
export function throttle(fn, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            fn(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Batch multiple requests into single execution
 * Useful for reducing database round-trips
 */
export class RequestBatcher {
    constructor(batchFn, delay = 50) {
        this.batchFn = batchFn;
        this.delay = delay;
        this.pending = [];
        this.timeoutId = null;
    }

    add(item) {
        return new Promise((resolve, reject) => {
            this.pending.push({ item, resolve, reject });
            
            if (!this.timeoutId) {
                this.timeoutId = setTimeout(() => this.flush(), this.delay);
            }
        });
    }

    async flush() {
        const batch = this.pending;
        this.pending = [];
        this.timeoutId = null;

        if (batch.length === 0) return;

        try {
            const items = batch.map(b => b.item);
            const results = await this.batchFn(items);
            
            batch.forEach((b, i) => {
                b.resolve(results[i]);
            });
        } catch (error) {
            batch.forEach(b => b.reject(error));
        }
    }
}
