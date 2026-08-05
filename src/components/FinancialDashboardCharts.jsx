'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { formatNumber, formatCurrency } from '@/utils/formatters';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Filler);

export default function FinancialDashboardCharts({ data, period }) {
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

    // Styling configurations (GovTech Trust Colors)
    const primaryColor = '#1d4ed8'; // blue-700
    const secondaryColor = '#3b82f6'; // blue-500
    const accentColor = '#0f172a'; // slate-900
    const successColor = '#059669'; // emerald-600
    const warningColor = '#d97706'; // amber-600

    // Prepare Doughnut Data (Revenue by Type)
    const doughnutData = {
        labels: revenueByType.map(t => t.type_name),
        datasets: [{
            data: revenueByType.map(t => parseFloat(t.revenue)),
            backgroundColor: [
                '#1e40af', // blue-800
                '#3b82f6', // blue-500
                '#93c5fd', // blue-300
                '#0f172a', // slate-900
                '#64748b', // slate-500
                '#cbd5e1'  // slate-300
            ],
            borderWidth: 1,
        }]
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { usePointStyle: true, font: { family: 'inherit' } } },
            tooltip: {
                callbacks: {
                    label: (context) => ` \${context.label}: ฿\${formatNumber(context.raw)}`
                }
            }
        },
        cutout: '70%'
    };

    // Prepare Trend Data (Line/Area Chart)
    const getMonthName = (monthNum) => {
        const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        return months[parseInt(monthNum) - 1] || monthNum;
    };

    const trendLabels = trend.map(t => period === 'year' ? getMonthName(t.label) : t.label);
    
    const trendData = {
        labels: trendLabels,
        datasets: [
            {
                label: 'ค่าธรรมเนียมจัดเก็บ (บาท)',
                data: trend.map(t => parseFloat(t.revenue)),
                borderColor: primaryColor,
                backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue-500 with opacity
                borderWidth: 2,
                fill: true,
                tension: 0.4, // smooth curves
                pointBackgroundColor: primaryColor,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const trendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => ` ฿\${formatNumber(context.raw)}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => '฿' + formatNumber(value)
                },
                grid: { color: '#e2e8f0', drawBorder: false }
            },
            x: {
                grid: { display: false, drawBorder: false }
            }
        },
        interaction: { intersect: false, mode: 'index' }
    };

    // Helper for rendering positive/negative diffs
    const renderDiff = (diff, percent, unit) => {
        const isPositive = diff >= 0;
        const color = isPositive ? successColor : warningColor;
        const icon = isPositive ? 'fa-arrow-up' : 'fa-arrow-down';
        const sign = isPositive ? '+' : '';
        return (
            <div style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                <span style={{ color, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <i className={`fas \${icon}`}></i>
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
                
                {/* Revenue Card */}
                <div className="card" style={{ padding: '20px', borderLeft: `4px solid \${primaryColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>ยอดจัดเก็บค่าธรรมเนียม</p>
                            <h2 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: accentColor }}>
                                ฿{formatNumber(currentRev)}
                            </h2>
                        </div>
                        <div style={{ backgroundColor: '#eff6ff', padding: '10px', borderRadius: '8px', color: primaryColor }}>
                            <i className="fas fa-wallet fa-lg"></i>
                        </div>
                    </div>
                    {renderDiff(revDiff, revDiffPercent, 'บาท')}
                </div>

                {/* Licenses Card */}
                <div className="card" style={{ padding: '20px', borderLeft: `4px solid \${secondaryColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>สถิติการต่ออายุ/ออกใบอนุญาต</p>
                            <h2 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: accentColor }}>
                                {formatNumber(currentLic)} <span style={{ fontSize: '1rem', color: '#64748b' }}>รายการ</span>
                            </h2>
                        </div>
                        <div style={{ backgroundColor: '#eff6ff', padding: '10px', borderRadius: '8px', color: secondaryColor }}>
                            <i className="fas fa-file-contract fa-lg"></i>
                        </div>
                    </div>
                    {renderDiff(licDiff, licDiffPercent, 'รายการ')}
                </div>

                {/* Forecast Card */}
                <div className="card" style={{ padding: '20px', borderLeft: `4px solid \${successColor}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>คาดการณ์รายได้ (30 วันข้างหน้า)</p>
                            <h2 style={{ margin: '10px 0 0 0', fontSize: '2rem', color: accentColor }}>
                                ฿{formatNumber(parseFloat(forecast))}
                            </h2>
                        </div>
                        <div style={{ backgroundColor: '#ecfdf5', padding: '10px', borderRadius: '8px', color: successColor }}>
                            <i className="fas fa-chart-line fa-lg"></i>
                        </div>
                    </div>
                    <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#64748b' }}>
                        ประเมินจากใบอนุญาตที่กำลังจะหมดอายุ
                    </div>
                </div>
            </div>

            {/* 2. Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                
                {/* Trend Line Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ fontSize: '1.1rem', color: accentColor }}>
                            <i className="fas fa-chart-area" style={{ color: primaryColor, marginRight: '8px' }}></i> 
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
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title" style={{ fontSize: '1.1rem', color: accentColor }}>
                            <i className="fas fa-chart-pie" style={{ color: secondaryColor, marginRight: '8px' }}></i> 
                            สัดส่วนตามประเภทใบอนุญาต
                        </h3>
                    </div>
                    <div className="card-body" style={{ height: '350px', position: 'relative' }}>
                        {revenueByType.length > 0 ? (
                            <>
                                <Doughnut data={doughnutData} options={doughnutOptions} />
                                <div style={{
                                    position: 'absolute', top: '50%', left: '35%', transform: 'translate(-50%, -50%)',
                                    textAlign: 'center', pointerEvents: 'none'
                                }}>
                                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b' }}>รวมทั้งหมด</span>
                                    <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 'bold', color: accentColor }}>
                                        {formatNumber(revenueByType.reduce((sum, item) => sum + parseFloat(item.revenue), 0))}
                                    </span>
                                </div>
                            </>
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
