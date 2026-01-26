'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { API_ENDPOINTS } from '@/constants';
import { formatThaiDateTime, getInitial } from '@/utils/formatters';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { StatsGridSkeleton, TableSkeleton, Skeleton } from '@/components/ui/Skeleton';



// Constants
const STAT_CARDS = [
    { key: 'total_shops', label: 'ร้านค้าทั้งหมด', icon: 'fas fa-store', variant: 'primary' },
    { key: 'total_licenses', label: 'ใบอนุญาตทั้งหมด', icon: 'fas fa-file-alt', variant: 'info' },
    { key: 'active_licenses', label: 'ใบอนุญาตที่ใช้งาน', icon: 'fas fa-check-circle', variant: 'success' },
    { key: 'expiring_soon', label: 'ใกล้หมดอายุ', icon: 'fas fa-exclamation-triangle', variant: 'warning', suffix: 'expiry_warning_days' },
    { key: 'expired_licenses', label: 'หมดอายุแล้ว', icon: 'fas fa-times-circle', variant: 'danger' }
];

const ACTION_BADGE_MAP = {
    'LOGIN': 'badge-success',
    'DELETE': 'badge-danger',
    'CREATE': 'badge-info',
    'UPDATE': 'badge-warning'
};

/**
 * DashboardPage Component
 */
export default function DashboardPage() {
    const [stats, setStats] = useState(null);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [user, setUser] = useState(null);

    const initialized = useState(false);

    useEffect(() => {
        if (!initialized[0]) {
            initialized[1](true);
            checkAuth();
            fetchDashboardData();
        }
    }, []);

    const checkAuth = async () => {
        try {
            const res = await fetch(API_ENDPOINTS.AUTH + '?action=check');
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
            const [statsRes, recentRes] = await Promise.all([
                fetch(API_ENDPOINTS.DASHBOARD_STATS),
                fetch(API_ENDPOINTS.DASHBOARD_ACTIVITY)
            ]);

            const statsData = await statsRes.json();
            const activityData = await safeParseJson(recentRes);

            if (statsData.success) setStats(statsData.stats);
            if (activityData?.success) {
                setRecentActivity(activityData.activities || []);
            }
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

            {user?.role === 'admin' && <RecentActivityCard activities={recentActivity} />}
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
 * StatCard Component
 */
function StatCard({ value, label, icon, variant }) {
    return (
        <div className="stat-card">
            <div className={`stat-icon ${variant}`}>
                <i className={icon}></i>
            </div>
            <div className="stat-content">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
            </div>
        </div>
    );
}

/**
 * RecentActivityCard Component
 */
function RecentActivityCard({ activities }) {
    const [selectedLog, setSelectedLog] = useState(null);
    const [filter, setFilter] = useState('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredActivities = activities.filter(log => {
        if (filter === 'ALL') return true;
        return log.action === filter;
    });

    // Reset to first page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    // Calculate pagination
    const totalItems = filteredActivities.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedActivities = filteredActivities.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <>
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <i className="fas fa-history"></i> 
                        <span>ประวัติการใช้งานล่าสุด</span>
                        <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 'normal' }}>
                            (ล้างข้อมูลอัตโนมัติทุกสัปดาห์)
                        </span>
                    </h3>
                    <div className="card-actions activity-filter-actions">
                        <button 
                            onClick={() => setFilter('ALL')}
                            className="btn btn-sm"
                            style={{ 
                                borderRadius: '20px',
                                padding: '0.25rem 0.75rem',
                                backgroundColor: filter === 'ALL' ? '#f3f4f6' : 'transparent',
                                color: filter === 'ALL' ? '#1f2937' : '#9ca3af',
                                border: '1px solid ' + (filter === 'ALL' ? '#d1d5db' : 'transparent')
                            }}
                        >
                            All
                        </button>
                        <button 
                            onClick={() => setFilter('CREATE')}
                            className="btn btn-sm"
                            style={{ 
                                borderRadius: '20px',
                                padding: '0.25rem 0.75rem',
                                backgroundColor: filter === 'CREATE' ? '#3b82f6' : 'transparent',
                                color: filter === 'CREATE' ? 'white' : '#3b82f6',
                                border: '1px solid #3b82f6',
                                boxShadow: filter === 'CREATE' ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none'
                            }}
                        >
                            CREATE
                        </button>
                        <button 
                            onClick={() => setFilter('UPDATE')}
                            className="btn btn-sm"
                            style={{ 
                                borderRadius: '20px',
                                padding: '0.25rem 0.75rem',
                                backgroundColor: filter === 'UPDATE' ? '#f59e0b' : 'transparent',
                                color: filter === 'UPDATE' ? 'white' : '#f59e0b',
                                border: '1px solid #f59e0b',
                                boxShadow: filter === 'UPDATE' ? '0 2px 4px rgba(245, 158, 11, 0.3)' : 'none'
                            }}
                        >
                            UPDATE
                        </button>
                        <button 
                            onClick={() => setFilter('DELETE')}
                            className="btn btn-sm"
                            style={{ 
                                borderRadius: '20px',
                                padding: '0.25rem 0.75rem',
                                backgroundColor: filter === 'DELETE' ? '#ef4444' : 'transparent',
                                color: filter === 'DELETE' ? 'white' : '#ef4444',
                                border: '1px solid #ef4444',
                                boxShadow: filter === 'DELETE' ? '0 2px 4px rgba(239, 68, 68, 0.3)' : 'none'
                            }}
                        >
                            DELETE
                        </button>
                    </div>
                </div>
                <div className="card-body">
                    <div className="table-container">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '20%' }}>
                                        <div className="header-content justify-center">
                                            <span className="header-text">เวลา</span>
                                        </div>
                                    </th>
                                    <th className="hide-on-mobile" style={{ width: '25%' }}>
                                        <div className="header-content justify-center">
                                            <span className="header-text">ผู้ใช้งาน</span>
                                        </div>
                                    </th>
                                    <th style={{ width: '15%' }}>
                                        <div className="header-content justify-center">
                                            <span className="header-text">กิจกรรม</span>
                                        </div>
                                    </th>
                                    <th className="hide-on-mobile" style={{ width: '40%' }}>
                                        <div className="header-content justify-center">
                                            <span className="header-text">รายละเอียด</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedActivities.length > 0 ? paginatedActivities.map(log => (
                                    <ActivityRow 
                                        key={log.id} 
                                        log={log} 
                                        onClick={() => setSelectedLog(log)}
                                    />
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="text-center" style={{ padding: '3rem' }}>
                                            <div style={{ color: 'var(--text-muted)' }}>ไม่มีข้อมูลกิจกรรมล่าสุด</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {filteredActivities.length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalItems}
                                itemsPerPage={itemsPerPage}
                                onPageChange={setCurrentPage}
                                onItemsPerPageChange={setItemsPerPage}
                                showItemsPerPage={true}
                                showPageJump={false}
                            />
                        </div>
                    )}
                </div>
                <style jsx>{`
                    /* Table Container - Match ExcelTable */
                    .table-container {
                        padding: 0.5rem;
                        background: transparent;
                        overflow-x: auto;
                    }

                    /* Use :global to penetrate component scope to ActivityRow */
                    .recent-activity-card :global(.excel-table) {
                        border-collapse: separate !important;
                        border-spacing: 0 0.75rem !important; /* Visible gap between rows */
                        width: 100%;
                        background: transparent !important;
                    }

                    /* Header Styling */
                    .recent-activity-card :global(.excel-table thead tr) {
                        background: transparent;
                        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.02));
                    }

                    .recent-activity-card :global(.excel-table th) {
                        background: #ffffff;
                        border-top: 1px solid rgba(0, 0, 0, 0.05);
                        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                        color: var(--text-secondary);
                        font-weight: 600;
                        font-size: 0.875rem;
                        padding: 0.75rem 0.5rem;
                        text-align: center;
                        vertical-align: middle;
                        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
                    }

                    .recent-activity-card :global(.excel-table th:first-child) {
                        border-top-left-radius: 16px;
                        border-bottom-left-radius: 16px;
                        border-left: 1px solid rgba(0, 0, 0, 0.05);
                    }

                    .recent-activity-card :global(.excel-table th:last-child) {
                        border-top-right-radius: 16px;
                        border-bottom-right-radius: 16px;
                        border-right: 1px solid rgba(0, 0, 0, 0.05);
                    }

                    .header-content {
                        display: flex;
                        align-items: center;
                        width: 100%;
                        padding: 0 0.75rem;
                        box-sizing: border-box;
                    }
                    
                    .header-content.justify-center {
                        justify-content: center;
                    }

                    .header-text {
                        flex: 0 0 auto;
                        white-space: nowrap;
                        font-weight: 600;
                        color: var(--text-secondary);
                    }

                    /* Hide specific columns on mobile */
                    @media (max-width: 768px) {
                        .hide-on-mobile {
                            display: none;
                        }
                    }

                    /* Body/Row Styling - Match ExcelTable */
                    .recent-activity-card :global(.excel-table tbody tr) {
                        background: #ffffff !important; /* Force white background */
                        border-radius: 16px !important;
                        box-shadow: 
                            0 4px 6px -1px rgba(0, 0, 0, 0.05), 
                            0 2px 4px -1px rgba(0, 0, 0, 0.03) !important;
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .recent-activity-card :global(.excel-table tbody tr:hover) {
                        transform: translateY(-2px);
                        box-shadow: 
                            0 10px 15px -3px rgba(217, 119, 87, 0.1), 
                            0 4px 6px -2px rgba(217, 119, 87, 0.05) !important;
                        background: #fffafa !important; /* Slight tint on hover */
                        position: relative;
                        z-index: 10;
                    }

                    .recent-activity-card :global(.excel-table td) {
                        border: none !important; /* Remove defaults */
                        border-bottom: none !important;
                        padding: 1rem 0.75rem !important; /* Larger padding */
                        vertical-align: middle;
                        background: transparent !important;
                        text-align: center;
                    }

                    /* Important: Round corners for the row card effect */
                    .recent-activity-card :global(.excel-table td:first-child) {
                        border-top-left-radius: 16px;
                        border-bottom-left-radius: 16px;
                    }

                    .recent-activity-card :global(.excel-table td:last-child) {
                        border-top-right-radius: 16px;
                        border-bottom-right-radius: 16px;
                    }

                    /* Specific cell adjustments */
                    .recent-activity-card :global(.excel-table td .user-info-cell) {
                        justify-content: center;
                    }
                `}</style>
            </div>

            <Modal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                title="รายละเอียดกิจกรรม"
                className=""
            >
                {selectedLog && (
                    <div className="activity-details">
                         <div className="form-group">
                            <label className="text-muted mb-1">เวลา</label>
                            <div>{formatThaiDateTime(selectedLog.created_at)}</div>
                        </div>
                        <div className="form-group">
                            <label className="text-muted mb-1">ผู้ใช้งาน</label>
                            <div className="d-flex align-items-center gap-2">
                                <UserAvatar name={selectedLog.user_name} />
                                {selectedLog.user_name}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="text-muted mb-1">กิจกรรม</label>
                            <div>
                                <span className={`badge ${ACTION_BADGE_MAP[selectedLog.action] || 'badge-info'}`}>
                                    {selectedLog.action}
                                </span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="text-muted mb-1">รายละเอียด</label>
                            <div className="p-2 bg-light rounded text-break">
                                {selectedLog.entity_type} {selectedLog.entity_id ? `#${selectedLog.entity_id}` : ''}
                                {selectedLog.details && (
                                    <div className="mt-2 text-muted small">
                                        {selectedLog.details}
                                    </div>
                                )}
                            </div>
                        </div>
                        {selectedLog.ip_address && (
                             <div className="form-group">
                                <label className="text-muted mb-1">IP Address</label>
                                <div>{selectedLog.ip_address}</div>
                            </div>
                        )}
                         {selectedLog.user_agent && (
                             <div className="form-group">
                                <label className="text-muted mb-1">Device Info</label>
                                <div className="small text-muted text-break">{selectedLog.user_agent}</div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </>
    );
}

/**
 * ActivityRow Component
 */
function ActivityRow({ log, onClick }) {
    const badgeClass = ACTION_BADGE_MAP[log.action] || 'badge-info';

    return (
        <tr onClick={onClick} style={{ cursor: 'pointer' }}>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    {formatThaiDateTime(log.created_at)}
                </div>
            </td>
            <td className="hide-on-mobile">
                <div className="user-info-cell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <UserAvatar name={log.user_name} />
                    {log.user_name}
                </div>
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <span className={`badge ${badgeClass}`}>{log.action}</span>
                </div>
            </td>
            <td className="hide-on-mobile">
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    maxWidth: '100%',
                    margin: '0 auto'
                }}>
                    <span style={{
                        maxWidth: '250px',
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis'
                    }}>
                        {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
                    </span>
                </div>
            </td>
        </tr>
    );
}

/**
 * UserAvatar Component
 */
function UserAvatar({ name }) {
    return (
        <div className="user-avatar-small" style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 600
        }}>
            {getInitial(name)}
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
            
            <div className="card" style={{ marginTop: '1.5rem' }}>
                <div className="card-header" style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <Skeleton width="250px" height="32px" />
                </div>
                <div className="card-body">
                    <TableSkeleton rows={5} columns={4} />
                </div>
            </div>
        </div>
    );
}



/**
 * Safe JSON parser
 */
async function safeParseJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}
