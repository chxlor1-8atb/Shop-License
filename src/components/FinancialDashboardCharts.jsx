'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Wallet, FileText, TrendingUp, TrendingDown, ArrowUp, ArrowDown, Activity, FileBadge, AlertTriangle } from 'lucide-react';
import { formatNumber, formatCurrency } from '@/utils/formatters';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler);

// Use system fonts
ChartJS.defaults.font.family = 'var(--font-noto-thai), var(--font-inter), sans-serif';

export default function FinancialDashboardCharts({ data, period, systemStats }) {
    if (!data || !data.overview) {
        return (
            <div className="card" style={{ minHeight: '350px' }}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="spinner"></div>
                    <span style={{ marginLeft: '10px' }}>กำลังโหลดข้อมูล...</span>
                </div>
            </div>
        );
    }

    const { overview, revenueByType, trend, forecast } = data;
    
    // Overview Metrics
    const currentRev = parseFloat(overview.current_revenue) || 0;
    const prevRev = parseFloat(overview.previous_revenue) || 0;
    const revDiff = currentRev - prevRev;
    const revDiffPercent = prevRev === 0 ? (currentRev > 0 ? 100 : 0) : ((revDiff / prevRev) * 100).toFixed(1);
    
    const currentLic = parseInt(overview.current_licenses) || 0;
    const prevLic = parseInt(overview.previous_licenses) || 0;
    const licDiff = currentLic - prevLic;
    const licDiffPercent = prevLic === 0 ? (currentLic > 0 ? 100 : 0) : ((licDiff / prevLic) * 100).toFixed(1);

    // Styling configurations (Premium Vibrant Colors)
    const primaryColor = '#4f46e5'; // indigo-600
    const secondaryColor = '#0ea5e9'; // sky-500
    const accentColor = '#0f172a'; // slate-900
    const successColor = '#059669'; // emerald-600
    const warningColor = '#d97706'; // amber-600

    // Prepare Doughnut Data (Revenue by Type)
    const doughnutData = {
        labels: revenueByType.map(t => t.type_name),
        datasets: [{
            data: revenueByType.map(t => parseFloat(t.revenue)),
            backgroundColor: [
                '#4f46e5', // indigo-600
                '#0ea5e9', // sky-500
                '#14b8a6', // teal-500
                '#8b5cf6', // violet-500
                '#f59e0b', // amber-500
                '#f43f5e'  // rose-500
            ],
            hoverOffset: 4,
            borderWidth: 2,
            borderColor: '#ffffff',
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: 'bottom', 
                labels: { 
                    usePointStyle: true, 
                    font: { family: 'inherit', size: 14 },
                    padding: 16,
                    color: '#64748b'
                } 
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleFont: { family: 'inherit', size: 13, weight: 'normal' },
                bodyFont: { family: 'inherit', size: 14, weight: 'bold' },
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                usePointStyle: true,
                boxPadding: 6,
                callbacks: {
                    title: (context) => context[0].label,
                    label: (context) => ' ฿' + formatNumber(context.raw)
                }
            }
        },
        cutout: '75%'
    };

    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: (chart) => {
            const { ctx, chartArea } = chart;
            if (!chartArea) return;
            
            ctx.save();
            const total = revenueByType.reduce((sum, item) => sum + parseFloat(item.revenue), 0);
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const centerX = chartArea.left + chartArea.width / 2;
            const centerY = chartArea.top + chartArea.height / 2;
            
            // Draw subtitle
            ctx.font = 'normal 14px sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('รวมทั้งหมด', centerX, centerY - 14);
            
            // Draw amount
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = accentColor;
            ctx.fillText(formatNumber(total), centerX, centerY + 14);
            
            ctx.restore();
        }
    };

    // Process Trend Data to fill missing dates/months
    let finalTrendLabels = [];
    let finalTrendData = [];

    if (period === 'year') {
        finalTrendLabels = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        finalTrendData = Array(12).fill(0);
        
        trend.forEach(t => {
            const m = parseInt(t.label) - 1;
            if (m >= 0 && m < 12) {
                finalTrendData[m] = parseFloat(t.revenue);
            }
        });
    } else {
        const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        finalTrendLabels = trend.map(t => {
            if (!t.label) return '';
            const parts = t.label.split('-');
            if (parts.length === 3) {
                const day = parseInt(parts[2], 10);
                const monthIdx = parseInt(parts[1], 10) - 1;
                return `${day} ${thaiMonths[monthIdx]}`;
            }
            return t.label;
        });
        finalTrendData = trend.map(t => parseFloat(t.revenue));
    }
    
    const trendData = {
        labels: finalTrendLabels,
        datasets: [
            {
                label: 'ค่าธรรมเนียมจัดเก็บ (บาท)',
                data: finalTrendData,
                borderColor: primaryColor,
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 350);
                    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.25)'); 
                    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)'); 
                    return gradient;
                },
                borderWidth: 3,
                fill: true,
                tension: 0.45, // smoother curves
                pointBackgroundColor: '#ffffff',
                pointBorderColor: primaryColor,
                pointBorderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: primaryColor,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2,
            }
        ]
    };

    const trendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleFont: { family: 'inherit', size: 13, weight: 'normal' },
                bodyFont: { family: 'inherit', size: 14, weight: 'bold' },
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    title: (context) => 'เดือน ' + context[0].label,
                    label: (context) => 'ยอดจัดเก็บ: ฿' + formatNumber(context.raw)
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => '฿' + formatNumber(value),
                    color: '#94a3b8'
                },
                grid: { color: 'rgba(226, 232, 240, 0.4)', drawBorder: false, borderDash: [] },
                border: { display: false }
            },
            x: {
                ticks: { 
                    color: '#94a3b8',
                    maxTicksLimit: 12,
                    maxRotation: 0,
                    minRotation: 0
                },
                grid: { display: false, drawBorder: false },
                border: { display: false }
            }
        },
        interaction: { intersect: false, mode: 'index' }
    };

    // Helper for rendering positive/negative diffs
    const renderDiff = (diff, percent, unit) => {
        const isPositive = diff >= 0;
        const color = isPositive ? successColor : warningColor;
        const Icon = isPositive ? TrendingUp : TrendingDown;
        const sign = isPositive ? '+' : '';
        return (
            <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                <span style={{ color, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Icon size={16} />
                    {sign}{formatNumber(diff)} {unit} ({sign}{percent}%)
                </span>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>เทียบกับช่วงเวลาก่อนหน้า</span>
            </div>
        );
    };

    return (
        <div className="financial-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. Overview Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                
                {/* Dynamic Revenue Card */}
                <div className="card summary-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                ยอดจัดเก็บรวม ({period === 'week' ? 'รายสัปดาห์' : period === 'month' ? 'รายเดือน' : 'รายปี'})
                            </p>
                            <h2 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: accentColor }}>
                                ฿{formatNumber(parseFloat(overview.current_revenue || 0))}
                            </h2>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', padding: '14px', borderRadius: '12px', color: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.1)' }}>
                            <Wallet size={24} />
                        </div>
                    </div>
                    {renderDiff(revDiff, revDiffPercent, '฿')}
                </div>

                {/* Dynamic Licenses Card */}
                <div className="card summary-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                จำนวนใบอนุญาต ({period === 'week' ? 'รายสัปดาห์' : period === 'month' ? 'รายเดือน' : 'รายปี'})
                            </p>
                            <h2 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: accentColor }}>
                                {formatNumber(parseInt(overview.current_licenses || 0))} <span style={{ fontSize: '1rem', color: '#64748b' }}>รายการ</span>
                            </h2>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', padding: '14px', borderRadius: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(22, 163, 74, 0.1)' }}>
                            <FileText size={24} />
                        </div>
                    </div>
                    {renderDiff(licDiff, licDiffPercent, 'รายการ')}
                </div>

                {/* Total Yearly Card (Static overview) */}
                <div className="card summary-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>ภาพรวมทั้งปี (Year to Date)</p>
                            <h2 style={{ margin: '10px 0 0 0', fontSize: '1.5rem', color: accentColor }}>
                                ฿{formatNumber(parseFloat(overview.yearly_revenue || 0))}
                            </h2>
                            <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                                {formatNumber(parseInt(overview.yearly_licenses || 0))} รายการ
                            </p>
                        </div>
                        <div style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', padding: '14px', borderRadius: '12px', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(217, 119, 6, 0.1)' }}>
                            <FileBadge size={24} />
                        </div>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b' }}>
                        นับตั้งแต่ต้นปีถึงปัจจุบัน
                    </div>
                </div>
            </div>

            {/* 2. Charts Row */}
            <div className="dashboard-charts-grid">
                
                {/* Trend Line Chart */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', borderBottom: 'none', padding: '0 0 24px 0' }}>
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                            <Activity color={primaryColor} size={20} style={{ flexShrink: 0, minWidth: '20px', minHeight: '20px' }} />
                        </div>
                        <h3 className="card-title" style={{ fontSize: '1.05rem', color: accentColor, margin: 0, fontWeight: 600 }}>
                            แนวโน้มการจัดเก็บค่าธรรมเนียม
                        </h3>
                    </div>
                    <div className="card-body" style={{ height: '350px' }}>
                        {trend.length > 0 ? (
                            <Line data={trendData} options={trendOptions} />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                ไม่มีข้อมูลในช่วงเวลานี้
                            </div>
                        )}
                    </div>
                </div>

                {/* Doughnut Chart - Revenue by Type */}
                <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', borderBottom: 'none', padding: '0 0 24px 0' }}>
                        <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f1f5f9' }}>
                            <FileBadge color={secondaryColor} size={20} style={{ flexShrink: 0, minWidth: '20px', minHeight: '20px' }} />
                        </div>
                        <h3 className="card-title" style={{ fontSize: '1.05rem', color: accentColor, margin: 0, fontWeight: 600 }}>
                            สัดส่วนตามประเภทใบอนุญาต
                        </h3>
                    </div>
                    <div className="card-body" style={{ height: '350px', position: 'relative' }}>
                        {revenueByType.length > 0 ? (
                            <Doughnut data={doughnutData} options={doughnutOptions} plugins={[centerTextPlugin]} />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                ไม่มีข้อมูล
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
