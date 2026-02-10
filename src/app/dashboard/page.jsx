'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/constants';
import { StatsGridSkeleton, Skeleton } from '@/components/ui/Skeleton';

// Constants
const STAT_CARDS = [
    { key: 'total_shops', label: 'ร้านค้าทั้งหมด', icon: 'fas fa-store', variant: 'primary' },
    { key: 'total_licenses', label: 'ใบอนุญาตทั้งหมด', icon: 'fas fa-file-alt', variant: 'info' },
    { key: 'active_licenses', label: 'ใบอนุญาตที่ใช้งาน', icon: 'fas fa-check-circle', variant: 'success' },
    { key: 'expiring_soon', label: 'ใกล้หมดอายุ', icon: 'fas fa-exclamation-triangle', variant: 'warning', suffix: 'expiry_warning_days' },
    { key: 'expired_licenses', label: 'หมดอายุแล้ว', icon: 'fas fa-times-circle', variant: 'danger' }
];

/**
 * DashboardPage Component
 */
export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [user, setUser] = useState(null);

    const initializedRef = useRef(false);

    useEffect(() => {
        if (!initializedRef.current) {
            initializedRef.current = true;
            const init = async () => {
                await checkAuth();
                await fetchDashboardData();
            };
            init();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.AUTH + '?action=check', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setUser(data.user);
            }
        } catch (err) {
            console.error('Auth check failed', err);
        }
    };

    const fetchDashboardData = useCallback(async () => {
        try {
            const statsRes = await fetch(API_ENDPOINTS.DASHBOARD_STATS, { credentials: 'include' });
            const statsData = await statsRes.json();
            if (statsData.success) setStats(statsData.stats);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    if (loading) return <DashboardSkeleton />;
    if (error) return <div className="error-message">{error}</div>;
    if (!stats) return null;

    return (
        <div>
            <StatsGrid stats={stats} />

            {user?.role === 'admin' && (
                <Link href="/dashboard/activity-logs" className="al-link-card">
                    <div className="al-link-card-inner">
                        <div className="al-link-card-icon">
                            <i className="fas fa-history"></i>
                        </div>
                        <div className="al-link-card-text">
                            <span className="al-link-card-title">ประวัติกิจกรรม</span>
                            <span className="al-link-card-desc">ดูรายละเอียดกิจกรรม, สถิติ, IP Address ทั้งหมด</span>
                        </div>
                        <i className="fas fa-chevron-right al-link-card-arrow"></i>
                    </div>
                </Link>
            )}
        </div>
    );
}

/**
 * StatsGrid Component
 */
function StatsGrid({ stats }) {
    return (
        <div className="card mb-3" style={{ border: 'none', boxShadow: 'var(--shadow-sm)' }}>
            <div className="card-body" style={{ padding: '0.5rem' }}>
                <div className="dashboard-stats-row">
                    {STAT_CARDS.map((card, index) => (
                        <div key={card.key} className="stat-item">
                            <div className={`stat-icon ${card.variant}`}>
                                <i className={card.icon}></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value text-dark">{stats[card.key]}</div>
                                <div className="stat-label">
                                    {card.suffix ? `${card.label} (${stats[card.suffix]} วัน)` : card.label}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <style jsx>{`
                .dashboard-stats-row {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 0.5rem;
                }
                @media (max-width: 992px) {
                    .dashboard-stats-row {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                @media (max-width: 576px) {
                    .dashboard-stats-row {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                .stat-item {
                    padding: 0.25rem 0.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    position: relative;
                }
                .stat-item:not(:last-child)::after {
                    content: '';
                    position: absolute;
                    right: -0.25rem;
                    top: 20%;
                    height: 60%;
                    width: 1px;
                    background-color: var(--border-color);
                    opacity: 0.5;
                }
                @media (max-width: 992px) {
                    .stat-item:not(:last-child)::after {
                        display: none;
                    }
                    .stat-item {
                        background-color: #f9fafb;
                        border-radius: 6px;
                        padding: 0.75rem;
                    }
                }
                .stat-icon {
                    width: 36px;
                    height: 36px;
                    min-width: 36px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1rem;
                }
                .stat-content {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    overflow: hidden;
                }
                .stat-value {
                    font-size: 1rem;
                    font-weight: 700;
                    line-height: 1.2;
                    color: var(--text-primary);
                }
                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                /* Icon Colors - Based on existing variants */
                .stat-icon.primary { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .stat-icon.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
                .stat-icon.danger  { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .stat-icon.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                .stat-icon.info    { background: rgba(79, 70, 229, 0.1); color: #4f46e5; }
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
            <StatsGridSkeleton count={5} />
        </div>
    );
}
