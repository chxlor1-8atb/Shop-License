/**
 * Activity Logger Utility
 * ใช้บันทึกกิจกรรมของผู้ใช้ลง audit_logs
 */

import { query } from '@/lib/db';
import { headers } from 'next/headers';

/**
 * Log an activity to the database
 * @param {Object} params - Activity parameters
 * @param {number|null} params.userId - User ID (null for system actions)
 * @param {string} params.action - Action type: LOGIN, CREATE, UPDATE, DELETE, LOGOUT
 * @param {string} params.entityType - Entity type: user, shop, license, license_type
 * @param {number|null} params.entityId - Entity ID
 * @param {string|null} params.details - Additional details
 */
export async function logActivity({ userId, action, entityType, entityId = null, details = null }) {
    try {
        // Get request headers for IP and user agent
        const headersList = await headers();
        const forwardedFor = headersList.get('x-forwarded-for');
        const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() :
            headersList.get('x-real-ip') || 'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, action, entityType, entityId, details, ipAddress, userAgent]
        );

        return true;
    } catch (error) {
        // Log error but don't throw - activity logging shouldn't break main functionality
        console.error('Failed to log activity:', error);
        return false;
    } finally {
        // Trigger auto-cleanup ~10% of the time (Fire-and-forget, non-blocking)
        if (Math.random() < 0.1) {
            cleanupOldLogs();
        }
    }
}

/**
 * Action types for activity logging
 */
export const ACTIVITY_ACTIONS = {
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    VIEW: 'VIEW',
    EXPORT: 'EXPORT'
};

/**
 * Entity types for activity logging
 */
export const ENTITY_TYPES = {
    USER: 'USER',
    SHOP: 'SHOP',
    LICENSE: 'LICENSE',
    LICENSE_TYPE: 'LICENSE_TYPE',
    NOTIFICATION: 'NOTIFICATION',
    SETTINGS: 'SETTINGS',
    AUTH: 'AUTH'
};

/**
 * Cleanup old logs (older than 30 days)
 * This runs with a low probability to avoid performance impact
 */
async function cleanupOldLogs() {
    try {
        // Postgres SQL to delete logs older than 30 days
        await query(`DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '30 days'`);
    } catch (error) {
        // Silent fail is acceptable for maintenance tasks
        console.error('Failed to cleanup old audit logs:', error);
    }
}
