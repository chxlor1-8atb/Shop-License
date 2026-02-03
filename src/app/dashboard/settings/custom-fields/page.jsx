'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import CustomSelect from '@/components/ui/CustomSelect';
import Loading from '@/components/Loading';

const ENTITY_TYPES = [
    { value: 'licenses', label: 'ใบอนุญาต' },
    { value: 'shops', label: 'ร้านค้า' },
    { value: 'users', label: 'ผู้ใช้งาน' },
    { value: 'license_types', label: 'ประเภทใบอนุญาต' }
];

const FIELD_TYPES = [
    { value: 'text', label: 'ข้อความ (Text)' },
    { value: 'number', label: 'ตัวเลข (Number)' },
    { value: 'date', label: 'วันที่ (Date)' },
    { value: 'select', label: 'Dropdown (Select)' },
    { value: 'boolean', label: 'ใช่/ไม่ใช่ (Checkbox)' },
    { value: 'textarea', label: 'ข้อความยาว (Textarea)' }
];

export default function CustomFieldsSettingsPage() {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEntity, setSelectedEntity] = useState('licenses');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState({
        id: '',
        entity_type: 'licenses',
        field_name: '',
        field_label: '',
        field_type: 'text',
        field_options: '',
        is_required: false,
        show_in_table: true,
        show_in_form: true,
        display_order: 0
    });

    useEffect(() => {
        loadFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEntity]);

    const loadFields = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/custom-fields?entity_type=${selectedEntity}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setFields(data.fields || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear error for this field when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // ตรวจสอบชื่อ Field ซ้ำ (เฉพาะเมื่อเพิ่มใหม่)
        if (!isEdit) {
            const isDuplicate = fields.some(
                f => f.field_name.toLowerCase() === formData.field_name.toLowerCase()
            );
            if (isDuplicate) {
                newErrors.field_name = 'ชื่อ Field นี้มีอยู่แล้ว';
            }
        }

        // ตรวจสอบ field_name format
        if (formData.field_name && !/^[a-z0-9_]+$/.test(formData.field_name)) {
            newErrors.field_name = 'ชื่อ Field ต้องเป็นตัวอักษรภาษาอังกฤษพิมพ์เล็ก ตัวเลข และ _ เท่านั้น';
        }

        // ตรวจสอบ options สำหรับ select type
        if (formData.field_type === 'select') {
            const optionsArray = formData.field_options
                .split('\n')
                .map(o => o.trim())
                .filter(o => o.length > 0);
            
            if (optionsArray.length === 0) {
                newErrors.field_options = 'กรุณาระบุตัวเลือกอย่างน้อย 1 รายการ';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const openModal = (field = null) => {
        setErrors({}); // Reset errors
        if (field) {
            setIsEdit(true);
            setFormData({
                id: field.id,
                entity_type: field.entity_type,
                field_name: field.field_name,
                field_label: field.field_label,
                field_type: field.field_type,
                field_options: Array.isArray(field.field_options) ? field.field_options.join('\n') : '',
                is_required: field.is_required,
                show_in_table: field.show_in_table,
                show_in_form: field.show_in_form,
                display_order: field.display_order
            });
        } else {
            setIsEdit(false);
            setFormData({
                id: '',
                entity_type: selectedEntity,
                field_name: '',
                field_label: '',
                field_type: 'text',
                field_options: '',
                is_required: false,
                show_in_table: true,
                show_in_form: true,
                display_order: fields.length
            });
        }
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        // Prepare options array from newline-separated text
        const optionsArray = formData.field_options
            .split('\n')
            .map(o => o.trim())
            .filter(o => o.length > 0);

        const payload = {
            ...formData,
            field_options: optionsArray
        };

        try {
            const url = '/api/custom-fields';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                // Handle HTTP errors
                if (res.status === 409) {
                    throw new Error('ชื่อ Field นี้มีอยู่แล้ว');
                } else if (res.status === 500) {
                    throw new Error('เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง');
                } else if (res.status === 400) {
                    throw new Error(data.message || 'ข้อมูลไม่ถูกต้อง');
                }
            }

            if (data.success) {
                Swal.fire({
                    title: 'สำเร็จ!',
                    text: data.message,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setShowModal(false);
                loadFields();
            } else {
                Swal.fire('ผิดพลาด', data.message, 'error');
            }
        } catch (error) {
            console.error('Submit error:', error);
            Swal.fire({
                title: 'ผิดพลาด',
                text: error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
                icon: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: 'การลบ Field นี้จะลบข้อมูลที่เก็บไว้ทั้งหมดด้วย',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/custom-fields?id=${id}`, { method: 'DELETE', credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    Swal.fire({
                        title: 'ลบสำเร็จ!',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    loadFields();
                }
            } catch (error) {
                Swal.fire('ผิดพลาด', error.message, 'error');
            }
        }
    };

    const getFieldTypeLabel = (type) => {
        const found = FIELD_TYPES.find(t => t.value === type);
        return found ? found.label : type;
    };

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <i className="fas fa-sliders-h"></i> จัดการ Custom Fields
                    </h3>
                    <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                        <i className="fas fa-plus"></i> เพิ่ม Field ใหม่
                    </button>
                </div>
                <div className="card-body">
                    {/* Entity Type Selector */}
                    <div className="filter-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                        <label style={{ fontWeight: 600 }}>เลือกประเภทข้อมูล:</label>
                        <CustomSelect
                            value={selectedEntity}
                            onChange={(e) => setSelectedEntity(e.target.value)}
                            options={ENTITY_TYPES}
                            style={{ minWidth: '200px' }}
                        />
                    </div>

                    {/* Fields Table */}
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>ลำดับ</th>
                                    <th>ชื่อ Field</th>
                                    <th>Label</th>
                                    <th>ประเภท</th>
                                    <th className="text-center">จำเป็น</th>
                                    <th className="text-center">ตาราง</th>
                                    <th className="text-center">ฟอร์ม</th>
                                    <th className="text-center" style={{ width: '120px' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={`skeleton-${i}`}>
                                            <td><div className="skeleton-cell skeleton-animate" style={{ height: '1rem', width: '2rem' }}></div></td>
                                            <td><div className="skeleton-cell skeleton-animate" style={{ height: '1rem', width: '70%' }}></div></td>
                                            <td><div className="skeleton-cell skeleton-animate" style={{ height: '1rem', width: '80%' }}></div></td>
                                            <td><div className="skeleton-cell skeleton-animate" style={{ height: '1rem', width: '60%' }}></div></td>
                                            <td className="text-center"><div className="skeleton-cell skeleton-animate" style={{ height: '1rem', width: '2rem', margin: '0 auto' }}></div></td>
                                            <td className="text-center"><div className="skeleton-cell skeleton-animate" style={{ height: '1rem', width: '2rem', margin: '0 auto' }}></div></td>
                                            <td className="text-center"><div className="skeleton-cell skeleton-animate" style={{ height: '1rem', width: '2rem', margin: '0 auto' }}></div></td>
                                            <td className="text-center"><div className="skeleton-cell skeleton-animate" style={{ height: '2rem', width: '4rem', margin: '0 auto' }}></div></td>
                                        </tr>
                                    ))
                                ) : fields.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="text-center" style={{ padding: '2rem' }}>
                                            <i className="fas fa-inbox" style={{ fontSize: '2rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}></i>
                                            ยังไม่มี Custom Fields สำหรับ {ENTITY_TYPES.find(e => e.value === selectedEntity)?.label}
                                        </td>
                                    </tr>
                                ) : (
                                    fields.map((field, index) => (
                                        <tr key={field.id}>
                                            <td className="text-center">{index + 1}</td>
                                            <td><code>{field.field_name}</code></td>
                                            <td>{field.field_label}</td>
                                            <td>
                                                <span className="badge badge-info">{getFieldTypeLabel(field.field_type)}</span>
                                            </td>
                                            <td className="text-center">
                                                {field.is_required ? <i className="fas fa-check text-success"></i> : <i className="fas fa-minus text-muted"></i>}
                                            </td>
                                            <td className="text-center">
                                                {field.show_in_table ? <i className="fas fa-check text-success"></i> : <i className="fas fa-minus text-muted"></i>}
                                            </td>
                                            <td className="text-center">
                                                {field.show_in_form ? <i className="fas fa-check text-success"></i> : <i className="fas fa-minus text-muted"></i>}
                                            </td>
                                            <td className="text-center">
                                                <div className="action-buttons">
                                                    <button className="btn btn-secondary btn-icon" onClick={() => openModal(field)}>
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button className="btn btn-danger btn-icon" onClick={() => handleDelete(field.id)}>
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
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
                        <h3 className="modal-title">{isEdit ? 'แก้ไข Custom Field' : 'เพิ่ม Custom Field ใหม่'}</h3>
                        <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>ชื่อ Field (ภาษาอังกฤษ, ไม่มีเว้นวรรค) *</label>
                                <input
                                    type="text"
                                    name="field_name"
                                    value={formData.field_name}
                                    onChange={handleChange}
                                    placeholder="เช่น tax_id, branch_code"
                                    pattern="[a-z0-9_]+"
                                    required
                                    disabled={isEdit}
                                />
                            </div>
                            <div className="form-group">
                                <label>Label (ชื่อที่แสดง) *</label>
                                <input
                                    type="text"
                                    name="field_label"
                                    value={formData.field_label}
                                    onChange={handleChange}
                                    placeholder="เช่น เลขประจำตัวภาษี"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>ประเภท Field *</label>
                                <CustomSelect
                                    name="field_type"
                                    value={formData.field_type}
                                    onChange={handleChange}
                                    options={FIELD_TYPES}
                                />
                            </div>

                            {formData.field_type === 'select' && (
                                <div className="form-group">
                                    <label>ตัวเลือก (แยกบรรทัด)</label>
                                    <textarea
                                        name="field_options"
                                        value={formData.field_options}
                                        onChange={handleChange}
                                        placeholder="ตัวเลือก 1&#10;ตัวเลือก 2&#10;ตัวเลือก 3"
                                        rows={4}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>ลำดับการแสดง</label>
                                <input
                                    type="number"
                                    name="display_order"
                                    value={formData.display_order}
                                    onChange={handleChange}
                                    min={0}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="is_required"
                                        checked={formData.is_required}
                                        onChange={handleChange}
                                    />
                                    <span>จำเป็นต้องกรอก</span>
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="show_in_table"
                                        checked={formData.show_in_table}
                                        onChange={handleChange}
                                    />
                                    <span>แสดงในตาราง</span>
                                </label>
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="show_in_form"
                                        checked={formData.show_in_form}
                                        onChange={handleChange}
                                    />
                                    <span>แสดงในฟอร์ม</span>
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                            <button type="submit" className="btn btn-primary">{isEdit ? 'บันทึก' : 'สร้าง Field'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
