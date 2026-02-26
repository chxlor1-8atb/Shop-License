'use client';

import { useState } from 'react';
import { CHANGELOG, getChangeTypeBadge } from '@/constants/changelog';
import { formatThaiDate, formatThaiDateFull } from '@/utils/formatters';

/**
 * DashboardPage Component
 * แสดง Patch Notes / Changelog แบบ inline
 */
export default function DashboardPage() {
    const [selectedVersion, setSelectedVersion] = useState(
        CHANGELOG.length > 0 ? CHANGELOG[0].version : null
    );

    const selectedChangelog = CHANGELOG.find(c => c.version === selectedVersion) || CHANGELOG[0];

    return (
        <div className="content-fade-in">
            {/* Patch Notes Header */}
            <div className="pn-page-header">
                <div className="pn-page-header-left">
                    <i className="fas fa-clipboard-list"></i>
                    <div>
                        <h2>Patch Notes</h2>
                        <p>ประวัติการอัปเดตและแก้ไขบั๊ก</p>
                    </div>
                </div>
                {selectedChangelog && (
                    <div className="pn-page-current-ver">
                        <span className="pn-page-ver-badge">
                            v{CHANGELOG[0].version}
                        </span>
                        <span className="pn-page-ver-date">
                            เวอร์ชันล่าสุด
                        </span>
                    </div>
                )}
            </div>

            {/* Patch Notes Content */}
            <div className="pn-page-container">
                {/* Version Sidebar */}
                <div className="pn-page-sidebar">
                    <div className="pn-page-sidebar-title">เวอร์ชันทั้งหมด</div>
                    <div className="pn-page-version-list">
                        {CHANGELOG.map(log => (
                            <button
                                key={log.version}
                                onClick={() => setSelectedVersion(log.version)}
                                className={`pn-page-version-btn ${selectedVersion === log.version ? 'active' : ''}`}
                            >
                                <div className="pn-page-version-num">v{log.version}</div>
                                <div className="pn-page-version-date">{formatThaiDate(log.date)}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Change Details */}
                <div className="pn-page-detail">
                    {selectedChangelog && (
                        <>
                            <div className="pn-page-detail-header">
                                <div className="pn-page-detail-meta">
                                    <span className="pn-page-detail-ver-badge">
                                        v{selectedChangelog.version}
                                    </span>
                                    <span className="pn-page-detail-date">
                                        {formatThaiDateFull(selectedChangelog.date)}
                                    </span>
                                </div>
                                <h3 className="pn-page-detail-title">{selectedChangelog.title}</h3>
                            </div>

                            <ul className="pn-page-changes-list">
                                {selectedChangelog.changes.map((change, idx) => {
                                    const badge = getChangeTypeBadge(change.type);
                                    return (
                                        <li key={idx} className="pn-page-change-item">
                                            <span className={`badge ${badge.class}`} style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                fontSize: '0.75rem',
                                                whiteSpace: 'nowrap',
                                                padding: '0.35rem 0.75rem',
                                                flexShrink: 0
                                            }}>
                                                <i className={badge.icon}></i>
                                                {badge.label}
                                            </span>
                                            <span className="pn-page-change-text">
                                                {change.text}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>
            </div>

            <style jsx>{`
                /* Page Header */
                .pn-page-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 1.25rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .pn-page-header-left {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .pn-page-header-left > i {
                    font-size: 1.75rem;
                    color: #ea580c;
                    background: rgba(234, 88, 12, 0.1);
                    width: 48px;
                    height: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                }
                .pn-page-header-left h2 {
                    margin: 0;
                    font-size: 1.35rem;
                    font-weight: 700;
                    color: var(--text-primary, #111827);
                }
                .pn-page-header-left p {
                    margin: 0;
                    font-size: 0.85rem;
                    color: var(--text-muted, #6b7280);
                }
                .pn-page-current-ver {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .pn-page-ver-badge {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    padding: 0.3rem 0.85rem;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
                }
                .pn-page-ver-date {
                    font-size: 0.8rem;
                    color: var(--text-muted, #6b7280);
                }

                /* Container */
                .pn-page-container {
                    display: flex;
                    background: #fff;
                    border-radius: 12px;
                    border: 1px solid var(--border-color, #e5e7eb);
                    overflow: hidden;
                    min-height: 500px;
                }

                /* Sidebar */
                .pn-page-sidebar {
                    width: 220px;
                    min-width: 220px;
                    border-right: 1px solid var(--border-color, #e5e7eb);
                    background: #fafafa;
                    display: flex;
                    flex-direction: column;
                }
                .pn-page-sidebar-title {
                    padding: 1rem 1.25rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--text-muted, #6b7280);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid var(--border-color, #e5e7eb);
                }
                .pn-page-version-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.5rem;
                }
                .pn-page-version-btn {
                    width: 100%;
                    text-align: left;
                    padding: 0.75rem 1rem;
                    border: none;
                    background: transparent;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.15s ease;
                    margin-bottom: 2px;
                }
                .pn-page-version-btn:hover {
                    background: rgba(249, 115, 22, 0.06);
                }
                .pn-page-version-btn.active {
                    background: rgba(249, 115, 22, 0.1);
                    border-left: 3px solid #ea580c;
                }
                .pn-page-version-num {
                    font-size: 0.9375rem;
                    font-weight: 600;
                    color: var(--text-primary, #111827);
                }
                .pn-page-version-btn.active .pn-page-version-num {
                    color: #ea580c;
                }
                .pn-page-version-date {
                    font-size: 0.75rem;
                    color: var(--text-muted, #9ca3af);
                    margin-top: 2px;
                }

                /* Detail */
                .pn-page-detail {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.75rem 2rem;
                    max-height: 70vh;
                }
                .pn-page-detail-header {
                    margin-bottom: 1.75rem;
                    padding-bottom: 1.25rem;
                    border-bottom: 1px solid var(--border-color, #e5e7eb);
                }
                .pn-page-detail-meta {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 0.5rem;
                    flex-wrap: wrap;
                }
                .pn-page-detail-ver-badge {
                    background: linear-gradient(135deg, #f97316, #ea580c);
                    color: white;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.875rem;
                    font-weight: 600;
                    box-shadow: 0 2px 8px rgba(249, 115, 22, 0.3);
                }
                .pn-page-detail-date {
                    color: #64748b;
                    font-size: 0.9375rem;
                }
                .pn-page-detail-title {
                    margin: 0;
                    font-size: 1.35rem;
                    color: #1e293b;
                    font-weight: 700;
                    line-height: 1.4;
                }

                /* Changes List */
                .pn-page-changes-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                }
                .pn-page-change-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    padding: 0.65rem 0;
                    border-bottom: 1px solid #f1f5f9;
                    transition: background 0.15s ease;
                }
                .pn-page-change-item:last-child {
                    border-bottom: none;
                }
                .pn-page-change-item:hover {
                    background: #fefce8;
                    margin: 0 -0.5rem;
                    padding-left: 0.5rem;
                    padding-right: 0.5rem;
                    border-radius: 6px;
                }
                .pn-page-change-text {
                    color: #334155;
                    font-size: 0.95rem;
                    line-height: 1.5;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .pn-page-container {
                        flex-direction: column;
                        min-height: auto;
                    }
                    .pn-page-sidebar {
                        width: 100%;
                        min-width: auto;
                        border-right: none;
                        border-bottom: 1px solid var(--border-color, #e5e7eb);
                    }
                    .pn-page-version-list {
                        display: flex;
                        flex-wrap: nowrap;
                        overflow-x: auto;
                        gap: 0.25rem;
                        padding: 0.5rem;
                    }
                    .pn-page-version-btn {
                        white-space: nowrap;
                        min-width: fit-content;
                        text-align: center;
                    }
                    .pn-page-version-btn.active {
                        border-left: none;
                        border-bottom: 3px solid #ea580c;
                    }
                    .pn-page-detail {
                        padding: 1.25rem 1rem;
                        max-height: none;
                    }
                    .pn-page-detail-title {
                        font-size: 1.1rem;
                    }
                    .pn-page-header-left > i {
                        width: 40px;
                        height: 40px;
                        font-size: 1.35rem;
                    }
                    .pn-page-header-left h2 {
                        font-size: 1.15rem;
                    }
                }
            `}</style>
        </div>
    );
}
