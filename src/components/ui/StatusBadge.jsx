'use client';

import { STATUS_LABELS, STATUS_BADGE_CLASSES } from '@/constants/status';

/**
 * StatusBadge Component
 * Displays a styled badge based on status value
 * Single Responsibility: Only renders status badges
 * 
 * @param {string} status - Status value (e.g., 'active', 'expired')
 * @param {string} className - Additional CSS classes
 */
export default function StatusBadge({ status, className = '' }) {
    const label = STATUS_LABELS[status] || status;
    const badgeClass = STATUS_BADGE_CLASSES[status] || '';

    return (
        <span className={`badge ${badgeClass} ${className}`.trim()}>
            {label}
        </span>
    );
}
