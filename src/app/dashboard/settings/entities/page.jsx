'use client';

import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import Loading from '@/components/Loading';
import Link from 'next/link';

export default function EntitiesSettingsPage() {
    const [entities, setEntities] = useState([]);
    const [loading, setLoading] = useState(true);
    const initialLoadDoneRef = useRef(false);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        id: '',
        slug: '',
        label: '',
        icon: 'fa-folder',
        description: '',
        display_order: 0,
        is_active: true
    });

    useEffect(() => {
        loadEntities();
    }, []);

    const loadEntities = async () => {
        if (!initialLoadDoneRef.current) {
            setLoading(true);
        }
        try {
            const res = await fetch('/api/entities', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setEntities(data.entities || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            initialLoadDoneRef.current = true;
        }
    };

    const openModal = (entity = null) => {
        if (entity) {
            setIsEdit(true);
            setFormData({ ...entity });
        } else {
            setIsEdit(false);
            setFormData({
                id: '',
                slug: '',
                label: '',
                icon: 'fa-folder',
                description: '',
                display_order: entities.length + 1,
                is_active: true
            });
        }
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = '/api/entities';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(formData)
            });
            const data = await res.json();

            if (data.success) {
                Swal.fire({
                    title: 'สำเร็จ!',
                    text: data.message,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setShowModal(false);
                loadEntities();
            } else {
                Swal.fire('ผิดพลาด', data.message, 'error');
            }
        } catch (error) {
            Swal.fire('ผิดพลาด', error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: 'การลบ Entity จะลบข้อมูลทั้งหมดที่เกี่ยวข้องด้วย (Fields และ Records)',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบข้อมูล',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/entities?id=${id}`, { method: 'DELETE', credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    loadEntities();
                    Swal.fire('ลบสำเร็จ!', '', 'success');
                }
            } catch (error) {
                Swal.fire('ผิดพลาด', error.message, 'error');
            }
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="content-container">
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <i className="fas fa-database"></i> จัดการ Entity (ประเภทข้อมูล)
                    </h3>
                    <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                        <i className="fas fa-plus"></i> เพิ่ม Entity
                    </button>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>#</th>
                                    <th>ไอคอน</th>
                                    <th>Slug (ID)</th>
                                    <th>ชื่อแสดงผล</th>
                                    <th>คำอธิบาย</th>
                                    <th className="text-center">สถานะ</th>
                                    <th className="text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entities.map((ent, idx) => (
                                    <tr key={ent.id}>
                                        <td>{ent.display_order}</td>
                                        <td className="text-center">
                                            <i className={`fas ${ent.icon}`} style={{ fontSize: '1.2rem', color: 'var(--primary)' }}></i>
                                        </td>
                                        <td><code>{ent.slug}</code></td>
                                        <td>{ent.label}</td>
                                        <td>{ent.description}</td>
                                        <td className="text-center">
                                            {ent.is_active ?
                                                <span className="badge badge-success">ใช้งาน</span> :
                                                <span className="badge badge-secondary">ปิดใช้งาน</span>
                                            }
                                        </td>
                                        <td className="text-center">
                                            <div className="action-buttons">
                                                <Link href={`/dashboard/settings/fields?entity=${ent.id}`} className="btn btn-info btn-icon" title="จัดการ Fields">
                                                    <i className="fas fa-columns"></i>
                                                </Link>
                                                <button className="btn btn-secondary btn-icon" onClick={() => openModal(ent)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn btn-danger btn-icon" onClick={() => handleDelete(ent.id)}>
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {entities.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center py-4">ไม่พบข้อมูล Entity</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <div className={`modal-overlay ${showModal ? 'show' : ''}`}>
                <div className="modal">
                    <div className="modal-header">
                        <h3 className="modal-title">{isEdit ? 'แก้ไข Entity' : 'สร้าง Entity ใหม่'}</h3>
                        <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>ชื่ออ้างอิง (Slug) * (ภาษาอังกฤษ)</label>
                                <input
                                    type="text"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleChange}
                                    placeholder="เช่น products, inventory"
                                    disabled={isEdit}
                                    required
                                    pattern="[a-z0-9_]+"
                                />
                                <small className="text-muted">ใช้สำหรับอ้างอิงในระบบ ห้ามซ้ำกัน</small>
                            </div>
                            <div className="form-group">
                                <label>ชื่อแสดงผล (Label) *</label>
                                <input
                                    type="text"
                                    name="label"
                                    value={formData.label}
                                    onChange={handleChange}
                                    placeholder="เช่น สินค้า, คลังสินค้า"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>ไอคอน (FontAwesome Class)</label>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        name="icon"
                                        value={formData.icon}
                                        onChange={handleChange}
                                        placeholder="fa-folder"
                                    />
                                    <i className={`fas ${formData.icon}`} style={{ fontSize: '1.5rem' }}></i>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>คำอธิบาย</label>
                                <textarea
                                    name="description"
                                    value={formData.description || ''}
                                    onChange={handleChange}
                                    rows="2"
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label>ลำดับ</label>
                                <input
                                    type="number"
                                    name="display_order"
                                    value={formData.display_order}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-check">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    id="isActiveInfo"
                                />
                                <label htmlFor="isActiveInfo">เปิดใช้งาน</label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                            <button type="submit" className="btn btn-primary">{isEdit ? 'บันทึก' : 'สร้าง'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
