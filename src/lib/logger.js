
import { query } from '@/lib/db';

/**
 * Log an activity to the audit_logs table
 * @param {Object} params
 * @param {number|null} params.userId - ID of the user performing the action
 * @param {string} params.action - Action name (e.g. 'LOGIN', 'CREATE', 'DELETE')
 * @param {string} params.entityType - Type of entity affected (e.g. 'entity_records', 'users')
 * @param {string|number} params.entityId - ID of the affected entity
 * @param {Object} params.details - Additional details (e.g. changed fields)
 * @param {Request} params.req - The Next.js request object (optional, for IP/UA)
 */
export async function logActivity({ userId, action, entityType, entityId, details = {}, req = null }) {
    try {
        let ipAddress = null;
        let userAgent = null;

        if (req) {
            ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
            userAgent = req.headers.get('user-agent') || 'unknown';
        }

        await query(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, action, entityType, entityId?.toString(), JSON.stringify(details), ipAddress, userAgent]
        );
    } catch (error) {
        console.error('Failed to write audit log:', error);
        // Don't throw, logging shouldn't break the main flow
    }
}
