/**
 * Data Cache utilities using Next.js unstable_cache
 * ใช้สำหรับ cache database queries ที่ไม่เปลี่ยนบ่อย
 */

import { unstable_cache } from 'next/cache';
import { fetchAll, fetchOne } from '@/lib/db';

// ===== Cache Tags =====
export const CACHE_TAGS = {
    LICENSE_TYPES: 'license-types',
    SHOPS: 'shops',
    DASHBOARD_STATS: 'dashboard-stats',
    LICENSES: 'licenses',
};

// ===== Cache Durations (seconds) =====
export const CACHE_DURATION = {
    SHORT: 60,          // 1 minute
    MEDIUM: 300,        // 5 minutes
    LONG: 3600,         // 1 hour
    VERY_LONG: 86400,   // 24 hours
};

// ===== Cached Queries =====

/**
 * Get all license types with caching (1 hour)
 */
export const getCachedLicenseTypes = unstable_cache(
    async () => {
        const query = `
            SELECT lt.*, 
            (SELECT COUNT(*) FROM licenses l WHERE l.license_type_id = lt.id) as license_count
            FROM license_types lt
            ORDER BY lt.id ASC
        `;
        return await fetchAll(query);
    },
    ['license-types-all'],
    {
        revalidate: CACHE_DURATION.LONG,
        tags: [CACHE_TAGS.LICENSE_TYPES]
    }
);

/**
 * Get single license type with caching
 */
export const getCachedLicenseType = unstable_cache(
    async (id) => {
        return await fetchOne('SELECT * FROM license_types WHERE id = $1', [id]);
    },
    ['license-type-single'],
    {
        revalidate: CACHE_DURATION.LONG,
        tags: [CACHE_TAGS.LICENSE_TYPES]
    }
);

/**
 * Get all shops with caching (5 minutes)
 */
export const getCachedShops = unstable_cache(
    async () => {
        return await fetchAll('SELECT id, shop_name, owner_name, phone FROM shops ORDER BY shop_name ASC');
    },
    ['shops-all'],
    {
        revalidate: CACHE_DURATION.MEDIUM,
        tags: [CACHE_TAGS.SHOPS]
    }
);

/**
 * Helper: Get warning days from notification_settings (not cached by unstable_cache)
 */
export async function getWarningDays() {
    try {
        const settings = await fetchOne('SELECT days_before_expiry FROM notification_settings WHERE id = 1');
        return parseInt(settings?.days_before_expiry) || 30;
    } catch {
        return 30;
    }
}

/**
 * Get dashboard stats with caching (1 minute)
 * @param {number} warningDays - days before expiry for "expiring soon" count
 */
export const getCachedDashboardStats = unstable_cache(
    async (warningDays = 30) => {
        // Dashboard stats: ใช้ computed status จาก expiry_date
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM shops) as total_shops,
                (SELECT COUNT(*) FROM licenses) as total_licenses,
                (SELECT COUNT(*) FROM licenses WHERE (expiry_date >= CURRENT_DATE OR expiry_date IS NULL) AND status NOT IN ('suspended', 'revoked')) as active_licenses,
                (SELECT COUNT(*) FROM licenses WHERE expiry_date < CURRENT_DATE AND expiry_date IS NOT NULL AND status NOT IN ('suspended', 'revoked')) as expired_licenses,
                (SELECT COUNT(*) FROM licenses WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int) AND status NOT IN ('suspended', 'revoked')) as expiring_soon,
                (SELECT COUNT(*) FROM users) as total_users
        `;
        return await fetchOne(query, [warningDays]);
    },
    ['dashboard-stats'],
    {
        revalidate: CACHE_DURATION.SHORT,
        tags: [CACHE_TAGS.DASHBOARD_STATS]
    }
);

/**
 * Get license breakdown by type with caching (1 minute)
 */
export const getCachedLicenseBreakdown = unstable_cache(
    async (warningDays = 30) => {
        // License breakdown: ใช้ computed status จาก expiry_date
        const query = `
            SELECT 
                lt.id,
                lt.name as type_name,
                COUNT(l.id) as total_count,
                SUM(CASE WHEN (l.expiry_date >= CURRENT_DATE OR l.expiry_date IS NULL) AND l.status NOT IN ('suspended', 'revoked') THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN l.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int) AND l.status NOT IN ('suspended', 'revoked') THEN 1 ELSE 0 END) as expiring_count,
                SUM(CASE WHEN l.expiry_date < CURRENT_DATE AND l.expiry_date IS NOT NULL AND l.status NOT IN ('suspended', 'revoked') THEN 1 ELSE 0 END) as expired_count
            FROM license_types lt
            LEFT JOIN licenses l ON lt.id = l.license_type_id
            GROUP BY lt.id, lt.name
            ORDER BY total_count DESC
        `;
        return await fetchAll(query, [warningDays]);
    },
    ['license-breakdown'],
    {
        revalidate: CACHE_DURATION.SHORT,
        tags: [CACHE_TAGS.DASHBOARD_STATS, CACHE_TAGS.LICENSES]
    }
);

/**
 * Get expiring count with caching (1 minute)
 */
export const getCachedExpiringCount = unstable_cache(
    async (warningDays = 30) => {
        // Expiring count: นับจาก expiry_date โดยตัดสถานะ suspended/revoked ออก
        const result = await fetchOne(
            `SELECT COUNT(*) as count FROM licenses WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($1::int) AND status NOT IN ('suspended', 'revoked')`,
            [warningDays]
        );
        return parseInt(result?.count || 0);
    },
    ['expiring-count'],
    {
        revalidate: CACHE_DURATION.SHORT,
        tags: [CACHE_TAGS.LICENSES]
    }
);
