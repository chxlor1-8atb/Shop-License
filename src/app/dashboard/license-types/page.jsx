'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_ENDPOINTS } from '@/constants';
import { showSuccess, showError, pendingDelete } from '@/utils/alerts';

// UI Components
import EditableCell from '@/components/ui/EditableCell';
import Modal from '@/components/ui/Modal';
import TableSkeleton from '@/components/ui/TableSkeleton';

// Constants
const INITIAL_FORM_DATA = {
    id: '',
    name: '',
    description: '',
    validity_days: 365
};

/**
 * LicenseTypesPage Component
 */
export default function LicenseTypesPage() {
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_ENDPOINTS.LICENSE_TYPES}?t=${new Date().getTime()}`);
            const data = await response.json();
            if (data.success) {
                setTypes(data.types || []);
            }
        } catch (error) {
            console.error('Failed to fetch types:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Computed statistics using useMemo
    const stats = useMemo(() => ({
        totalTypes: types.length,
        activeTypes: types.filter(t => parseInt(t.license_count) > 0).length,
        totalLicenses: types.reduce((acc, curr) => acc + parseInt(curr.license_count || 0), 0)
    }), [types]);

    const handleInlineUpdate = async (typeId, field, value) => {
        const type = types.find(t => t.id === typeId);
        if (!type) return;

        const updateData = {
            id: typeId,
            name: type.name || type.type_name,
            description: type.description || '',
            validity_days: type.validity_days || 365,
            [field]: value
        };

        try {
            const response = await fetch(API_ENDPOINTS.LICENSE_TYPES, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();

            if (data.success) {
                setTypes(prev => prev.map(t =>
                    t.id === typeId ? { ...t, [field]: value } : t
                ));
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            showError(error.message);
            throw error;
        }
    };

    const handleDelete = (id) => {
        const itemToDelete = types.find(t => t.id === id);
        if (!itemToDelete) return;

        // Optimistic update
        setTypes(prev => prev.filter(t => t.id !== id));

        pendingDelete({
            itemName: 'ประเภทใบอนุญาต',
            onDelete: async () => {
                try {
                    const response = await fetch(`${API_ENDPOINTS.LICENSE_TYPES}?id=${id}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.message);
                    }
                    // Success
                    fetchTypes();
                } catch (error) {
                    showError(error.message);
                    // Restore on error
                    setTypes(prev => [...prev, itemToDelete]);
                    fetchTypes();
                }
            },
            onCancel: () => {
                // Restore on cancel
                setTypes(prev => [...prev, itemToDelete]);
                fetchTypes();
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(API_ENDPOINTS.LICENSE_TYPES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (data.success) {
                setShowModal(false);
                showSuccess(data.message);
                fetchTypes();
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError(error.message);
        }
    };

    const openModal = () => {
        setFormData(INITIAL_FORM_DATA);
        setShowModal(true);
    };

    const skeletonColumns = [
        { width: '25%' },
        { width: '35%' },
        { width: '15%' },
        { width: '15%' },
        { width: '10%', center: true }
    ];

    return (
        <>
            {/* Stats Cards */}
            <StatsSection stats={stats} />

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <i className="fas fa-tags"></i> ประเภทใบอนุญาต
                    </h3>
                    <button className="btn btn-primary btn-sm" onClick={openModal}>
                        <i className="fas fa-plus"></i> เพิ่มประเภท
                    </button>
                </div>

                <div className="card-body">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ชื่อประเภท</th>
                                    <th>คำอธิบาย</th>
                                    <th>อายุ (วัน)</th>
                                    <th>ใบอนุญาต</th>
                                    <th className="text-center" style={{ width: '80px' }}>ลบ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <TableSkeleton rows={5} columns={skeletonColumns} />
                                ) : types.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center">ไม่พบข้อมูล</td>
                                    </tr>
                                ) : (
                                    types.map(type => (
                                        <TypeRow
                                            key={type.id}
                                            type={type}
                                            onUpdate={handleInlineUpdate}
                                            onDelete={handleDelete}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="เพิ่มประเภทใหม่"
            >
                <TypeForm
                    formData={formData}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    onCancel={() => setShowModal(false)}
                />
            </Modal>
        </>
    );
}

/**
 * StatsSection Component
 */
function StatsSection({ stats }) {
    return (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
                <div className="stat-icon primary"><i className="fas fa-tags"></i></div>
                <div className="stat-content">
                    <div className="stat-value">{stats.totalTypes}</div>
                    <div className="stat-label">ประเภททั้งหมด</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon success"><i className="fas fa-check-circle"></i></div>
                <div className="stat-content">
                    <div className="stat-value">{stats.activeTypes}</div>
                    <div className="stat-label">ประเภทที่ใช้งาน</div>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon info"><i className="fas fa-file-alt"></i></div>
                <div className="stat-content">
                    <div className="stat-value">{stats.totalLicenses}</div>
                    <div className="stat-label">ใบอนุญาตที่ผูก</div>
                </div>
            </div>
        </div>
    );
}

/**
 * TypeRow Component
 */
function TypeRow({ type, onUpdate, onDelete }) {
    const canDelete = parseInt(type.license_count) === 0;

    return (
        <tr>
            <td>
                <EditableCell
                    value={type.name || type.type_name}
                    type="text"
                    onSave={(value) => onUpdate(type.id, 'name', value)}
                />
            </td>
            <td>
                <EditableCell
                    value={type.description || ''}
                    displayValue={type.description || '-'}
                    type="text"
                    placeholder="คำอธิบาย"
                    onSave={(value) => onUpdate(type.id, 'description', value)}
                />
            </td>
            <td>
                <EditableCell
                    value={type.validity_days}
                    displayValue={`${type.validity_days} วัน`}
                    type="number"
                    onSave={(value) => onUpdate(type.id, 'validity_days', parseInt(value))}
                />
            </td>
            <td>
                <span className="badge badge-active">{type.license_count}</span>
            </td>
            <td className="text-center">
                {canDelete && (
                    <button
                        className="btn btn-danger btn-icon"
                        onClick={() => onDelete(type.id)}
                    >
                        <i className="fas fa-trash"></i>
                    </button>
                )}
            </td>
        </tr>
    );
}

/**
 * TypeForm Component
 */
function TypeForm({ formData, onChange, onSubmit, onCancel }) {
    const handleChange = (e) => {
        onChange({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <form onSubmit={onSubmit}>
            <div className="form-group">
                <label>ชื่อประเภท *</label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                />
            </div>
            <div className="form-group">
                <label>คำอธิบาย</label>
                <textarea
                    name="description"
                    rows="2"
                    value={formData.description}
                    onChange={handleChange}
                />
            </div>
            <div className="form-group">
                <label>อายุใบอนุญาต (วัน)</label>
                <input
                    type="number"
                    name="validity_days"
                    value={formData.validity_days}
                    onChange={handleChange}
                    min="1"
                    required
                />
            </div>
            <div className="modal-footer" style={{
                marginTop: '1.5rem',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem'
            }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>
                    ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                    บันทึก
                </button>
            </div>
        </form>
    );
}
