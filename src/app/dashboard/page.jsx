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

    return (
        <div className="content-fade-in" style={{ padding: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>ภาพรวมการเงินและการให้บริการ</h1>
                    <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>สถิติยอดจัดเก็บค่าธรรมเนียมและการต่ออายุใบอนุญาต</p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', background: '#fff', padding: '5px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <button 
                        onClick={() => setPeriod('week')}
                        style={{ 
                            padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            background: period === 'week' ? '#eff6ff' : 'transparent',
                            color: period === 'week' ? '#1d4ed8' : '#64748b',
                            fontWeight: period === 'week' ? 'bold' : 'normal'
                        }}
                    >
                        รายสัปดาห์
                    </button>
                    <button 
                        onClick={() => setPeriod('month')}
                        style={{ 
                            padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            background: period === 'month' ? '#eff6ff' : 'transparent',
                            color: period === 'month' ? '#1d4ed8' : '#64748b',
                            fontWeight: period === 'month' ? 'bold' : 'normal'
                        }}
                    >
                        รายเดือน
                    </button>
                    <button 
                        onClick={() => setPeriod('year')}
                        style={{ 
                            padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            background: period === 'year' ? '#eff6ff' : 'transparent',
                            color: period === 'year' ? '#1d4ed8' : '#64748b',
                            fontWeight: period === 'year' ? 'bold' : 'normal'
                        }}
                    >
                        รายปี
                    </button>
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
