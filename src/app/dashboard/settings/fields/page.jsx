'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Loading from '@/components/Loading';
import CustomSelect from '@/components/ui/CustomSelect';

const FIELD_TYPES = [
    { value: 'text', label: 'ข้อความ (Text)' },
    { value: 'number', label: 'ตัวเลข (Number)' },
    { value: 'date', label: 'วันที่ (Date)' },
    { value: 'select', label: 'ตัวเลือก (Dropdown)' },
    { value: 'boolean', label: 'ใช่/ไม่ใช่ (Checkbox)' },
    { value: 'image', label: 'รูปภาพ (Image)' }
];

function FieldsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const entityId = searchParams.get('entity');

    const [entity, setEntity] = useState(null);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);

    const [formData, setFormData] = useState({
        id: '',
        entity_id: entityId,
        field_name: '',
        field_label: '',
        field_type: 'text',
        field_options: '',
        is_required: false,
        is_unique: false,
        show_in_list: true,
        show_in_form: true,
        display_order: 0,
        default_value: ''
    });

    useEffect(() => {
        if (!entityId) {
            router.push('/dashboard/settings/entities');
            return;
        }
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/entities?id=${entityId}`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setEntity(data.entity);
                setFields(data.entity.fields || []);
            } else {
                Swal.fire('Error', data.message, 'error');
                router.push('/dashboard/settings/entities');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (field = null) => {
        if (field) {
            setIsEdit(true);
            setFormData({
                ...field,
                field_options: Array.isArray(field.field_options) ? field.field_options.join('\n') : ''
            });
        } else {
            setIsEdit(false);
            setFormData({
                id: '',
                entity_id: entityId,
                field_name: '',
                field_label: '',
                field_type: 'text',
                field_options: '',
                is_required: false,
                is_unique: false,
                show_in_list: true,
                show_in_form: true,
                display_order: fields.length + 1,
                default_value: ''
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

        const optionsArray = formData.field_options
            ? formData.field_options.split('\n').map(o => o.trim()).filter(o => o.length > 0)
            : [];

        const payload = {
            ...formData,
            field_options: optionsArray
        };

        try {
            const url = '/api/entity-fields';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
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
                loadData();
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
            text: 'การลบ Field จะทำให้ข้อมูลในคอลัมน์นี้หายไปทั้งหมด',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/entity-fields?id=${id}`, { method: 'DELETE', credentials: 'include' });
                const data = await res.json();
                if (data.success) {
                    loadData();
                    Swal.fire('ลบสำเร็จ!', '', 'success');
                }
            } catch (error) {
                Swal.fire('ผิดพลาด', error.message, 'error');
            }
        }
    };

    if (loading || !entity) return <Loading />;

    return (
        <div className="content-container">
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <button className="btn btn-secondary btn-sm mr-2" onClick={() => router.push('/dashboard/settings/entities')}>
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <i className={`fas ${entity.icon}`}></i> จัดการ Fields: {entity.label}
                    </h3>
                    <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                        <i className="fas fa-plus"></i> เพิ่ม Field
                    </button>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>#</th>
                                    <th>Field Name</th>
                                    <th>Label</th>
                                    <th>ประเภท</th>
                                    <th className="text-center">จำเป็น</th>
                                    <th className="text-center">ตาราง</th>
                                    <th className="text-center">ฟอร์ม</th>
                                    <th className="text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fields.map((field) => (
                                    <tr key={field.id}>
                                        <td>{field.display_order}</td>
                                        <td><code>{field.field_name}</code></td>
                                        <td>{field.field_label}</td>
                                        <td><span className="badge badge-info">{field.field_type}</span></td>
                                        <td className="text-center">
                                            {field.is_required ? <i className="fas fa-check text-success"></i> : <i className="fas fa-minus text-muted"></i>}
                                        </td>
                                        <td className="text-center">
                                            {field.show_in_list ? <i className="fas fa-check text-success"></i> : <i className="fas fa-minus text-muted"></i>}
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
                                ))}
                                {fields.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="text-center py-4">ยังไม่มี Field ใน Entity นี้</td>
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
                        <h3 className="modal-title">{isEdit ? 'แก้ไข Field' : 'เพิ่ม Field ใหม่'}</h3>
                        <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label htmlFor="field_name">Field Name (ภาษาอังกฤษ) *</label>
                                <input
                                    id="field_name"
                                    type="text"
                                    name="field_name"
                                    value={formData.field_name}
                                    onChange={handleChange}
                                    placeholder="เช่น price, sku"
                                    disabled={isEdit}
                                    required
                                    pattern="[a-z0-9_]+"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="field_label">Label (ชื่อแสดงผล) *</label>
                                <input
                                    id="field_label"
                                    type="text"
                                    name="field_label"
                                    value={formData.field_label}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="field_type">ประเภท *</label>
                                <CustomSelect
                                    id="field_type"
                                    name="field_type"
                                    value={formData.field_type}
                                    onChange={handleChange}
                                    options={FIELD_TYPES}
                                />
                            </div>

                            {formData.field_type === 'select' && (
                                <div className="form-group">
                                    <label htmlFor="field_options">ตัวเลือก (บรรทัดละ 1 ตัวเลือก)</label>
                                    <textarea
                                        id="field_options"
                                        name="field_options"
                                        value={formData.field_options}
                                        onChange={handleChange}
                                        rows="3"
                                        placeholder="ตัวเลือก 1&#10;ตัวเลือก 2"
                                    ></textarea>
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="default_value">ค่าเริ่มต้น</label>
                                <input
                                    id="default_value"
                                    type="text"
                                    name="default_value"
                                    value={formData.default_value}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="display_order">ลำดับ</label>
                                <input
                                    id="display_order"
                                    type="number"
                                    name="display_order"
                                    value={formData.display_order}
                                    onChange={handleChange}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                                <div className="form-check">
                                    <input type="checkbox" name="is_required" checked={formData.is_required} onChange={handleChange} id="req" />
                                    <label htmlFor="req">จำเป็นต้องกรอก</label>
                                </div>
                                <div className="form-check">
                                    <input type="checkbox" name="show_in_list" checked={formData.show_in_list} onChange={handleChange} id="lst" />
                                    <label htmlFor="lst">แสดงในตาราง</label>
                                </div>
                                <div className="form-check">
                                    <input type="checkbox" name="show_in_form" checked={formData.show_in_form} onChange={handleChange} id="frm" />
                                    <label htmlFor="frm">แสดงในฟอร์ม</label>
                                </div>
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

export default function FieldsPage() {
    return (
        <Suspense fallback={<Loading />}>
            <FieldsContent />
        </Suspense>
    );
}
