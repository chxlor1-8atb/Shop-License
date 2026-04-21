'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CHANGELOG, getChangeTypeBadge } from '@/constants/changelog';
import { formatThaiDate, formatThaiDateFull } from '@/utils/formatters';

/**
 * PatchNotesModal — Professional Release Notes UI
 *
 * โครงสร้าง:
 *   ซ้าย: Timeline ของทุกเวอร์ชัน
 *   ขวา: รายละเอียดเวอร์ชันที่เลือก
 *         - Meta (version + date)
 *         - Title + Summary
 *         - Highlights (จุดสำคัญสำหรับอ่านคร่าวๆ)
 *         - Changes (แบ่งเป็นหมวดหมู่ด้วย type='section')
 */
export default function PatchNotesModal({ isOpen, onClose }) {
    const [selectedVersion, setSelectedVersion] = useState(null);

    useEffect(() => {
        if (isOpen && CHANGELOG.length > 0) {
            setSelectedVersion(CHANGELOG[0].version);
        }
    }, [isOpen]);

    // Lock body scroll while modal is open
    useEffect(() => {
        if (isOpen) {
            const originalBody = document.body.style.overflow;
            const originalHtml = document.documentElement.style.overflow;
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalBody;
                document.documentElement.style.overflow = originalHtml;
            };
        }
    }, [isOpen]);

    const selectedChangelog = useMemo(
        () => CHANGELOG.find(c => c.version === selectedVersion) || CHANGELOG[0],
        [selectedVersion]
    );

    // นับจำนวน changes แต่ละประเภท (ไม่รวม section) สำหรับ stat badges
    const stats = useMemo(() => {
        if (!selectedChangelog) return null;
        const c = { feature: 0, improve: 0, fix: 0, security: 0, perf: 0 };
        selectedChangelog.changes.forEach(ch => {
            if (ch.type in c) c[ch.type]++;
        });
        return c;
    }, [selectedChangelog]);

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="modal-overlay show" onClick={onClose}>
            <div
                className="modal modal-xl pn-modal"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header pn-modal-header">
                    <div className="pn-modal-header-left">
                        <div className="pn-modal-icon">
                            <i className="fas fa-clipboard-list"></i>
                        </div>
                        <div>
                            <h2 className="pn-modal-title">บันทึกการเผยแพร่ (Release Notes)</h2>
                            <p className="pn-modal-subtitle">ประวัติการปรับปรุงและอัปเดตระบบ</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close" aria-label="ปิด">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body pn-modal-body">
                    {/* Timeline Sidebar */}
                    <aside className="pn-modal-sidebar">
                        <div className="pn-timeline-label">เวอร์ชันทั้งหมด</div>
                        <div className="pn-modal-sidebar-list">
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
                                    {idx === 0 && <span className="pn-latest-pill">ล่าสุด</span>}
                                </button>
                            ))}
                        </div>

                        <div className="pn-sidebar-footer">
                            <div className="pn-sidebar-footer-label">จัดทำโดย</div>
                            <div className="pn-sidebar-footer-value">สำนักงานเทศบาลเมืองนางรอง</div>
                        </div>
                    </aside>

                    {/* Detail */}
                    <main className="pn-modal-detail">
                        {selectedChangelog && (
                            <>
                                {/* Content Header */}
                                <header className="pn-content-header">
                                    <div className="pn-content-meta">
                                        <span className="pn-ver-pill">เวอร์ชัน {selectedChangelog.version}</span>
                                        <span className="pn-content-date">
                                            <i className="far fa-calendar-alt"></i>
                                            เผยแพร่เมื่อ {formatThaiDateFull(selectedChangelog.date)}
                                        </span>
                                    </div>
                                    <h3 className="pn-content-title">{selectedChangelog.title}</h3>

                                    {/* Summary Box */}
                                    {selectedChangelog.summary && (
                                        <div className="pn-summary-box">
                                            <div className="pn-summary-label">
                                                <i className="fas fa-align-left"></i>
                                                บทสรุป
                                            </div>
                                            <p className="pn-summary-text">{selectedChangelog.summary}</p>
                                        </div>
                                    )}

                                    {/* Stat Badges */}
                                    {stats && (
                                        <div className="pn-stat-row">
                                            {stats.feature > 0 && (
                                                <span className="pn-stat pn-stat-feature">
                                                    <i className="fas fa-star"></i>
                                                    ฟีเจอร์ใหม่ {stats.feature}
                                                </span>
                                            )}
                                            {stats.improve > 0 && (
                                                <span className="pn-stat pn-stat-improve">
                                                    <i className="fas fa-wand-magic-sparkles"></i>
                                                    ปรับปรุง {stats.improve}
                                                </span>
                                            )}
                                            {stats.fix > 0 && (
                                                <span className="pn-stat pn-stat-fix">
                                                    <i className="fas fa-bug"></i>
                                                    แก้ไขข้อผิดพลาด {stats.fix}
                                                </span>
                                            )}
                                            {stats.perf > 0 && (
                                                <span className="pn-stat pn-stat-perf">
                                                    <i className="fas fa-bolt"></i>
                                                    ประสิทธิภาพ {stats.perf}
                                                </span>
                                            )}
                                            {stats.security > 0 && (
                                                <span className="pn-stat pn-stat-security">
                                                    <i className="fas fa-shield-halved"></i>
                                                    ความปลอดภัย {stats.security}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </header>

                                {/* Highlights */}
                                {selectedChangelog.highlights && selectedChangelog.highlights.length > 0 && (
                                    <section className="pn-highlights">
                                        <div className="pn-section-title">
                                            <i className="fas fa-bookmark"></i>
                                            <span>จุดสำคัญในเวอร์ชันนี้</span>
                                        </div>
                                        <ol className="pn-highlight-list">
                                            {selectedChangelog.highlights.map((h, idx) => (
                                                <li key={idx} className="pn-highlight-item">
                                                    <span className="pn-highlight-num">{idx + 1}</span>
                                                    <span className="pn-highlight-text">{h}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    </section>
                                )}

                                {/* Changes — Full Details */}
                                <section className="pn-changes-section">
                                    <div className="pn-section-title">
                                        <i className="fas fa-list-check"></i>
                                        <span>รายละเอียดการเปลี่ยนแปลงทั้งหมด</span>
                                    </div>

                                    <div className="pn-changes">
                                        {selectedChangelog.changes.map((change, idx) => {
                                            // Section heading — render as divider
                                            if (change.type === 'section') {
                                                return (
                                                    <div key={idx} className="pn-change-section-heading">
                                                        <span className="pn-change-section-text">{change.text}</span>
                                                    </div>
                                                );
                                                }

                                            const badge = getChangeTypeBadge(change.type);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="pn-change-card"
                                                    style={{ animationDelay: `${Math.min(idx * 0.02, 0.5)}s` }}
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
                                </section>

                                {/* Document Footer */}
                                <footer className="pn-doc-footer">
                                    <div className="pn-doc-footer-line"></div>
                                    <p className="pn-doc-footer-text">
                                        เอกสารอิเล็กทรอนิกส์นี้จัดทำโดยระบบบริหารจัดการใบอนุญาตร้านค้า
                                        สำนักงานเทศบาลเมืองนางรอง · เวอร์ชัน {selectedChangelog.version}
                                    </p>
                                </footer>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>,
        document.body
    );
}
