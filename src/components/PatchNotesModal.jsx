'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CHANGELOG, getChangeTypeBadge } from '@/constants/changelog';
import { formatThaiDate, formatThaiDateFull } from '@/utils/formatters';

/**
 * PatchNotesModal Component
 * Minimal Modern Glassmorphism Design
 */
export default function PatchNotesModal({ isOpen, onClose }) {
    const [selectedVersion, setSelectedVersion] = useState(null);

    useEffect(() => {
        if (isOpen && CHANGELOG.length > 0) {
            setSelectedVersion(CHANGELOG[0].version);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
                document.documentElement.style.overflow = originalHtmlStyle;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const selectedChangelog = CHANGELOG.find(c => c.version === selectedVersion) || CHANGELOG[0];
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
                            <i className="fas fa-scroll"></i>
                        </div>
                        <div>
                            <h2 className="pn-modal-title">Changelog</h2>
                            <p className="pn-modal-subtitle">ประวัติการอัปเดตระบบ</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="modal-close" aria-label="ปิด">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body pn-modal-body">
                    {/* Timeline Sidebar */}
                    <div className="pn-modal-sidebar">
                        <div className="pn-timeline-label">เวอร์ชัน</div>
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
                                    {idx === 0 && <span className="pn-new-dot"></span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Detail */}
                    <div className="pn-modal-detail">
                        {selectedChangelog && (
                            <>
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
        </div>,
        document.body
    );
}
