'use client';

import { getLatestVersion } from '@/constants/changelog';

/**
 * Version Badge Component
 * Displays a clickable version badge that triggers the Patch Notes modal
 */
export default function VersionBadge({ onClick }) {
    const latest = getLatestVersion();

    return (
        <button
            onClick={onClick}
            title="ดู Patch Notes"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.25rem 0.625rem',
                background: 'linear-gradient(135deg, #fff7ed, #ffedd5)',
                border: '1px solid #fed7aa',
                borderRadius: '20px',
                color: '#ea580c',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap'
            }}
        >
            <i className="fas fa-code-branch"></i>
            v{latest?.version || '1.0.0'}
        </button>
    );
}
