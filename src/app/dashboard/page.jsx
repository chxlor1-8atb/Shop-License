'use client';

import { useState } from 'react';
import useSWR from 'swr';
import FinancialDashboardCharts from '@/components/FinancialDashboardCharts';
import { SystemHealthWidget, ActionableExpiringList, RecentActivityLog } from '@/components/DashboardWidgets';
import CustomSelect from '@/components/ui/CustomSelect';
import { Plus, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

const defaultFetcher = (url) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
    const router = useRouter();
    const [period, setPeriod] = useState('year');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 543);

    // Fetch financial stats
    const { data, error, isLoading } = useSWR(
        `/api/dashboard?action=financial_summary&period=${period}&year=${selectedYear}`,
        defaultFetcher
    );

    // Fetch overall system stats
    const { data: statsData } = useSWR('/api/dashboard?action=stats', defaultFetcher);

    const getButtonStyle = (isActive) => ({
        padding: '8px 20px',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        background: isActive ? '#ffffff' : 'transparent',
        color: isActive ? '#1d4ed8' : '#64748b',
        fontWeight: isActive ? '600' : '500',
        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
        transition: 'all 0.2s ease',
        fontSize: '0.95rem',
        fontFamily: 'inherit'
    });

    return (
        <div className="content-fade-in" style={{ padding: '20px 0' }}>
            {/* Header & Quick Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a', fontWeight: 'bold' }}>Dashboard ภาพรวมระบบ</h1>
                    <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>สถิติยอดจัดเก็บค่าธรรมเนียม สถานะใบอนุญาต และความเคลื่อนไหวล่าสุด</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={() => router.push('/dashboard/export')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s', fontFamily: 'inherit' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}
                    >
                        <Download size={18} /> ออกรายงาน (Export)
                    </button>
                    <button 
                        onClick={() => router.push('/dashboard/shops')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#1d4ed8', border: 'none', borderRadius: '8px', color: '#ffffff', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 10px rgba(29, 78, 216, 0.2)', transition: 'all 0.2s', fontFamily: 'inherit' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#1e40af'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <Plus size={18} /> เพิ่มร้านค้า/ใบอนุญาต
                    </button>
                </div>
            </div>

            {/* 1. System Health Widget */}
            <SystemHealthWidget stats={statsData?.stats} />

            {/* 2. Financial Dashboard Charts Section */}
            <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: '#ffffff', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>สถิติยอดจัดเก็บค่าธรรมเนียม</h2>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {period === 'year' && (
                            <CustomSelect 
                                value={selectedYear}
                                onChange={(val) => setSelectedYear(val)}
                                options={data?.stats?.availableYears ? 
                                    data.stats.availableYears.map(year => ({ value: year, label: `ปี ${year}` })) : 
                                    [{ value: selectedYear, label: `ปี ${selectedYear}` }]
                                }
                                style={{ width: '120px' }}
                            />
                        )}

                        <div style={{ 
                            display: 'flex', 
                            background: '#f1f5f9', 
                            padding: '4px', 
                            borderRadius: '8px', 
                            border: '1px solid #e2e8f0',
                            gap: '4px'
                        }}>
                            <button onClick={() => setPeriod('week')} style={getButtonStyle(period === 'week')}>รายสัปดาห์</button>
                            <button onClick={() => setPeriod('month')} style={getButtonStyle(period === 'month')}>รายเดือน</button>
                            <button onClick={() => setPeriod('year')} style={getButtonStyle(period === 'year')}>รายปี</button>
                        </div>
                    </div>
                </div>

                {error ? (
                    <div style={{ color: '#ef4444', textAlign: 'center', padding: '40px' }}>เกิดข้อผิดพลาดในการโหลดข้อมูลการเงิน</div>
                ) : (
                    <FinancialDashboardCharts 
                        data={data?.stats || null} 
                        period={period} 
                    />
                )}
            </div>

            {/* 3. Actionable List & Activity Log */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', minHeight: '400px' }}>
                <ActionableExpiringList />
                <RecentActivityLog />
            </div>
        </div>
    );
}
