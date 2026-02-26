'use client';

import { useState } from 'react';
import { CHANGELOG, getChangeTypeBadge } from '@/constants/changelog';
import { formatThaiDate, formatThaiDateFull } from '@/utils/formatters';

/**
 * DashboardPage Component
 * แสดง Patch Notes / Changelog แบบ inline - Minimal Modern Design
 */
export default function DashboardPage() {
    const [selectedVersion, setSelectedVersion] = useState(
        CHANGELOG.length > 0 ? CHANGELOG[0].version : null
    );

    const selectedChangelog = CHANGELOG.find(c => c.version === selectedVersion) || CHANGELOG[0];

    return (
        <div className="content-fade-in">
            {/* Patch Notes Header - Minimal */}
            <div className="pn-header">
                <div className="pn-header-info">
                    <div className="pn-header-icon">
                        <i className="fas fa-scroll"></i>
                    </div>
                    <div>
                        <h2 className="pn-header-title">Changelog</h2>
                        <p className="pn-header-desc">ประวัติการอัปเดตระบบ</p>
                    </div>
                </div>
                <div className="pn-header-badge">
                    <span className="pn-latest-tag">Latest</span>
                    <span className="pn-latest-ver">v{CHANGELOG[0]?.version}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="pn-layout">
                {/* Timeline Sidebar */}
                <div className="pn-timeline">
                    <div className="pn-timeline-label">เวอร์ชัน</div>
                    <div className="pn-timeline-list">
                        {CHANGELOG.map((log, idx) => (
                            <button
                                key={log.version}
                                onClick={() => setSelectedVersion(log.version)}
                                className={`pn-timeline-item ${selectedVersion === log.version ? 'active' : ''}`}
                            >
                                <div className="pn-timeline-dot"></div>
                                <div className="pn-timeline-content">
                                    <span className="pn-timeline-ver">v{log.version}</span>
                                    <span className="pn-timeline-date">{formatThaiDate(log.date)}</span>
                                </div>
                                {idx === 0 && <span className="pn-new-dot"></span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Detail Panel */}
                <div className="pn-content">
                    {selectedChangelog && (
                        <>
                            {/* Version Header */}
                            <div className="pn-content-header">
                                <div className="pn-content-meta">
                                    <span className="pn-ver-pill">v{selectedChangelog.version}</span>
                                    <span className="pn-content-date">
                                        <i className="far fa-calendar-alt"></i>
                                        {formatThaiDateFull(selectedChangelog.date)}
                                    </span>
                                </div>
                                <h3 className="pn-content-title">{selectedChangelog.title}</h3>
                            </div>

                            {/* Changes */}
                            <div className="pn-changes">
                                {selectedChangelog.changes.map((change, idx) => {
                                    const badge = getChangeTypeBadge(change.type);
                                    return (
                                        <div
                                            key={idx}
                                            className="pn-change-card"
                                            style={{ animationDelay: `${idx * 0.04}s` }}
                                        >
                                            <span className={`pn-change-badge pn-badge-${change.type}`}>
                                                <i className={badge.icon}></i>
                                                {badge.label}
                                            </span>
                                            <span className="pn-change-desc">{change.text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
