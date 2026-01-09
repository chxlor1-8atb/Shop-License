'use client';

import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function DashboardCharts({ breakdown = [] }) {
    // Prepare Chart Data
    const barData = {
        labels: breakdown.map(b => b.type_name),
        datasets: [
            {
                label: 'ใช้งาน',
                data: breakdown.map(b => parseInt(b.active_count)),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
            },
            {
                label: 'ใกล้หมดอายุ',
                data: breakdown.map(b => parseInt(b.expiring_count)),
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
            },
            {
                label: 'หมดอายุ',
                data: breakdown.map(b => parseInt(b.expired_count)),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 800,
            easing: 'easeOutQuart'
        },
        scales: {
            x: { stacked: false },
            y: { stacked: false }
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    padding: 20,
                    usePointStyle: true,
                    font: {
                        size: 12
                    }
                }
            }
        }
    };

    if (breakdown.length === 0) {
        return (
            <div className="card chart-card" style={{ minHeight: '350px' }}>
                <div className="card-header">
                    <h3 className="card-title"><i className="fas fa-chart-bar"></i> สถานะใบอนุญาตตามประเภท</h3>
                </div>
                <div className="card-body" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>ไม่มีข้อมูลกราฟ</span>
                </div>
            </div>
        );
    }

    return (
        <div className="card chart-card" style={{ minHeight: '350px' }}>
            <div className="card-header">
                <h3 className="card-title"><i className="fas fa-chart-bar"></i> สถานะใบอนุญาตตามประเภท</h3>
            </div>
            <div className="card-body" style={{ height: '300px' }}>
                <Bar data={barData} options={chartOptions} />
            </div>
        </div>
    );
}
