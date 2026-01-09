'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePagination } from '@/hooks';
import { API_ENDPOINTS, ROLE_OPTIONS } from '@/constants';
import { formatThaiDateTime } from '@/utils/formatters';
import { showSuccess, showError, pendingDelete } from '@/utils/alerts';

// UI Components
import CustomSelect from '@/components/ui/CustomSelect';
import Pagination from '@/components/ui/Pagination';
import EditableCell from '@/components/ui/EditableCell';
import Modal from '@/components/ui/Modal';
import TableSkeleton from '@/components/ui/TableSkeleton';

// Constants
const INITIAL_FORM_DATA = {
    id: '',
    username: '',
    full_name: '',
    password: '',
    role: 'user'
};

const ROLE_BADGE_STYLES = {
    admin: {
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        color: '#7c3aed',
        border: '1px solid rgba(124, 58, 237, 0.2)'
    },
    user: {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        color: '#3b82f6',
        border: '1px solid rgba(59, 130, 246, 0.2)'
    }
};

/**
 * UsersPage Component
 */
export default function UsersPage() {
    const pagination = usePagination(20);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    useEffect(() => {
        fetchUsers();
    }, [pagination.page, pagination.limit]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit
            });

            const response = await fetch(`${API_ENDPOINTS.USERS}?${params}`);
            const data = await response.json();

            if (data.success) {
                setUsers(data.users || []);
                pagination.updateFromResponse(data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit]);

    const handleInlineUpdate = async (userId, field, value) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        const updateData = {
            id: userId,
            username: user.username,
            full_name: user.full_name || '',
            role: user.role,
            [field]: value
        };

        try {
            const response = await fetch(API_ENDPOINTS.USERS, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();

            if (data.success) {
                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, [field]: value } : u
                ));
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            showError(error.message);
            throw error;
        }
    };

    const handleDelete = async (id) => {
        // Find the user to delete
        const userToDelete = users.find(u => u.id === id);
        if (!userToDelete) return;

        // Remove from UI immediately (optimistic)
        setUsers(prev => prev.filter(u => u.id !== id));

        // Show pending delete toast
        pendingDelete({
            itemName: `ผู้ใช้ "${userToDelete.full_name || userToDelete.username}"`,
            duration: 5000,
            onDelete: async () => {
                // Timer ended - actually delete from database
                try {
                    const response = await fetch(`${API_ENDPOINTS.USERS}?id=${id}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();

                    if (data.success) {
                        showSuccess('ลบผู้ใช้งานสำเร็จ');
                    } else {
                        // Failed - restore user
                        setUsers(prev => [...prev, userToDelete]);
                        showError(data.message);
                    }
                } catch (error) {
                    // Error - restore user
                    setUsers(prev => [...prev, userToDelete]);
                    showError(error.message);
                }
            },
            onCancel: () => {
                // User cancelled - restore user to list
                setUsers(prev => {
                    // Check if not already in list
                    if (prev.find(u => u.id === id)) return prev;
                    return [...prev, userToDelete].sort((a, b) => a.id - b.id);
                });
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(API_ENDPOINTS.USERS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (data.success) {
                setShowModal(false);
                showSuccess(data.message);
                fetchUsers();
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
        { width: '20%' },
        { width: '25%' },
        { width: '15%', rounded: true },
        { width: '20%' },
        { width: '10%', center: true }
    ];

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <i className="fas fa-users"></i> รายการผู้ใช้งาน
                    </h3>
                    <button className="btn btn-primary btn-sm" onClick={openModal}>
                        <i className="fas fa-plus"></i> เพิ่มผู้ใช้
                    </button>
                </div>

                <div className="card-body">
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ชื่อผู้ใช้</th>
                                    <th>ชื่อ-นามสกุล</th>
                                    <th>บทบาท</th>
                                    <th>วันที่สร้าง</th>
                                    <th className="text-center" style={{ width: '80px' }}>ลบ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <TableSkeleton rows={5} columns={skeletonColumns} />
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center">ไม่พบข้อมูล</td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <UserRow
                                            key={user.id}
                                            user={user}
                                            onUpdate={handleInlineUpdate}
                                            onDelete={handleDelete}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.limit}
                        onPageChange={pagination.setPage}
                        onItemsPerPageChange={pagination.setLimit}
                        showItemsPerPage
                        showPageJump
                        showTotalInfo
                    />
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="เพิ่มผู้ใช้ใหม่"
            >
                <UserForm
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
 * RoleBadge Component
 */
function RoleBadge({ role }) {
    const styles = ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.user;
    const label = role === 'admin' ? 'ผู้ดูแลระบบ' : 'เจ้าหน้าที่';

    return (
        <span className="badge" style={{
            ...styles,
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 600
        }}>
            {label}
        </span>
    );
}

/**
 * UserRow Component
 */
function UserRow({ user, onUpdate, onDelete }) {
    return (
        <tr>
            <td>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                    {user.username}
                </span>
            </td>
            <td>
                <EditableCell
                    value={user.full_name || ''}
                    displayValue={user.full_name || '-'}
                    type="text"
                    onSave={(value) => onUpdate(user.id, 'full_name', value)}
                />
            </td>
            <td>
                <EditableCell
                    value={user.role}
                    displayValue={<RoleBadge role={user.role} />}
                    type="select"
                    options={ROLE_OPTIONS}
                    onSave={(value) => onUpdate(user.id, 'role', value)}
                />
            </td>
            <td>{formatThaiDateTime(user.created_at)}</td>
            <td className="text-center">
                <button
                    className="btn btn-danger btn-icon"
                    onClick={() => onDelete(user.id)}
                >
                    <i className="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    );
}

/**
 * UserForm Component
 */
function UserForm({ formData, onChange, onSubmit, onCancel }) {
    const handleChange = (e) => {
        onChange({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <form onSubmit={onSubmit}>
            <div className="form-group">
                <label>ชื่อผู้ใช้ *</label>
                <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                />
            </div>
            <div className="form-group">
                <label>ชื่อ-นามสกุล *</label>
                <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                />
            </div>
            <div className="form-group">
                <label>รหัสผ่าน *</label>
                <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                />
            </div>
            <div className="form-group">
                <label>บทบาท *</label>
                <CustomSelect
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    options={ROLE_OPTIONS}
                    placeholder="เลือกบทบาท"
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
