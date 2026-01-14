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

    useEffect(() => {
        checkAuth();
        fetchDashboardData();
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
        <div className="stats-grid">
            {STAT_CARDS.map(card => (
                <StatCard
                    key={card.key}
                    value={stats[card.key]}
                    label={card.suffix ? `${card.label} (${stats[card.suffix]} วัน)` : card.label}
                    icon={card.icon}
                    variant={card.variant}
                />
            ))}
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
                    <h3 className="card-title">
                        <i className="fas fa-history"></i> ประวัติการใช้งานล่าสุด
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
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>เวลา</th>
                                    <th className="hide-on-mobile">ผู้ใช้งาน</th>
                                    <th>กิจกรรม</th>
                                    <th className="hide-on-mobile">รายละเอียด</th>
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
                                        <td colSpan="4" className="text-center">
                                            ไม่มีข้อมูลกิจกรรมล่าสุด
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
            </div>

            <Modal
                isOpen={!!selectedLog}
                onClose={() => setSelectedLog(null)}
                title="รายละเอียดกิจกรรม"
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
            <td>{formatThaiDateTime(log.created_at)}</td>
            <td className="hide-on-mobile">
                <div className="user-info-cell" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserAvatar name={log.user_name} />
                    {log.user_name}
                </div>
            </td>
            <td>
                <span className={`badge ${badgeClass}`}>{log.action}</span>
            </td>
            <td className="hide-on-mobile" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}
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
