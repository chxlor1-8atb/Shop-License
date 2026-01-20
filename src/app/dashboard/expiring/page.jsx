'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { API_ENDPOINTS } from '@/constants';
import { formatThaiDate } from '@/utils/formatters';
import { showSuccess, showError, showInfo, confirmDelete, pendingDelete } from '@/utils/alerts';

// UI Components
import CustomSelect from '@/components/ui/CustomSelect';
import Pagination from '@/components/ui/Pagination';
import FilterRow, { SearchInput } from '@/components/ui/FilterRow';
import TableSkeleton from '@/components/ui/TableSkeleton';
import DatePicker from '@/components/ui/DatePicker';
import '@/components/ExcelTable/ExcelTable.css';

// Constants - Expiry thresholds
const EXPIRY_THRESHOLDS = {
    EXPIRED: 0,
    CRITICAL: 7,
    WARNING: 14
};

const EXPIRY_STATUS_FILTERS = [
    { value: 'expired', label: 'หมดอายุแล้ว', icon: 'fas fa-times-circle', badgeClass: 'badge-expired' },
    { value: 'critical', label: '≤ 7 วัน', icon: 'fas fa-exclamation-triangle', badgeClass: 'badge-critical' },
    { value: 'warning', label: '8-14 วัน', icon: 'fas fa-exclamation-circle', badgeClass: 'badge-warning' },
    { value: 'info', label: '> 14 วัน', icon: 'fas fa-clock', badgeClass: 'badge-info' }
];

/**
 * ExpiringPage Component
 * Displays licenses that are expiring soon or already expired
 */
export default function ExpiringPage() {
    const [allLicenses, setAllLicenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortOrder, setSortOrder] = useState('expiry_asc');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/licenses/expiring');
            const data = await response.json();

            if (data.success) {
                setAllLicenses(data.licenses || []);
            }
        } catch (error) {
            console.error('Failed to fetch expiring licenses:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Extract unique types for filter dropdown
    const typesList = useMemo(() => {
        return [...new Set(allLicenses.map(l => l.type_name).filter(Boolean))];
    }, [allLicenses]);

    // Apply filters using useMemo for performance
    const filteredLicenses = useMemo(() => {
        let result = allLicenses;

        // Search filter
        if (search) {
            const lowerSearch = search.toLowerCase();
            result = result.filter(l =>
                (l.shop_name?.toLowerCase().includes(lowerSearch)) ||
                (l.shop_code?.toLowerCase().includes(lowerSearch)) ||
                (l.license_number?.toLowerCase().includes(lowerSearch))
            );
        }

        // Type filter
        if (filterType) {
            result = result.filter(l => l.type_name === filterType);
        }

        // Status filter
        if (statusFilter) {
            result = result.filter(l => {
                const days = parseInt(l.days_until_expiry);
                switch (statusFilter) {
                    case 'expired': return days < 0;
                    case 'critical': return days >= 0 && days <= EXPIRY_THRESHOLDS.CRITICAL;
                    case 'warning': return days > EXPIRY_THRESHOLDS.CRITICAL && days <= EXPIRY_THRESHOLDS.WARNING;
                    case 'info': return days > EXPIRY_THRESHOLDS.WARNING;
                    default: return true;
                }
            });
        }

        // Date Range Filter
        if (dateFrom) {
            const from = new Date(dateFrom).setHours(0, 0, 0, 0);
            result = result.filter(l => new Date(l.expiry_date).setHours(0, 0, 0, 0) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo).setHours(23, 59, 59, 999);
            result = result.filter(l => new Date(l.expiry_date).setHours(0, 0, 0, 0) <= to);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortOrder) {
                case 'expiry_asc':
                    return new Date(a.expiry_date) - new Date(b.expiry_date);
                case 'expiry_desc':
                    return new Date(b.expiry_date) - new Date(a.expiry_date);
                case 'shop_asc':
                    return a.shop_name.localeCompare(b.shop_name, 'th');
                case 'shop_desc':
                    return b.shop_name.localeCompare(a.shop_name, 'th');
                default:
                    return 0;
            }
        });

        return result;
    }, [allLicenses, search, filterType, statusFilter, dateFrom, dateTo, sortOrder]);

    // Pagination
    const totalPages = Math.ceil(filteredLicenses.length / limit);
    const currentData = useMemo(() => {
        return filteredLicenses.slice((page - 1) * limit, page * limit);
    }, [filteredLicenses, page, limit]);

    // Count stats for cards
    const stats = useMemo(() => {
        const expired = allLicenses.filter(l => parseInt(l.days_until_expiry) < 0).length;
        const critical = allLicenses.filter(l => {
            const days = parseInt(l.days_until_expiry);
            return days >= 0 && days <= EXPIRY_THRESHOLDS.CRITICAL;
        }).length;
        const warning = allLicenses.filter(l => {
            const days = parseInt(l.days_until_expiry);
            return days > EXPIRY_THRESHOLDS.CRITICAL && days <= EXPIRY_THRESHOLDS.WARNING;
        }).length;
        const info = allLicenses.filter(l => parseInt(l.days_until_expiry) > EXPIRY_THRESHOLDS.WARNING).length;
        
        return { expired, critical, warning, info, total: allLicenses.length };
    }, [allLicenses]);

    // Count expired for button
    const expiredCount = stats.expired;

    // Reset to page 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [search, filterType, statusFilter, dateFrom, dateTo, sortOrder]);

    const clearFilters = () => {
        setSearch('');
        setFilterType('');
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
        setSortOrder('expiry_asc');
    };

    const handleDelete = (license) => {
        // Optimistic remove
        setAllLicenses(prev => prev.filter(l => l.id !== license.id));

        pendingDelete({
            itemName: `ใบอนุญาต ${license.license_number}`,
            onDelete: async () => {
                try {
                    const res = await fetch(`/api/licenses?id=${license.id}`, { method: 'DELETE' });
                    const data = await res.json();
                    if (data.success) {
                        // Success - item implied deleted
                    } else {
                        throw new Error(data.message);
                    }
                } catch (err) {
                    showError(err.message);
                    // Revert if failed
                    setAllLicenses(prev => [...prev, license]);
                }
            },
            onCancel: () => {
                // Revert
                setAllLicenses(prev => [...prev, license]);
            }
        });
    };

    const handleClearExpired = async () => {
        const expiredLicenses = allLicenses.filter(l => {
             const days = parseInt(l.days_until_expiry);
             return days < 0;
        });

        if (expiredLicenses.length === 0) {
            showInfo('ไม่มีรายการที่หมดอายุ');
            return;
        }

        const confirmed = await confirmDelete(`${expiredLicenses.length} รายการที่หมดอายุ`);
        if (confirmed) {
            setLoading(true);
            try {
                // Delete all expired licenses
                const deletePromises = expiredLicenses.map(l => 
                    fetch(`/api/licenses?id=${l.id}`, { method: 'DELETE' }).then(r => r.json())
                );
                
                await Promise.all(deletePromises);
                showSuccess(`ลบ ${expiredLicenses.length} รายการเรียบร้อยแล้ว`);
                fetchData();
            } catch (error) {
                showError('เกิดข้อผิดพลาดในการลบข้อมูล');
                fetchData();
            } finally {
                setLoading(false);
            }
        }
    };

    const handleStatusFilterToggle = (status) => {
        setStatusFilter(prev => prev === status ? '' : status);
    };

    const skeletonColumns = [
        { width: '10%' },
        { width: '20%' },
        { width: '15%' },
        { width: '15%' },
        { width: '15%', center: true },
        { width: '20%', center: true }
    ];

    return (
        <>
            <StatsSection stats={stats} onFilterClick={handleStatusFilterToggle} currentFilter={statusFilter} />
            <div className="card">
            <div className="card-header">
                <h3 className="card-title">
                    <i className="fas fa-bell"></i> ใบอนุญาตใกล้หมดอายุ
                    <span style={{ 
                        fontSize: '0.85rem', 
                        color: 'var(--text-muted)', 
                        fontWeight: 'normal', 
                        marginLeft: '1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <i className="fas fa-info-circle"></i>
                        ตรวจสอบรายการที่ต้องดำเนินการต่ออายุ
                    </span>
                </h3>
                <StatusFilterBadges
                    currentFilter={statusFilter}
                    onToggle={handleStatusFilterToggle}
                    onClear={() => setStatusFilter('')}
                />
            </div>

            <div className="card-body">
                <FilterRow>
                    <div className="filter-group">
                        <SearchInput
                            value={search}
                            onChange={setSearch}
                            placeholder="ค้นหาร้านค้า, เลขที่..."
                            className="w-full form-input"
                        />
                    </div>

                    <div className="filter-group">
                        <CustomSelect
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            options={[
                                { value: '', label: 'ทุกประเภทใบอนุญาต' },
                                ...typesList.map(t => ({ value: t, label: t }))
                            ]}
                            placeholder="ประเภทใบอนุญาต"
                            icon="fas fa-tags"
                        />
                    </div>

                    <div className="filter-group">
                        <DatePicker
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            placeholder="วันหมดอายุ (เริ่มต้น)"
                        />
                    </div>

                    <div className="filter-group">
                        <DatePicker
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            placeholder="วันหมดอายุ (สิ้นสุด)"
                        />
                    </div>

                    <div className="filter-group">
                        <CustomSelect
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                            options={[
                                { value: 'expiry_asc', label: 'วันหมดอายุ (ใกล้ -> ไกล)' },
                                { value: 'expiry_desc', label: 'วันหมดอายุ (ไกล -> ใกล้)' },
                                { value: 'shop_asc', label: 'ชื่อร้าน (ก-ฮ)' },
                                { value: 'shop_desc', label: 'ชื่อร้าน (ฮ-ก)' }
                            ]}
                            icon="fas fa-sort"
                            placeholder="เรียงลำดับ"
                        />
                    </div>

                    <button
                        className="btn btn-secondary"
                        onClick={clearFilters}
                        title="ล้างตัวกรอง"
                        style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', whiteSpace: 'nowrap' }}
                    >
                        <i className="fas fa-undo"></i>
                        <span>รีเซ็ตตัวกรอง</span>
                    </button>

                    <button
                        className={`btn ${expiredCount > 0 ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={handleClearExpired}
                        disabled={expiredCount === 0}
                        title={expiredCount > 0 ? "ลบรายการที่หมดอายุแล้วทั้งหมด" : "ไม่มีรายการที่หมดอายุ"}
                        style={{ 
                            height: '42px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '0 16px', 
                            whiteSpace: 'nowrap',
                            opacity: expiredCount === 0 ? 0.6 : 1,
                            cursor: expiredCount === 0 ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <i className="fas fa-trash-alt"></i>
                        <span>ล้างที่หมดอายุ ({expiredCount})</span>
                    </button>
                </FilterRow>

                <div className="table-card">
                    <div className="table-container" style={{ maxHeight: '600px', overflow: 'auto' }}>
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th>รหัสร้านค้า</th>
                                    <th>ชื่อร้านค้า</th>
                                    <th>ประเภท</th>
                                    <th>เลขที่</th>
                                    <th className="text-center">หมดอายุ</th>
                                    <th className="text-center">สถานะ</th>
                                    <th className="row-actions">ลบ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <TableSkeleton rows={5} columns={skeletonColumns} />
                                ) : currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="text-center">ไม่พบข้อมูล</td>
                                    </tr>
                                ) : (
                                    currentData.map(license => (
                                        <ExpiringLicenseRow 
                                            key={license.id} 
                                            license={license} 
                                            onDelete={() => handleDelete(license)}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={filteredLicenses.length}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                    onItemsPerPageChange={(l) => { setLimit(l); setPage(1); }}
                    showItemsPerPage
                    showPageJump
                    showTotalInfo
                />
            </div>

            <style jsx>{`
                .active-filter {
                    outline: 2px solid #fff;
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.5);
                }
                :global(.filter-row) {
                    display: grid !important;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    width: 100%;
                }
                :global(.filter-group) {
                    width: 100%;
                    min-width: 0; /* Prevent grid blowout */
                }
                /* Force all inputs to be full width within their group */
                :global(.filter-group .custom-select-wrapper),
                :global(.filter-group .datepicker-wrapper),
                :global(.filter-group input) {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important; 
                }
                /* Ensure triggers match height */
                :global(.datepicker-trigger),
                :global(.custom-select-trigger),
                :global(.filter-group input) {
                    height: 42px; /* Consistent height */
                    box-sizing: border-box;
                }
            `}</style>
        </div>
        </>
    );
}

/**
 * StatusFilterBadges Component
 */
function StatusFilterBadges({ currentFilter, onToggle, onClear }) {
    return (
        <div className="filter-badges" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {EXPIRY_STATUS_FILTERS.map(filter => (
                <span
                    key={filter.value}
                    className={`badge ${filter.badgeClass} filter-badge ${currentFilter === filter.value ? 'active-filter' : ''}`}
                    style={{
                        cursor: 'pointer',
                        opacity: currentFilter && currentFilter !== filter.value ? 0.5 : 1
                    }}
                    onClick={() => onToggle(filter.value)}
                >
                    <i className={filter.icon}></i> {filter.label}
                </span>
            ))}
            {currentFilter && (
                <span
                    className="badge badge-secondary filter-badge"
                    style={{ cursor: 'pointer' }}
                    onClick={onClear}
                >
                    <i className="fas fa-times"></i> ล้างตัวกรอง
                </span>
            )}
        </div>
    );
}

/**
 * ExpiringLicenseRow Component
 */
function ExpiringLicenseRow({ license, onDelete }) {
    const daysLeft = parseInt(license.days_until_expiry);
    const expiryStatus = getExpiryStatus(daysLeft);

    return (
        <tr>
            <td><strong>{license.shop_code || '-'}</strong></td>
            <td>{license.shop_name}</td>
            <td>{license.type_name}</td>
            <td>{license.license_number}</td>
            <td className="text-center">{formatThaiDate(license.expiry_date)}</td>
            <td className="text-center">
                <span className={`badge ${expiryStatus.badgeClass}`}>
                    <i className={expiryStatus.icon}></i> {expiryStatus.text}
                </span>
            </td>
            <td className="row-actions">
                <button 
                    className="header-btn danger"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    title="ลบรายการ"
                >
                    <i className="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    );
}

/**
 * Helper function to determine expiry status
 */
function getExpiryStatus(daysLeft) {
    if (daysLeft < 0) {
        return {
            badgeClass: 'badge-expired',
            icon: 'fas fa-times-circle',
            text: `หมดอายุแล้ว ${Math.abs(daysLeft)} วัน`
        };
    }
    if (daysLeft === 0) {
        return {
            badgeClass: 'badge-expired',
            icon: 'fas fa-exclamation-triangle',
            text: 'หมดอายุวันนี้'
        };
    }
    if (daysLeft <= EXPIRY_THRESHOLDS.CRITICAL) {
        return {
            badgeClass: 'badge-critical',
            icon: 'fas fa-exclamation-triangle',
            text: `เหลือ ${daysLeft} วัน`
        };
    }
    if (daysLeft <= EXPIRY_THRESHOLDS.WARNING) {
        return {
            badgeClass: 'badge-warning',
            icon: 'fas fa-exclamation-circle',
            text: `เหลือ ${daysLeft} วัน`
        };
    }
    return {
        badgeClass: 'badge-info',
        icon: 'fas fa-clock',
        text: `เหลือ ${daysLeft} วัน`
    };
}

/**
 * StatsSection Component - แสดง stat cards ด้านบน ใช้สีเดียวกับ badge
 */
function StatsSection({ stats, onFilterClick, currentFilter }) {
    const statCards = [
        {
            key: 'expired',
            icon: 'fas fa-times-circle',
            value: stats.expired,
            label: 'หมดอายุแล้ว',
            colorClass: 'expired'
        },
        {
            key: 'critical',
            icon: 'fas fa-exclamation-triangle',
            value: stats.critical,
            label: '≤ 7 วัน',
            colorClass: 'critical'
        },
        {
            key: 'warning',
            icon: 'fas fa-exclamation-circle',
            value: stats.warning,
            label: '8-14 วัน',
            colorClass: 'warning'
        },
        {
            key: 'info',
            icon: 'fas fa-clock',
            value: stats.info,
            label: '> 14 วัน',
            colorClass: 'info'
        }
    ];

    return (
        <div className="card mb-3" style={{ border: 'none', boxShadow: 'var(--shadow-sm)' }}>
            <div className="card-body p-2">
                <div className="expiring-stats-row">
                    {statCards.map((card, index) => (
                        <div
                            key={card.key}
                            className={`stat-item ${currentFilter === card.key ? 'active' : ''}`}
                            onClick={() => onFilterClick(card.key)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className={`stat-icon ${card.colorClass}`}>
                                <i className={card.icon}></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-value">{card.value}</div>
                                <div className="stat-label">{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <style jsx>{`
                .expiring-stats-row {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                }
                @media (max-width: 768px) {
                    .expiring-stats-row {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                .stat-item {
                    padding: 0.5rem 1rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    position: relative;
                }
                .stat-item:not(:last-child)::after {
                    content: '';
                    position: absolute;
                    right: -0.5rem;
                    top: 20%;
                    height: 60%;
                    width: 1px;
                    background-color: var(--border-color);
                    opacity: 0.5;
                }
                @media (max-width: 768px) {
                    .stat-item:not(:last-child)::after {
                        display: none;
                    }
                }
                .stat-item:hover {
                    background-color: rgba(0,0,0,0.02);
                }
                .stat-item.active {
                    background-color: rgba(255, 255, 255, 1);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    transform: scale(1.02);
                }
                .stat-icon {
                    width: 40px;
                    height: 40px;
                    min-width: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.1rem;
                }
                .stat-content {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                }
                .stat-value {
                    font-size: 1.125rem;
                    font-weight: 700;
                    line-height: 1.2;
                    color: var(--text-primary);
                }
                .stat-label {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    white-space: nowrap;
                }
                .stat-icon.expired {
                    background: rgba(220, 38, 38, 0.1);
                    color: #dc2626;
                }
                .stat-icon.critical {
                    background: rgba(234, 88, 12, 0.1);
                    color: #ea580c;
                }
                .stat-icon.warning {
                    background: rgba(217, 119, 6, 0.1);
                    color: #d97706;
                }
                .stat-icon.info {
                    background: rgba(37, 99, 235, 0.1);
                    color: #2563eb;
                }
            `}</style>
        </div>
    );
}
