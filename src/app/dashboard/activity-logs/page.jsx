'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePagination } from '@/hooks';
import { formatThaiDateTime, getInitial } from '@/utils/formatters';
import Pagination from '@/components/ui/Pagination';
import CustomSelect from '@/components/ui/CustomSelect';
import DatePicker from '@/components/ui/DatePicker';
import TableSkeleton from '@/components/ui/TableSkeleton';
import Modal from '@/components/ui/Modal';

// Constants
const ACTION_TYPES = [
    { value: '', label: 'ทุกประเภท' },
    { value: 'LOGIN', label: 'เข้าสู่ระบบ' },
    { value: 'LOGOUT', label: 'ออกจากระบบ' },
    { value: 'CREATE', label: 'สร้าง' },
    { value: 'UPDATE', label: 'แก้ไข' },
    { value: 'DELETE', label: 'ลบ' },
    { value: 'EXPORT', label: 'ส่งออก' },
    { value: 'VIEW', label: 'ดู' }
];

const ENTITY_TYPES = [
    { value: '', label: 'ทุกหมวด' },
    { value: 'การเข้าสู่ระบบ', label: 'การเข้าสู่ระบบ' },
    { value: 'ผู้ใช้', label: 'ผู้ใช้' },
    { value: 'ร้านค้า', label: 'ร้านค้า' },
    { value: 'ใบอนุญาต', label: 'ใบอนุญาต' },
    { value: 'ประเภทใบอนุญาต', label: 'ประเภทใบอนุญาต' },
    { value: 'การตั้งค่า', label: 'การตั้งค่า' }
];

const ACTION_BADGE_MAP = {
    'LOGIN': { class: 'badge-success', icon: 'fa-sign-in-alt', label: 'เข้าสู่ระบบ' },
    'LOGOUT': { class: 'badge-secondary', icon: 'fa-sign-out-alt', label: 'ออกจากระบบ' },
    'CREATE': { class: 'badge-info', icon: 'fa-plus', label: 'สร้าง' },
    'UPDATE': { class: 'badge-warning', icon: 'fa-edit', label: 'แก้ไข' },
    'DELETE': { class: 'badge-danger', icon: 'fa-trash', label: 'ลบ' },
    'EXPORT': { class: 'badge-primary', icon: 'fa-file-export', label: 'ส่งออก' },
    'VIEW': { class: 'badge-light', icon: 'fa-eye', label: 'ดู' }
};

const DEVICE_ICONS = {
    'Desktop': 'fa-desktop',
    'Mobile': 'fa-mobile-alt',
    'Tablet': 'fa-tablet-alt'
};

/**
 * ActivityLogsPage Component
 * Admin-only page - redirects non-admin users
 */
export default function ActivityLogsPage() {
    const router = useRouter();
    const pagination = usePagination(20);

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [activities, setActivities] = useState([]);
    const [stats, setStats] = useState(null);
    const [userStats, setUserStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('logs');

    // Filters
    const [filters, setFilters] = useState({
        action_type: '',
        entity_type: '',
        user_id: '',
        date_from: '',
        date_to: '',
        search: ''
    });

    // Modal
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Check admin authorization on mount
    useEffect(() => {
        checkAdminAuth();
    }, []);

    const checkAdminAuth = async () => {
        try {
            const res = await fetch('/api/auth?action=check');
            const data = await res.json();

            if (!data.success || data.user?.role !== 'admin') {
                // Not admin - redirect to dashboard
                router.push('/dashboard');
                return;
            }

            setIsAuthorized(true);
        } catch (error) {
            console.error('Auth check failed:', error);
            router.push('/dashboard');
        } finally {
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthorized) return;

        if (activeTab === 'logs') {
            fetchActivityLogs();
        } else if (activeTab === 'stats') {
            fetchStats();
        } else if (activeTab === 'users') {
            fetchUserStats();
        }
    }, [pagination.page, pagination.limit, activeTab, isAuthorized]);

    const fetchActivityLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                action: 'list',
                page: pagination.page,
                limit: pagination.limit,
                ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
            });

            const response = await fetch(`/api/activity-logs?${params}`);
            const data = await response.json();

            if (data.success) {
                setActivities(data.activities || []);
                pagination.updateFromResponse(data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch activity logs:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, filters]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/activity-logs?action=stats');
            const data = await response.json();
            if (data.success) {
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserStats = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/activity-logs?action=user_stats');
            const data = await response.json();
            if (data.success) {
                setUserStats(data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch user stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        pagination.setPage(1);
        fetchActivityLogs();
    };

    const handleFilterChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({
            action_type: '',
            entity_type: '',
            user_id: '',
            date_from: '',
            date_to: '',
            search: ''
        });
    };

    const viewDetails = (activity) => {
        setSelectedActivity(activity);
        setShowDetailModal(true);
    };

    const skeletonColumns = [
        { width: '12%' },
        { width: '15%' },
        { width: '10%', rounded: true },
        { width: '12%' },
        { width: '25%' },
        { width: '12%' },
        { width: '8%', center: true }
    ];

    // Show loading while checking authorization
    if (authLoading) {
        return (
            <div className="card">
                <div className="card-body" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '300px',
                    flexDirection: 'column',
                    gap: '1rem'
                }}>
                    <div className="loading-spinner">
                        <div className="spinner-ring"></div>
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>กำลังตรวจสอบสิทธิ์...</p>
                </div>
            </div>
        );
    }

    // Don't render if not authorized (redirect is in progress)
    if (!isAuthorized) {
        return null;
    }

    return (
        <>
            {/* Tabs */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="tabs-container" style={{ display: 'flex', gap: '0.5rem', padding: '1rem' }}>
                    <TabButton
                        active={activeTab === 'logs'}
                        onClick={() => setActiveTab('logs')}
                        icon="fa-history"
                        label="ประวัติกิจกรรม"
                    />
                    <TabButton
                        active={activeTab === 'stats'}
                        onClick={() => setActiveTab('stats')}
                        icon="fa-chart-bar"
                        label="สถิติภาพรวม"
                    />
                    <TabButton
                        active={activeTab === 'users'}
                        onClick={() => setActiveTab('users')}
                        icon="fa-users"
                        label="สถิติผู้ใช้"
                    />
                </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'logs' && (
                <ActivityLogsTab
                    activities={activities}
                    loading={loading}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onSearch={handleSearch}
                    onClearFilters={clearFilters}
                    onViewDetails={viewDetails}
                    pagination={pagination}
                    skeletonColumns={skeletonColumns}
                />
            )}

            {activeTab === 'stats' && (
                <StatsTab stats={stats} loading={loading} />
            )}

            {activeTab === 'users' && (
                <UserStatsTab users={userStats} loading={loading} />
            )}

            {/* Detail Modal */}
            <Modal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                title="รายละเอียดกิจกรรม"
                size="lg"
            >
                {selectedActivity && (
                    <ActivityDetailView activity={selectedActivity} />
                )}
            </Modal>
        </>
    );
}

/**
 * TabButton Component
 */
function TabButton({ active, onClick, icon, label }) {
    return (
        <button
            className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
            onClick={onClick}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
            <i className={`fas ${icon}`}></i>
            {label}
        </button>
    );
}

/**
 * ActivityLogsTab Component
 */
function ActivityLogsTab({ activities, loading, filters, onFilterChange, onSearch, onClearFilters, onViewDetails, pagination, skeletonColumns }) {
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">
                    <i className="fas fa-history"></i> ประวัติกิจกรรมทั้งหมด
                </h3>
            </div>

            {/* Filters */}
            <div className="card-body" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div className="filter-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>ค้นหา</label>
                        <input
                            type="text"
                            placeholder="ค้นหา..."
                            value={filters.search}
                            onChange={(e) => onFilterChange('search', e.target.value)}
                            style={{ width: '100%' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>ประเภทกิจกรรม</label>
                        <CustomSelect
                            value={filters.action_type}
                            onChange={(e) => onFilterChange('action_type', e.target.value)}
                            options={ACTION_TYPES}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>หมวดหมู่</label>
                        <CustomSelect
                            value={filters.entity_type}
                            onChange={(e) => onFilterChange('entity_type', e.target.value)}
                            options={ENTITY_TYPES}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>จากวันที่</label>
                        <DatePicker
                            value={filters.date_from}
                            onChange={(e) => onFilterChange('date_from', e.target.value)}
                            placeholder="เลือกวันที่"
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem' }}>ถึงวันที่</label>
                        <DatePicker
                            value={filters.date_to}
                            onChange={(e) => onFilterChange('date_to', e.target.value)}
                            placeholder="เลือกวันที่"
                        />
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-primary btn-sm" onClick={onSearch}>
                        <i className="fas fa-search"></i> ค้นหา
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={onClearFilters}>
                        <i className="fas fa-times"></i> ล้างตัวกรอง
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="card-body">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>เวลา</th>
                                <th>ผู้ใช้งาน</th>
                                <th>กิจกรรม</th>
                                <th>หมวดหมู่</th>
                                <th>รายละเอียด</th>
                                <th>IP Address</th>
                                <th className="text-center">ดู</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton rows={10} columns={skeletonColumns} />
                            ) : activities.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center">ไม่พบข้อมูลกิจกรรม</td>
                                </tr>
                            ) : (
                                activities.map(activity => (
                                    <ActivityRow
                                        key={activity.id}
                                        activity={activity}
                                        onViewDetails={onViewDetails}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.total}
                    itemsPerPage={pagination.limit}
                    onPageChange={pagination.setPage}
                    onItemsPerPageChange={pagination.setLimit}
                    showItemsPerPage
                    showPageJump
                    showTotalInfo
                />
            </div>
        </div>
    );
}

/**
 * ActivityRow Component
 */
function ActivityRow({ activity, onViewDetails }) {
    const actionInfo = ACTION_BADGE_MAP[activity.action] || { class: 'badge-secondary', icon: 'fa-circle', label: activity.action };

    return (
        <tr>
            <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                {formatThaiDateTime(activity.created_at)}
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <UserAvatar name={activity.user_name} />
                    <div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{activity.user_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{activity.username}</div>
                    </div>
                </div>
            </td>
            <td>
                <span className={`badge ${actionInfo.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <i className={`fas ${actionInfo.icon}`} style={{ fontSize: '0.7rem' }}></i>
                    {actionInfo.label}
                </span>
            </td>
            <td style={{ fontSize: '0.85rem' }}>{activity.entity_type || '-'}</td>
            <td style={{
                maxWidth: '250px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.85rem'
            }}>
                {activity.details || '-'}
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className={`fas ${DEVICE_ICONS[activity.device_info?.device] || 'fa-desktop'}`}
                        style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}
                        title={`${activity.device_info?.device} - ${activity.device_info?.browser}`}
                    ></i>
                    <span style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>{activity.ip_address || '-'}</span>
                </div>
            </td>
            <td className="text-center">
                <button
                    className="btn btn-icon btn-ghost"
                    onClick={() => onViewDetails(activity)}
                    title="ดูรายละเอียด"
                >
                    <i className="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    );
}

/**
 * UserAvatar Component
 */
function UserAvatar({ name }) {
    return (
        <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            color: 'white',
            flexShrink: 0
        }}>
            {getInitial(name)}
        </div>
    );
}

/**
 * StatsTab Component
 */
function StatsTab({ stats, loading }) {
    if (loading || !stats) {
        return (
            <div className="card">
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <div className="loading-spinner">
                        <div className="spinner-ring"></div>
                    </div>
                </div>
            </div>
        );
    }

    const statCards = [
        { label: 'กิจกรรมทั้งหมด', value: stats.stats.total_activities, icon: 'fa-list', color: 'primary' },
        { label: 'กิจกรรมวันนี้', value: stats.stats.today_activities, icon: 'fa-calendar-day', color: 'info' },
        { label: 'กิจกรรม 7 วัน', value: stats.stats.week_activities, icon: 'fa-calendar-week', color: 'success' },
        { label: 'ผู้ใช้งานวันนี้', value: stats.stats.today_active_users, icon: 'fa-user-check', color: 'warning' },
        { label: 'การเข้าระบบวันนี้', value: stats.stats.today_logins, icon: 'fa-sign-in-alt', color: 'success' },
        { label: 'สร้างข้อมูล', value: stats.stats.total_creates, icon: 'fa-plus-circle', color: 'info' },
        { label: 'แก้ไขข้อมูล', value: stats.stats.total_updates, icon: 'fa-edit', color: 'warning' },
        { label: 'ลบข้อมูล', value: stats.stats.total_deletes, icon: 'fa-trash', color: 'danger' }
    ];

    return (
        <div>
            {/* Stats Cards */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                {statCards.map((card, i) => (
                    <div key={i} className="stat-card">
                        <div className={`stat-icon ${card.color}`}>
                            <i className={`fas ${card.icon}`}></i>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value">{card.value.toLocaleString()}</div>
                            <div className="stat-label">{card.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Breakdowns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                {/* Action Breakdown */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><i className="fas fa-chart-pie"></i> กิจกรรมตามประเภท</h3>
                    </div>
                    <div className="card-body">
                        {stats.actionBreakdown?.map((item, i) => {
                            const info = ACTION_BADGE_MAP[item.action] || { label: item.action, class: 'badge-secondary' };
                            return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                    <span className={`badge ${info.class}`}>{info.label}</span>
                                    <span style={{ fontWeight: 600 }}>{parseInt(item.count).toLocaleString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Entity Breakdown */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><i className="fas fa-layer-group"></i> กิจกรรมตามหมวดหมู่</h3>
                    </div>
                    <div className="card-body">
                        {stats.entityBreakdown?.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                <span>{item.entity_type || '-'}</span>
                                <span style={{ fontWeight: 600 }}>{parseInt(item.count).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Users */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><i className="fas fa-trophy"></i> ผู้ใช้ที่มีกิจกรรมมากที่สุด (30 วัน)</h3>
                    </div>
                    <div className="card-body">
                        {stats.topUsers?.map((user, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: i < 3 ? 'var(--primary)' : 'var(--text-muted)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{i + 1}</span>
                                    <span>{user.full_name || user.username}</span>
                                </div>
                                <span style={{ fontWeight: 600 }}>{parseInt(user.activity_count).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent IPs */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><i className="fas fa-globe"></i> IP ที่เข้าใช้งานบ่อย (7 วัน)</h3>
                    </div>
                    <div className="card-body">
                        {stats.recentIPs?.map((ip, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{ip.ip_address || '-'}</span>
                                <span style={{ fontWeight: 600 }}>{parseInt(ip.access_count).toLocaleString()} ครั้ง</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * UserStatsTab Component
 */
function UserStatsTab({ users, loading }) {
    if (loading) {
        return (
            <div className="card">
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <div className="loading-spinner">
                        <div className="spinner-ring"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">
                    <i className="fas fa-users"></i> สถิติการใช้งานแยกตามผู้ใช้
                </h3>
            </div>
            <div className="card-body">
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ผู้ใช้งาน</th>
                                <th>บทบาท</th>
                                <th className="text-center">กิจกรรมทั้งหมด</th>
                                <th className="text-center">เข้าสู่ระบบ</th>
                                <th className="text-center">วันที่ใช้งาน (30 วัน)</th>
                                <th>เข้าสู่ระบบล่าสุด</th>
                                <th>กิจกรรมล่าสุด</th>
                                <th>IP ล่าสุด</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="text-center">ไม่พบข้อมูล</td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <UserAvatar name={user.full_name} />
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{user.full_name || '-'}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{user.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.role === 'admin' ? 'badge-primary' : 'badge-info'}`}>
                                                {user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}
                                            </span>
                                        </td>
                                        <td className="text-center" style={{ fontWeight: 600 }}>
                                            {parseInt(user.total_activities || 0).toLocaleString()}
                                        </td>
                                        <td className="text-center" style={{ fontWeight: 600, color: 'var(--success)' }}>
                                            {parseInt(user.total_logins || 0).toLocaleString()}
                                        </td>
                                        <td className="text-center">
                                            <span className="badge badge-info">{user.active_days_30 || 0} วัน</span>
                                        </td>
                                        <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                            {user.last_login ? formatThaiDateTime(user.last_login) : '-'}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                            {user.last_activity ? formatThaiDateTime(user.last_activity) : '-'}
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                            {user.last_ip || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/**
 * ActivityDetailView Component
 */
function ActivityDetailView({ activity }) {
    const actionInfo = ACTION_BADGE_MAP[activity.action] || { class: 'badge-secondary', icon: 'fa-circle', label: activity.action };

    const DetailRow = ({ label, value, icon, monospace }) => (
        <div style={{
            display: 'flex',
            padding: '0.75rem 0',
            borderBottom: '1px solid var(--border-color)',
            gap: '1rem'
        }}>
            <div style={{ width: '140px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className={`fas ${icon}`} style={{ width: 16, textAlign: 'center' }}></i>
                {label}
            </div>
            <div style={{ flex: 1, fontFamily: monospace ? 'monospace' : 'inherit', wordBreak: 'break-word' }}>
                {value || '-'}
            </div>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '8px'
            }}>
                <UserAvatar name={activity.user_name} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{activity.user_name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{activity.username}</div>
                </div>
                <span className={`badge ${actionInfo.class}`} style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                    <i className={`fas ${actionInfo.icon}`} style={{ marginRight: '0.25rem' }}></i>
                    {actionInfo.label}
                </span>
            </div>

            {/* Details */}
            <div style={{ marginBottom: '1rem' }}>
                <DetailRow label="เวลา" value={formatThaiDateTime(activity.created_at)} icon="fa-clock" />
                <DetailRow label="ผู้ใช้งาน" value={`${activity.user_name} (@${activity.username})`} icon="fa-user" />
                <DetailRow label="บทบาท" value={activity.user_role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'} icon="fa-id-badge" />
                <DetailRow label="กิจกรรม" value={actionInfo.label} icon="fa-bolt" />
                <DetailRow label="หมวดหมู่" value={activity.entity_type} icon="fa-layer-group" />
                {activity.entity_id && (
                    <DetailRow label="รหัสข้อมูล" value={`#${activity.entity_id}`} icon="fa-hashtag" />
                )}
                <DetailRow label="รายละเอียด" value={activity.details} icon="fa-info-circle" />
            </div>

            {/* Technical Details */}
            <div style={{
                padding: '1rem',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                marginTop: '1rem'
            }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <i className="fas fa-cog"></i> ข้อมูลทางเทคนิค
                </h4>
                <DetailRow label="IP Address" value={activity.ip_address} icon="fa-globe" monospace />
                <DetailRow label="อุปกรณ์" value={activity.device_info?.device} icon="fa-desktop" />
                <DetailRow label="ระบบปฏิบัติการ" value={activity.device_info?.os} icon="fa-laptop" />
                <DetailRow label="เบราว์เซอร์" value={activity.device_info?.browser} icon="fa-window-maximize" />
                <DetailRow label="User Agent" value={activity.user_agent} icon="fa-code" monospace />
            </div>
        </div>
    );
}
