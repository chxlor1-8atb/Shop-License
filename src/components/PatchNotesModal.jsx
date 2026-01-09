'use client';

import { useState, useEffect } from 'react';
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

    if (!isOpen) return null;

    const selectedChangelog = CHANGELOG.find(c => c.version === selectedVersion) || CHANGELOG[0];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content patch-notes-modal"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '700px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div className="modal-header" style={{
                    background: 'linear-gradient(135deg, #f97316, #ea580c)',
                    color: 'white',
                    padding: '1.25rem 1.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <i className="fas fa-clipboard-list" style={{ fontSize: '1.5rem' }}></i>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Patch Notes</h2>
                            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem' }}>
                                ประวัติการอัปเดตและแก้ไขบั๊ก
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    display: 'flex',
                    flex: 1,
                    overflow: 'hidden',
                    background: '#f8fafc'
                }}>
                    {/* Version List Sidebar */}
                    <div style={{
                        width: '180px',
                        borderRight: '1px solid #e2e8f0',
                        background: 'white',
                        overflowY: 'auto',
                        padding: '0.5rem'
                    }}>
                        {CHANGELOG.map(log => (
                            <button
                                key={log.version}
                                onClick={() => setSelectedVersion(log.version)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: selectedVersion === log.version
                                        ? 'linear-gradient(135deg, #fff7ed, #ffedd5)'
                                        : 'transparent',
                                    color: selectedVersion === log.version ? '#ea580c' : '#64748b',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    marginBottom: '0.25rem',
                                    transition: 'all 0.2s ease',
                                    fontWeight: selectedVersion === log.version ? '600' : '400'
                                }}
                            >
                                <div style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                                    v{log.version}
                                </div>
                                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                    {formatThaiDate(log.date)}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Change Details */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '1.5rem'
                    }}>
                        {selectedChangelog && (
                            <>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        marginBottom: '0.5rem'
                                    }}>
                                        <span style={{
                                            background: 'linear-gradient(135deg, #f97316, #ea580c)',
                                            color: 'white',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '20px',
                                            fontSize: '0.875rem',
                                            fontWeight: '600'
                                        }}>
                                            v{selectedChangelog.version}
                                        </span>
                                        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                                            {formatThaiDateFull(selectedChangelog.date)}
                                        </span>
                                    </div>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '1.25rem',
                                        color: '#1e293b'
                                    }}>
                                        {selectedChangelog.title}
                                    </h3>
                                </div>

                                <ul style={{
                                    listStyle: 'none',
                                    padding: 0,
                                    margin: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem'
                                }}>
                                    {selectedChangelog.changes.map((change, idx) => {
                                        const badge = getChangeTypeBadge(change.type);
                                        return (
                                            <li
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '0.75rem',
                                                    padding: '0.75rem 1rem',
                                                    background: 'white',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <span className={`badge ${badge.class}`} style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.25rem',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    <i className={badge.icon}></i>
                                                    {badge.label}
                                                </span>
                                                <span style={{ color: '#334155', fontSize: '0.9375rem' }}>
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

                {/* Footer */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid #e2e8f0',
                    background: 'white',
                    display: 'flex',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{
                            background: 'linear-gradient(135deg, #f97316, #ea580c)'
                        }}
                    >
                        <i className="fas fa-check"></i> เข้าใจแล้ว
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Version Badge Component
 * ใช้แสดง version badge ที่คลิกแล้วเปิด Patch Notes
 */
export function VersionBadge({ onClick }) {
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
                transition: 'all 0.2s ease'
            }}
        >
            <i className="fas fa-code-branch"></i>
            v{latest?.version}
        </button>
    );
}
