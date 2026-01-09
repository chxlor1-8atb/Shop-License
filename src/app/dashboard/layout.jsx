'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatThaiDateFull } from '@/utils/formatters';
import { logout, checkAuth as checkAuthUtil } from '@/utils/auth';
import '../../styles/style.css';
import '../../styles/sweetalert-custom.css';
import '../../styles/toast.css';

// Lazy load heavy components to reduce initial bundle
const PatchNotesModal = dynamic(
    () => import('@/components/PatchNotesModal').then(mod => ({ default: mod.default })),
    { ssr: false }
);

const VersionBadge = dynamic(
    () => import('@/components/PatchNotesModal').then(mod => ({ default: mod.VersionBadge })),
    { ssr: false, loading: () => <span className="version-badge-placeholder" /> }
);

export default function DashboardLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState('');
    const [expiringCount, setExpiringCount] = useState(0);
    const [showPatchNotes, setShowPatchNotes] = useState(false);

    useEffect(() => {
        const init = async () => {
            await checkAuth();
            fetchExpiringCount();
        };
        init();
        updateDateTime();
        const timer = setInterval(updateDateTime, 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchExpiringCount = async () => {
        try {
            const res = await fetch('/api/dashboard?action=expiring_count');
            const data = await res.json();
            if (data.success) {
                setExpiringCount(data.count || 0);
            }
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };



    const updateDateTime = () => {
        const d = new Date();
        const weekday = d.toLocaleDateString('th-TH', { weekday: 'long' });
        setCurrentDate(`${weekday} ${formatThaiDateFull(d)}`);
    };

    const checkAuth = async () => {
        try {
            const { authenticated, user: authUser } = await checkAuthUtil();
            if (!authenticated) {
                router.push('/');
                return;
            }
            setUser(authUser);
        } catch {
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    // Use centralized logout function
    const handleLogout = () => logout();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="loading"><i className="fas fa-spinner fa-spin"></i> กำลังโหลด...</div>
            </div>
        );
    }

    if (!user) return null;

    // Helper to check active state more accurately
    const isActive = (path) => {
        if (path === '/dashboard' && pathname === '/dashboard') return true;
        if (path !== '/dashboard' && pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`} id="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img src="/image/shop-logo.png" alt="Shop License" style={{ width: '40px', height: '40px', borderRadius: '12px' }} />
                        <span>Shop License</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <div className="nav-section-title">เมนูหลัก</div>
                        <Link href="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
                            <i className="fas fa-chart-pie"></i><span>Dashboard</span>
                        </Link>
                        <Link href="/dashboard/expiring" className={`nav-link ${isActive('/dashboard/expiring') ? 'active' : ''}`}>
                            <i className="fas fa-bell"></i>
                            <span>ใบอนุญาตใกล้หมดอายุ</span>
                            {expiringCount > 0 && <span className="nav-badge" style={{ display: 'inline' }}>{expiringCount}</span>}
                        </Link>

                        {/* Legacy Links (Restored) */}
                        <Link href="/dashboard/shops" className={`nav-link ${isActive('/dashboard/shops') ? 'active' : ''}`}>
                            <i className="fas fa-store"></i><span>ร้านค้า</span>
                        </Link>
                        <Link href="/dashboard/licenses" className={`nav-link ${isActive('/dashboard/licenses') ? 'active' : ''}`}>
                            <i className="fas fa-file-alt"></i><span>ใบอนุญาต</span>
                        </Link>

                    </div>

                    <div className="nav-section">
                        <div className="nav-section-title">จัดการระบบ</div>
                        {user.role === 'admin' && (
                            <>
                                <Link href="/dashboard/users" className={`nav-link ${isActive('/dashboard/users') ? 'active' : ''}`}>
                                    <i className="fas fa-users"></i><span>ผู้ใช้งาน</span>
                                </Link>
                                <Link href="/dashboard/license-types" className={`nav-link ${isActive('/dashboard/license-types') ? 'active' : ''}`}>
                                    <i className="fas fa-tags"></i><span>ประเภทใบอนุญาต</span>
                                </Link>
                                <Link href="/dashboard/activity-logs" className={`nav-link ${isActive('/dashboard/activity-logs') ? 'active' : ''}`}>
                                    <i className="fas fa-history"></i><span>ประวัติกิจกรรม</span>
                                </Link>
                            </>
                        )}



                    </div>

                    <div className="nav-section">
                        <div className="nav-section-title">รายงาน</div>
                        <Link href="/dashboard/export" className={`nav-link ${isActive('/dashboard/export') ? 'active' : ''}`}>
                            <i className="fas fa-file-export"></i><span>ส่งออกข้อมูล</span>
                        </Link>
                    </div>
                </nav>
                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user.full_name?.charAt(0).toUpperCase() || 'U'}</div>
                        <div className="user-details">
                            <div className="user-name">{user.full_name}</div>
                            <div className="user-role">{user.role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่'}</div>
                        </div>
                        <button className="btn btn-icon btn-secondary" onClick={handleLogout} title="ออกจากระบบ">
                            <i className="fas fa-sign-out-alt"></i>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay */}
            <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={() => setSidebarOpen(false)}></div>

            {/* Main Content */}
            <main className="main-content">
                <header className="content-header">
                    <div className="header-left">
                        <button className="header-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="เปิด/ปิดเมนู">
                            <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'}`}></i>
                        </button>
                        <h1 id="pageTitle">Dashboard</h1>
                    </div>
                    <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <VersionBadge onClick={() => setShowPatchNotes(true)} />
                        <span>{currentDate}</span>
                    </div>
                </header>
                <div className="content-body">
                    {children}
                </div>
            </main>

            {/* Patch Notes Modal */}
            <PatchNotesModal
                isOpen={showPatchNotes}
                onClose={() => setShowPatchNotes(false)}
            />
        </div>
    );
}
