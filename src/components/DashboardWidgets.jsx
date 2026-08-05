'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { 
    AlertTriangle, 
    CheckCircle, 
    XCircle, 
    Clock,
    Activity,
    FileText,
    ChevronRight,
    Edit,
    Trash2,
    PlusCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatNumber } from '@/utils/formatters';

const fetcher = (url) => fetch(url).then(res => res.json());

// --- 1. System Health Widget ---
export function SystemHealthWidget({ stats }) {
    if (!stats) return null;

    const cards = [
        {
            title: 'ใบอนุญาตใช้งานอยู่',
            count: stats.active_licenses,
            icon: CheckCircle,
            color: '#10b981', // emerald-500
            bgColor: '#d1fae5' // emerald-100
        },
        {
            title: `ใกล้หมดอายุใน ${stats.expiry_warning_days || 30} วัน`,
            count: stats.expiring_soon,
            icon: AlertTriangle,
            color: '#f59e0b', // amber-500
            bgColor: '#fef3c7' // amber-100
        },
        {
            title: 'หมดอายุแล้ว',
            count: stats.expired_licenses,
            icon: XCircle,
            color: '#ef4444', // red-500
            bgColor: '#fee2e2' // red-100
        }
    ];

    return (
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                    <div key={i} className="card summary-card" style={{ flex: 1, padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '16px', background: '#ffffff' }}>
                        <div style={{ background: card.bgColor, padding: '16px', borderRadius: '14px', color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={28} strokeWidth={2.5} />
                        </div>
                        <div>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>{card.title}</p>
                            <h2 style={{ margin: '4px 0 0 0', fontSize: '1.8rem', color: '#0f172a', fontWeight: 'bold' }}>
                                {formatNumber(card.count)}
                            </h2>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// --- 2. Actionable Expiring List ---
export function ActionableExpiringList() {
    const router = useRouter();
    const { data, error, isLoading } = useSWR('/api/licenses/expiring', fetcher);

    return (
        <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px', color: '#d97706', display: 'flex' }}>
                        <AlertTriangle size={18} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>รายการใบอนุญาตใกล้หมดอายุ</h3>
                </div>
                <button onClick={() => router.push('/dashboard/expiring')} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontWeight: 500, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ดูทั้งหมด <ChevronRight size={16} />
                </button>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: '#94a3b8' }}>กำลังโหลดข้อมูล...</div>
            ) : error ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: '#ef4444' }}>เกิดข้อผิดพลาด</div>
            ) : data?.licenses?.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: '#94a3b8', flex: 1 }}>
                    <CheckCircle size={40} color="#10b981" style={{ marginBottom: '10px', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>ไม่มีใบอนุญาตใกล้หมดอายุ</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b' }}>
                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>ร้านค้า</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>ประเภท</th>
                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>หมดอายุใน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.licenses.slice(0, 5).map((lic) => {
                                const isExpired = lic.days_until_expiry < 0;
                                const daysText = isExpired ? `ผ่านมาแล้ว ${Math.abs(lic.days_until_expiry)} วัน` : `${lic.days_until_expiry} วัน`;
                                const daysColor = isExpired ? '#ef4444' : '#d97706';
                                const daysBg = isExpired ? '#fee2e2' : '#fef3c7';

                                return (
                                    <tr key={lic.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => router.push(`/dashboard/licenses?search=${lic.license_number}`)} className="hover-row">
                                        <td style={{ padding: '12px 8px', color: '#0f172a', fontWeight: 500 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                    <FileText size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{lic.shop_name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{lic.license_number}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 8px', color: '#475569' }}>{lic.type_name}</td>
                                        <td style={{ padding: '12px 8px' }}>
                                            <span style={{ background: daysBg, color: daysColor, padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, display: 'inline-block' }}>
                                                {daysText}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <style dangerouslySetInnerHTML={{__html: `
                        .hover-row:hover { background: #f8fafc; }
                    `}} />
                </div>
            )}
        </div>
    );
}

// --- 3. Recent Activity Log ---
export function RecentActivityLog() {
    const { data, error, isLoading } = useSWR('/api/dashboard?action=recent_activity', fetcher);

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE': return <PlusCircle size={14} color="#10b981" />;
            case 'UPDATE': return <Edit size={14} color="#3b82f6" />;
            case 'DELETE': return <Trash2 size={14} color="#ef4444" />;
            default: return <Activity size={14} color="#64748b" />;
        }
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'เมื่อสักครู่';
        if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'เมื่อวานนี้';
        return `${diffDays} วันที่แล้ว`;
    };

    const formatActionText = (log) => {
        const entityName = log.entity_type === 'shops' ? 'ร้านค้า' : 
                           log.entity_type === 'licenses' ? 'ใบอนุญาต' : 
                           log.entity_type === 'license_types' ? 'ประเภทใบอนุญาต' : 
                           log.entity_type === 'users' ? 'ผู้ใช้งาน' : log.entity_type;
        
        if (log.action === 'CREATE') return `เพิ่มข้อมูล${entityName}ใหม่`;
        if (log.action === 'UPDATE') return `แก้ไขข้อมูล${entityName}`;
        if (log.action === 'DELETE') return `ลบข้อมูล${entityName}`;
        return `${log.action} ${entityName}`;
    };

    return (
        <div className="card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '8px', color: '#64748b', display: 'flex' }}>
                        <Activity size={18} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>ความเคลื่อนไหวล่าสุด</h3>
                </div>
            </div>

            {isLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: '#94a3b8' }}>กำลังโหลดข้อมูล...</div>
            ) : error ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: '#ef4444' }}>เกิดข้อผิดพลาด</div>
            ) : data?.activities?.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: '#94a3b8' }}>ไม่มีความเคลื่อนไหว</div>
            ) : (
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
                    <div style={{ position: 'relative', borderLeft: '2px solid #e2e8f0', marginLeft: '12px', paddingBottom: '10px' }}>
                        {data.activities.slice(0, 7).map((log, index) => (
                            <div key={log.id} style={{ position: 'relative', paddingLeft: '24px', marginBottom: index === 6 ? 0 : '20px' }}>
                                <div style={{ 
                                    position: 'absolute', left: '-13px', top: '2px', 
                                    width: '24px', height: '24px', borderRadius: '50%', 
                                    background: '#ffffff', border: '2px solid #e2e8f0', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {getActionIcon(log.action)}
                                </div>
                                <div style={{ fontSize: '0.9rem' }}>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{log.user_name}</span>{' '}
                                    <span style={{ color: '#475569' }}>{formatActionText(log)}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={12} /> {formatTimeAgo(log.created_at)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
