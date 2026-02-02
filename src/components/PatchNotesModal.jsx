'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CHANGELOG, getChangeTypeBadge, getLatestVersion } from '@/constants/changelog';
import { formatThaiDate, formatThaiDateFull } from '@/utils/formatters';

/**
 * PatchNotesModal Component
 * แสดง Modal Patch Notes/Changelog ให้ผู้ใช้เห็นว่ามีอะไรอัปเดตบ้าง
 */
export default function PatchNotesModal({ isOpen, onClose }) {
    const [selectedVersion, setSelectedVersion] = useState(null);

    useEffect(() => {
        if (isOpen && CHANGELOG.length > 0) {
            setSelectedVersion(CHANGELOG[0].version);
        }
    }, [isOpen]);

    // Prevent body scroll when modal is open
    // Prevent body scroll when modal is open
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
    
    // Safety check for document
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="modal-overlay show">
            <div
                className="modal modal-xl patch-notes-modal-content"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <i className="fas fa-clipboard-list" style={{ fontSize: '1.5rem', color: '#ea580c' }}></i>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Patch Notes</h2>
                            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                ประวัติการอัปเดตและแก้ไขบั๊ก
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="modal-close"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="patch-notes-container modal-body" style={{ padding: 0, display: 'flex', overflow: 'hidden' }}>
                    {/* Version List Sidebar */}
                    <div className="patch-notes-sidebar">
                        {CHANGELOG.map(log => (
                            <button
                                key={log.version}
                                onClick={() => setSelectedVersion(log.version)}
                                className={`patch-notes-version-btn ${selectedVersion === log.version ? 'active' : ''}`}
                            >
                                <div style={{ fontSize: '0.9375rem', fontWeight: '600' }}>
                                    v{log.version}
                                </div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                    {formatThaiDate(log.date)}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Change Details */}
                    <div className="patch-notes-detail">
                        {selectedChangelog && (
                            <>
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        marginBottom: '0.5rem',
                                        flexWrap: 'wrap'
                                    }}>
                                        <span style={{
                                            background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                            color: 'white',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            fontSize: '0.875rem',
                                            fontWeight: '600',
                                            boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)'
                                        }}>
                                            v{selectedChangelog.version}
                                        </span>
                                        <span style={{ color: '#64748b', fontSize: '0.9375rem' }}>
                                            {formatThaiDateFull(selectedChangelog.date)}
                                        </span>
                                    </div>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '1.5rem',
                                        color: '#1e293b',
                                        fontWeight: '700'
                                    }}>
                                        {selectedChangelog.title}
                                    </h3>
                                </div>

                                <ul style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    {selectedChangelog.changes.map((change, idx) => {
                                        const badge = getChangeTypeBadge(change.type);
                                        return (
                                            <li
                                                key={idx}
                                                className="patch-change-item"
                                            >
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
                                                <span style={{ color: '#334155', fontSize: '1rem', lineHeight: '1.5' }}>
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


            </div>
        </div>,
        document.body
    );
}


