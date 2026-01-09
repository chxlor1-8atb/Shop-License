/**
 * API Endpoints Constants
 * Centralized API paths for maintainability
 */

export const API_ENDPOINTS = {
    // Auth
    AUTH: '/api/auth',

    // Core entities
    LICENSES: '/api/licenses',
    SHOPS: '/api/shops',
    USERS: '/api/users',
    LICENSE_TYPES: '/api/license-types',

    // Dashboard
    DASHBOARD_STATS: '/api/dashboard?action=stats',
    DASHBOARD_BREAKDOWN: '/api/dashboard?action=license_breakdown',
    DASHBOARD_ACTIVITY: '/api/dashboard?action=recent_activity',

    // Reports
    EXPIRING: '/api/expiring',

    // Notifications
    NOTIFICATIONS: '/api/notifications',

    // Activity Logs (Admin)
    ACTIVITY_LOGS: '/api/activity-logs'
};

/**
 * Default pagination values
 */
export const PAGINATION_DEFAULTS = {
    PAGE: 1,
    LIMIT: 20,
    LIMITS: [10, 20, 50, 100]
};

/**
 * HTTP Methods
 */
export const HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE'
};
