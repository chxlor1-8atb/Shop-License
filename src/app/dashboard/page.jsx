'use client';

import { useState } from 'react';
import useSWR from 'swr';
import FinancialDashboardCharts from '@/components/FinancialDashboardCharts';
import { fetcher } from '@/utils'; // Wait, let's just use standard fetch or useSWR with default fetcher.
// Actually, let's check if there's a custom hook or fetcher. I will just define a local fetcher.

const defaultFetcher = (url) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
    const [period, setPeriod] = useState('year');

    // Fetch financial stats
    const { data, error, isLoading } = useSWR(
        `/api/dashboard?action=financial_summary&period=\${period}`,
        defaultFetcher
    );

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>ภาพรวมการเงินและการให้บริการ</h1>
                    <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>สถิติยอดจัดเก็บค่าธรรมเนียมและการต่ออายุใบอนุญาต</p>
                </div>
                
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

            {error ? (
                <div className="card">
                    <div className="card-body" style={{ color: '#ef4444' }}>เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
                </div>
            ) : (
                <FinancialDashboardCharts 
                    data={data?.stats || null} 
                    period={period} 
                />
            )}
        </div>
    );
}
