'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Loading from '@/components/Loading';
import CustomSelect from '@/components/ui/CustomSelect';
import DatePicker from '@/components/ui/DatePicker';

export default function DynamicDataPage({ params }) {
    // Unwrap params using React.use()
    const resolvedParams = use(params);
    const entitySlug = resolvedParams.entity;

    const router = useRouter();

    const [entity, setEntity] = useState(null);
    const [fields, setFields] = useState([]);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal & Form
    const [showModal, setShowModal] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        loadEntityAndData();
    }, [entitySlug]);

    const loadEntityAndData = async () => {
        setLoading(true);
        try {
            // 1. Get Entity Definition
            const entRes = await fetch(`/api/entities?slug=${entitySlug}`); // Wait, my API uses ID or List. Let me check api/entities/route.js
            // My GET /api/entities doesn't support slug search yet directly, but I can fetch all and find? No, that's inefficient.
            // Let's assume I fix the API or I use a workaround. 
            // Wait, I fetch all active entities usually for sidebar.
            // Let's try to fetch list and find matching slug first.

            const listRes = await fetch('/api/entities');
            const listData = await listRes.json();
            const matchedEntity = listData.entities?.find(e => e.slug === entitySlug);

            if (!matchedEntity) {
                Swal.fire('Error', 'Entity not found', 'error');
                router.push('/dashboard');
                return;
            }

            // 2. Get Entity Details (Fields)
            const detailRes = await fetch(`/api/entities?id=${matchedEntity.id}`);
            const detailData = await detailRes.json();

            if (detailData.success && detailData.entity) {
                setEntity(detailData.entity);
                setFields(detailData.entity.fields || []);

                // 3. Get Records
                const dataRes = await fetch(`/api/entity-records?entity=${entitySlug}`);
                const dataData = await dataRes.json();
                if (dataData.success) {
                    setRecords(dataData.data || []);
                }
            }

        } catch (error) {
            console.error(error);
            Swal.fire('Error', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (record = null) => {
        const initialData = {};
        fields.forEach(f => {
            initialData[f.field_name] = f.default_value || '';
        });

        if (record) {
            setIsEdit(true);
            setFormData({ ...record }); // Record has flat structure due to API map
        } else {
            setIsEdit(false);
            setFormData(initialData);
        }
        setShowModal(true);
    };

    const handleChange = (e) => {
        // Handle native inputs
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCustomChange = (name, value) => {
        // Handle CustomSelect / DatePicker
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = '/api/entity-records';
            const method = isEdit ? 'PUT' : 'POST';
            const payload = {
                entitySlug,
                id: isEdit ? formData.id : undefined,
                data: formData
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.success) {
                Swal.fire({
                    title: 'สำเร็จ!',
                    text: 'บันทึกข้อมูลเรียบร้อย',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                setShowModal(false);
                loadEntityAndData(); // Reload all (simple way)
            } else {
                Swal.fire('ผิดพลาด', result.message, 'error');
            }
        } catch (error) {
            Swal.fire('ผิดพลาด', error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/entity-records?id=${id}`, { method: 'DELETE' });
                const result = await res.json();
                if (result.success) {
                    loadEntityAndData();
                    Swal.fire('ลบสำเร็จ!', '', 'success');
                }
            } catch (error) {
                Swal.fire('ผิดพลาด', error.message, 'error');
            }
        }
    };

    // Helper to render input based on type
    const renderInput = (field) => {
        const val = formData[field.field_name] !== undefined ? formData[field.field_name] : '';

        if (field.field_type === 'select') {
            // Parse options
            let options = [];
            try {
                options = typeof field.field_options === 'string'
                    ? JSON.parse(field.field_options)
                    : field.field_options;
            } catch (e) { options = []; }

            // If options are simple strings, convert to obj
            const formattedOptions = options.map(opt =>
                typeof opt === 'string' ? { value: opt, label: opt } : opt
            );

            return (
                <CustomSelect
                    name={field.field_name}
                    value={val}
                    onChange={(e) => handleCustomChange(field.field_name, e.target.value)}
                    options={[{ value: '', label: '-- เลือก --' }, ...formattedOptions]}
                />
            );
        }

        if (field.field_type === 'date') {
            return (
                <DatePicker
                    name={field.field_name}
                    value={val}
                    onChange={(e) => handleCustomChange(field.field_name, e.target.value)}
                    placeholder={field.field_label}
                />
            );
        }

        if (field.field_type === 'boolean') {
            return (
                <div className="form-check">
                    <input
                        type="checkbox"
                        name={field.field_name}
                        checked={!!val}
                        onChange={handleChange}
                        id={`field_${field.id}`}
                    />
                    <label htmlFor={`field_${field.id}`}>{field.field_label}</label>
                </div>
            );
        }

        if (field.field_type === 'number') {
            return (
                <input
                    type="number"
                    className="form-control"
                    name={field.field_name}
                    value={val}
                    onChange={handleChange}
                    required={field.is_required}
                />
            );
        }

        // Text, Image, etc.
        return (
            <input
                type="text"
                className="form-control"
                name={field.field_name}
                value={val}
                onChange={handleChange}
                required={field.is_required}
            />
        );
    };

    if (loading || !entity) return <Loading />;

    const visibleFields = fields.filter(f => f.show_in_list);

    return (
        <div className="content-container">
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <i className={`fas ${entity.icon}`}></i> {entity.label}
                    </h3>
                    <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                        <i className="fas fa-plus"></i> เพิ่มข้อมูล
                    </button>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>#</th>
                                    {visibleFields.map(f => (
                                        <th key={f.id}>{f.field_label}</th>
                                    ))}
                                    <th className="text-center" style={{ width: '100px' }}>จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((rec, idx) => (
                                    <tr key={rec.id}>
                                        <td>{idx + 1}</td>
                                        {visibleFields.map(f => (
                                            <td key={f.id}>
                                                {f.field_type === 'boolean'
                                                    ? (rec[f.field_name] ? <i className="fas fa-check text-success"></i> : '-')
                                                    : rec[f.field_name]
                                                }
                                            </td>
                                        ))}
                                        <td className="text-center">
                                            <div className="action-buttons">
                                                <button className="btn btn-secondary btn-icon" onClick={() => openModal(rec)}>
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button className="btn btn-danger btn-icon" onClick={() => handleDelete(rec.id)}>
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {records.length === 0 && (
                                    <tr>
                                        <td colSpan={visibleFields.length + 2} className="text-center py-4">
                                            ไม่พบข้อมูล
                                        </td>
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
                        <h3 className="modal-title">{isEdit ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</h3>
                        <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {fields.filter(f => f.show_in_form).map(field => (
                                <div className="form-group" key={field.id} style={{ marginBottom: '1rem' }}>
                                    {field.field_type !== 'boolean' && (
                                        <label>{field.field_label} {field.is_required && '*'}</label>
                                    )}
                                    {renderInput(field)}
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>ยกเลิก</button>
                            <button type="submit" className="btn btn-primary">{isEdit ? 'บันทึก' : 'เพิ่มข้อมูล'}</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
