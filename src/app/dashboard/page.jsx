'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/constants';
import { formatThaiDate } from '@/utils/formatters';

/**
 * DashboardPage Component
 */
export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [breakdown, setBreakdown] = useState([]);
    const [expiring, setExpiring] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    const initializedRef = useRef(false);

    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            fetchAll();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchAll = async () => {
        try {
            const [authRes, statsRes, breakdownRes, expiringRes] = await Promise.all([
                fetch(API_ENDPOINTS.AUTH + '?action=check', { credentials: 'include' }),
                fetch(API_ENDPOINTS.DASHBOARD_STATS, { credentials: 'include' }),
                fetch(API_ENDPOINTS.DASHBOARD_BREAKDOWN, { credentials: 'include' }),
                fetch(API_ENDPOINTS.EXPIRING, { credentials: 'include' }),
            ]);
            const [authData, statsData, breakdownData, expiringData] = await Promise.all([
                authRes.json(), statsRes.json(), breakdownRes.json(), expiringRes.json(),
            ]);
            if (authData.success) setUser(authData.user);
            if (statsData.success) setStats(statsData.stats);
            if (breakdownData.success) setBreakdown(breakdownData.breakdown || []);
            if (expiringData.success) setExpiring(expiringData.licenses || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <DashboardSkeleton />;
    if (error) return <div className="error-message">{error}</div>;
    if (!stats) return null;

    const hasIssues = stats.expired_licenses > 0 || stats.expiring_soon > 0;

    return (
        <div className="content-fade-in">
            {/* Overview Stats Row */}
            <div className="card mb-3" style={{ border: 'none', boxShadow: 'none' }}>
                <div className="card-body" style={{ padding: '0.5rem' }}>
                    <div className="db-stats-row">
                        {[
                            { icon: 'fas fa-store', value: stats.total_shops, label: 'ร้านค้าทั้งหมด', colorClass: 'primary' },
                            { icon: 'fas fa-file-alt', value: stats.total_licenses, label: 'ใบอนุญาตทั้งหมด', colorClass: 'info' },
                            { icon: 'fas fa-check-circle', value: stats.active_licenses, label: 'ใบอนุญาตที่ใช้งาน', colorClass: 'success' },
                            { icon: 'fas fa-exclamation-triangle', value: stats.expiring_soon, label: `ใกล้หมดอายุ (${stats.expiry_warning_days} วัน)`, colorClass: 'warning' },
                            { icon: 'fas fa-times-circle', value: stats.expired_licenses, label: 'หมดอายุแล้ว', colorClass: 'danger' },
                        ].map((card, i) => (
                            <div key={i} className="db-stat-item">
                                <div className={`db-stat-icon ${card.colorClass}`}>
                                    <i className={card.icon}></i>
                                </div>
                                <div className="db-stat-content">
                                    <div className="db-stat-value">{card.value}</div>
                                    <div className="db-stat-label">{card.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="db-grid">
                {/* Needs Attention */}
                <div className="db-card">
                    <div className="db-card-header">
                        <h3><i className="fas fa-bell" style={{ marginRight: '0.5rem', color: hasIssues ? '#f59e0b' : '#10b981' }}></i>
                            {hasIssues ? 'ต้องดำเนินการ' : 'ไม่มีรายการเร่งด่วน'}
                        </h3>
                        {expiring.length > 0 && (
                            <Link href="/dashboard/expiring" className="db-card-link">ดูทั้งหมด <i className="fas fa-chevron-right"></i></Link>
                        )}
                    </div>
                    <div className="db-card-body">
                        {expiring.length === 0 ? (
                            <div className="db-empty">
                                <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#10b981', marginBottom: '0.5rem' }}></i>
                                <p>ใบอนุญาตทั้งหมดยังไม่หมดอายุ</p>
                            </div>
                        ) : (
                            <div className="db-table-wrap">
                                <table className="db-table">
                                    <thead>
                                        <tr>
                                            <th>ร้านค้า</th>
                                            <th>เลขที่ใบอนุญาต</th>
                                            <th>ประเภท</th>
                                            <th>วันหมดอายุ</th>
                                            <th>สถานะ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {expiring.slice(0, 8).map((lic) => {
                                            const days = parseInt(lic.days_until_expiry);
                                            const isExpired = days < 0;
                                            return (
                                                <tr key={lic.id}>
                                                    <td className="db-td-primary">{lic.shop_name || '-'}</td>
                                                    <td>{lic.license_number || '-'}</td>
                                                    <td>{lic.type_name || '-'}</td>
                                                    <td>{formatThaiDate(lic.expiry_date)}</td>
                                                    <td>
                                                        <span className={`db-badge ${isExpired ? 'danger' : 'warning'}`}>
                                                            {isExpired ? `หมดอายุ ${Math.abs(days)} วัน` : `เหลือ ${days} วัน`}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* License Breakdown by Type */}
                <div className="db-card db-card-narrow">
                    <div className="db-card-header">
                        <h3><i className="fas fa-tags" style={{ marginRight: '0.5rem', color: '#4f46e5' }}></i>สรุปตามประเภท</h3>
                    </div>
                    <div className="db-card-body">
                        {breakdown.length === 0 ? (
                            <div className="db-empty">
                                <p>ยังไม่มีข้อมูลประเภทใบอนุญาต</p>
                            </div>
                        ) : (
                            <div className="db-breakdown-list">
                                {breakdown.map((item) => {
                                    const total = parseInt(item.total_count) || 0;
                                    const active = parseInt(item.active_count) || 0;
                                    const expCount = parseInt(item.expiring_count) || 0;
                                    const expired = parseInt(item.expired_count) || 0;
                                    return (
                                        <div key={item.id} className="db-breakdown-item">
                                            <div className="db-breakdown-name">{item.type_name}</div>
                                            <div className="db-breakdown-stats">
                                                <span className="db-breakdown-total">{total} รายการ</span>
                                                <div className="db-breakdown-tags">
                                                    {active > 0 && <span className="db-tag success">{active} ใช้งาน</span>}
                                                    {expCount > 0 && <span className="db-tag warning">{expCount} ใกล้หมด</span>}
                                                    {expired > 0 && <span className="db-tag danger">{expired} หมดอายุ</span>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                /* Stats Row - horizontal inline like expiring page */
                .db-stats-row {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 0.5rem;
                }
                @media (max-width: 768px) {
                    .db-stats-row { grid-template-columns: repeat(3, 1fr); }
                }
                @media (max-width: 480px) {
                    .db-stats-row { grid-template-columns: repeat(2, 1fr); }
                }
                .db-stat-item {
                    padding: 0.25rem 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    position: relative;
                }
                .db-stat-item:not(:last-child)::after {
                    content: '';
                    position: absolute;
                    right: -0.25rem;
                    top: 20%;
                    height: 60%;
                    width: 1px;
                    background-color: var(--border-color);
                    opacity: 0.5;
                }
                @media (max-width: 768px) {
                    .db-stat-item:not(:last-child)::after { display: none; }
                    .db-stat-item {
                        background-color: #f9fafb;
                        border-radius: 6px;
                        padding: 0.75rem;
                    }
                }
                .db-stat-icon {
                    width: 40px;
                    height: 40px;
                    min-width: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                }
                .db-stat-content {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    overflow: hidden;
                }
                .db-stat-value {
                    font-size: 1.125rem;
                    font-weight: 700;
                    line-height: 1.2;
                    color: var(--text-primary);
                }
                .db-stat-label {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .db-stat-icon.primary { background: rgba(59,130,246,0.1); color: #3b82f6; }
                .db-stat-icon.info    { background: rgba(79,70,229,0.1); color: #4f46e5; }
                .db-stat-icon.success { background: rgba(16,185,129,0.1); color: #10b981; }
                .db-stat-icon.warning { background: rgba(245,158,11,0.1); color: #f59e0b; }
                .db-stat-icon.danger  { background: rgba(239,68,68,0.1); color: #ef4444; }

                /* Grid Layout */
                .db-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    align-items: start;
                }
                @media (max-width: 992px) {
                    .db-grid { grid-template-columns: 1fr; }
                }

                /* Card */
                .db-card {
                    background: #fff;
                    border-radius: 12px;
                    border: 1px solid var(--border-color, #e5e7eb);
                    overflow: hidden;
                }
                .db-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.25rem;
                    border-bottom: 1px solid var(--border-color, #e5e7eb);
                }
                .db-card-header h3 {
                    margin: 0;
                    font-size: 1rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                }
                .db-card-link {
                    font-size: 0.85rem;
                    color: var(--primary, #3b82f6);
                    text-decoration: none;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    white-space: nowrap;
                }
                .db-card-link:hover { text-decoration: underline; }
                .db-card-body {
                    padding: 0;
                }

                /* Empty State */
                .db-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem 1rem;
                    color: var(--text-muted, #6b7280);
                    font-size: 0.85rem;
                }
                .db-empty p { margin: 0; }

                /* Table */
                .db-table-wrap {
                    overflow-x: auto;
                }
                .db-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 0.875rem;
                }
                .db-table th {
                    padding: 0.75rem 1rem;
                    text-align: center;
                    font-weight: 600;
                    color: var(--text-muted, #6b7280);
                    font-size: 0.8rem;
                    background: #f9fafb;
                    white-space: nowrap;
                }
                .db-table td {
                    padding: 0.75rem 1rem;
                    border-top: 1px solid #f3f4f6;
                    white-space: nowrap;
                    text-align: center;
                }
                .db-td-primary {
                    font-weight: 500;
                    color: var(--text-primary, #111827);
                }

                /* Badge */
                .db-badge {
                    display: inline-block;
                    padding: 0.2rem 0.6rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }
                .db-badge.danger {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                }
                .db-badge.warning {
                    background: rgba(245, 158, 11, 0.1);
                    color: #d97706;
                }

                /* Breakdown List */
                .db-breakdown-list {
                    padding: 0.25rem 0;
                }
                .db-breakdown-item {
                    padding: 0.75rem 1.25rem;
                    border-bottom: 1px solid #f3f4f6;
                }
                .db-breakdown-item:last-child {
                    border-bottom: none;
                }
                .db-breakdown-name {
                    font-size: 0.9rem;
                    font-weight: 500;
                    color: var(--text-primary, #111827);
                    margin-bottom: 0.25rem;
                }
                .db-breakdown-stats {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.5rem;
                }
                .db-breakdown-total {
                    font-size: 0.8rem;
                    color: var(--text-muted, #6b7280);
                }
                .db-breakdown-tags {
                    display: flex;
                    gap: 0.35rem;
                    flex-wrap: wrap;
                }
                .db-tag {
                    font-size: 0.7rem;
                    padding: 0.15rem 0.5rem;
                    border-radius: 4px;
                    font-weight: 500;
                }
                .db-tag.success { background: rgba(16,185,129,0.1); color: #059669; }
                .db-tag.warning { background: rgba(245,158,11,0.1); color: #d97706; }
                .db-tag.danger  { background: rgba(239,68,68,0.1); color: #dc2626; }
            `}</style>
        </div>
    );
}

/**
 * DashboardSkeleton Component
 */
function DashboardSkeleton() {
    return (
        <div>
            <div className="card mb-3" style={{ border: 'none', boxShadow: 'none' }}>
                <div className="card-body" style={{ padding: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                        {[1,2,3,4,5].map((i) => (
                            <div key={i} style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="skeleton-cell skeleton-animate" style={{ width: '40px', height: '40px', minWidth: '40px', borderRadius: '10px' }} />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <div className="skeleton-cell skeleton-animate" style={{ width: '50%', height: '1.125rem' }} />
                                    <div className="skeleton-cell skeleton-animate" style={{ width: '80%', height: '0.8rem' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', height: '300px' }}>
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                        <div className="skeleton-cell skeleton-animate" style={{ width: '150px', height: '1rem' }} />
                    </div>
                </div>
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', height: '300px' }}>
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                        <div className="skeleton-cell skeleton-animate" style={{ width: '120px', height: '1rem' }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
