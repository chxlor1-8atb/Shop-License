'use client';

import { getLatestVersion } from '@/constants/changelog';

/**
 * Version Badge Component
 * แสดงป้ายเวอร์ชันปัจจุบันของระบบ คลิกเพื่อเปิด Release Notes
 */
export default function VersionBadge({ onClick }) {
    const latest = getLatestVersion();

    return (
        <button
            onClick={onClick}
            title="ดูบันทึกการเผยแพร่ (Release Notes)"
            className="version-badge"
            aria-label={`เวอร์ชัน ${latest?.version || '2.0.0'} — คลิกเพื่อดูประวัติการอัปเดต`}
        >
            <i className="fas fa-code-branch version-badge-icon" aria-hidden="true"></i>
            <span className="version-badge-label">เวอร์ชัน</span>
            <span className="version-badge-number">{latest?.version || '2.0.0'}</span>
        </button>
    );
}
