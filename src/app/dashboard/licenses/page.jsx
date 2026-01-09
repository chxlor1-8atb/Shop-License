'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePagination, useDropdownData } from '@/hooks';
import { useSchema } from '@/hooks';
import { STATUS_OPTIONS, STATUS_FILTER_OPTIONS, API_ENDPOINTS } from '@/constants';
import { formatThaiDate, toInputDateFormat, getTodayDateString } from '@/utils/formatters';
import { showSuccess, showError, pendingDelete } from '@/utils/alerts';

// UI Components
import CustomSelect from '@/components/ui/CustomSelect';
import DatePicker from '@/components/ui/DatePicker';
import Pagination from '@/components/ui/Pagination';
import EditableCell from '@/components/ui/EditableCell';
import StatusBadge from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import FilterRow, { SearchInput } from '@/components/ui/FilterRow';
import TableSkeleton from '@/components/ui/TableSkeleton';

// Initial form state - extracted constant
const INITIAL_FORM_DATA = {
    id: '',
    shop_id: '',
    license_type_id: '',
    license_number: '',
    issue_date: '',
    expiry_date: '',
    status: 'active',
    notes: ''
};

const STANDARD_FIELDS = [
    { key: 'shop_id', label: 'ร้านค้า', required: true },
    { key: 'license_type_id', label: 'ประเภทใบอนุญาต', required: true },
    { key: 'license_number', label: 'เลขที่ใบอนุญาต', required: true, formOnly: true },
    { key: 'issue_date', label: 'วันที่ออก' },
    { key: 'expiry_date', label: 'วันหมดอายุ' },
    { key: 'status', label: 'สถานะ', required: true },
    { key: 'notes', label: 'หมายเหตุ', formOnly: true }
];

/**
 * LicensesPage Component
 * Manages license listing with CRUD operations
 */
export default function LicensesPage() {
    // State management using custom hooks
    const pagination = usePagination(20);
    const { shopOptions, typeOptions, loading: dropdownsLoading } = useDropdownData();

    // Local state
    const [licenses, setLicenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    // Dynamic Schema Hook
    const { columns, loading: schemaLoading, addColumn, removeColumn } = useSchema('licenses');
    // const [schemaColumns, setSchemaColumns] = useState([]); // Removed
    const [showSchemaModal, setShowSchemaModal] = useState(false);
    const [newColumnData, setNewColumnData] = useState({ column_key: '', column_label: '', column_type: 'text' });
    
    // Hidden Fields State
    const [hiddenFields, setHiddenFields] = useState([]);

    // Load hidden fields
    useEffect(() => {
        const savedHidden = localStorage.getItem('licenses_hidden_fields');
        if (savedHidden) {
            try {
                setHiddenFields(JSON.parse(savedHidden));
            } catch (e) {
                console.error('Failed to load hidden fields:', e);
            }
        }
    }, []);

    const toggleFieldVisibility = (key) => {
        let newHidden;
        if (hiddenFields.includes(key)) {
            newHidden = hiddenFields.filter(k => k !== key);
        } else {
            newHidden = [...hiddenFields, key];
        }
        setHiddenFields(newHidden);
        localStorage.setItem('licenses_hidden_fields', JSON.stringify(newHidden));
    };

    const isFieldVisible = (key) => !hiddenFields.includes(key);

    // Fetch licenses when dependencies change
    // Fetch licenses and schema when dependencies change
    // Fetch licenses when dependencies change
    useEffect(() => {
        fetchLicenses();
    }, [pagination.page, pagination.limit, search, filterType, filterStatus]);

    // fetchSchema, handleAddColumn, handleDeleteColumn are removed (replaced by hook)

    /**
     * Fetches licenses from API
     */
    const fetchLicenses = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                search,
                license_type: filterType,
                status: filterStatus
            });

            const response = await fetch(`${API_ENDPOINTS.LICENSES}?${params}`);
            const data = await response.json();

            if (data.success) {
                setLicenses(data.licenses);
                pagination.updateFromResponse(data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch licenses:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search, filterType, filterStatus]);

    /**
     * Handles inline field updates
     */
    const handleInlineUpdate = async (licenseId, field, value) => {
        const license = licenses.find(l => l.id === licenseId);
        if (!license) return;

        const updateData = {
            id: licenseId,
            shop_id: license.shop_id,
            license_type_id: license.license_type_id,
            license_number: license.license_number,
            issue_date: toInputDateFormat(license.issue_date),
            expiry_date: toInputDateFormat(license.expiry_date),
            status: license.status,
            notes: license.notes || '',
            status: license.status,
            notes: license.notes || '',
            custom_fields: license.custom_fields || {},
            [field]: value
        };

        // Handle custom fields update
        if (field.startsWith('custom_')) {
            const key = field.replace('custom_', '');
            updateData.custom_fields = {
                ...updateData.custom_fields,
                [key]: value
            };
            // Remove the flattened key
            delete updateData[field]; 
        }

        try {
            const response = await fetch(API_ENDPOINTS.LICENSES, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();

            if (data.success) {
                fetchLicenses(); // Reload to get updated display names
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            showError(error.message);
            throw error;
        }
    };

    /**
     * Handles license deletion
     */
    /**
     * Handles license deletion
     */
    const handleDelete = (id) => {
        const itemToDelete = licenses.find(l => l.id === id);
        if (!itemToDelete) return;

        // Optimistic update
        setLicenses(prev => prev.filter(l => l.id !== id));

        pendingDelete({
            itemName: 'ใบอนุญาต',
            onDelete: async () => {
                try {
                    const response = await fetch(`${API_ENDPOINTS.LICENSES}?id=${id}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.message);
                    }
                    // Success - optionally refresh
                    fetchLicenses();
                } catch (error) {
                    showError(error.message);
                    // Restore on error
                    setLicenses(prev => [...prev, itemToDelete]);
                    fetchLicenses();
                }
            },
            onCancel: () => {
                // Restore on cancel
                setLicenses(prev => [...prev, itemToDelete]);
                fetchLicenses();
            }
        });
    };

    /**
     * Opens modal for adding new license
     */
    const openModal = () => {
        setFormData({
            ...INITIAL_FORM_DATA,
            issue_date: getTodayDateString()
        });
        setShowModal(true);
    };

    /**
     * Handles form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(API_ENDPOINTS.LICENSES, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (data.success) {
                setShowModal(false);
                showSuccess(data.message);
                fetchLicenses();
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError(error.message);
        }
    };

    /**
     * Handles filter changes with page reset
     */
    const handleFilterChange = (setter) => (value) => {
        setter(value);
        pagination.resetPage();
    };

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <i className="fas fa-file-alt"></i> รายการใบอนุญาต
                    </h3>
                    <div className="flex gap-2">
                        <button className="btn btn-primary btn-sm" onClick={openModal}>
                            <i className="fas fa-plus"></i> เพิ่มใบอนุญาต
                        </button>
                        <button className="btn btn-secondary btn-sm ml-2" onClick={() => setShowSchemaModal(true)} style={{ marginLeft: '8px' }}>
                             จัดการคอลัมน์
                        </button>
                    </div>
                </div>

                <div className="card-body">
                    {/* Filters */}
                    <FilterRow>
                        <SearchInput
                            value={search}
                            onChange={handleFilterChange(setSearch)}
                        />
                        <CustomSelect
                            value={filterType}
                            onChange={(e) => handleFilterChange(setFilterType)(e.target.value)}
                            options={[
                                { value: '', label: 'ทุกประเภท' },
                                ...typeOptions
                            ]}
                            placeholder="ประเภทใบอนุญาต"
                            style={{ minWidth: '200px', width: 'auto' }}
                        />
                        <CustomSelect
                            value={filterStatus}
                            onChange={(e) => handleFilterChange(setFilterStatus)(e.target.value)}
                            options={STATUS_FILTER_OPTIONS}
                            placeholder="สถานะ"
                            style={{ minWidth: '180px', width: 'auto' }}
                        />
                    </FilterRow>

                    {/* Table */}
                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {isFieldVisible('shop_id') && <th>ร้านค้า</th>}
                                    {isFieldVisible('license_type_id') && <th>ประเภท</th>}
                                    {isFieldVisible('issue_date') && <th className="text-center">วันออก</th>}
                                    {isFieldVisible('expiry_date') && <th className="text-center">หมดอายุ</th>}
                                    {isFieldVisible('status') && <th className="text-center">สถานะ</th>}
                                    {columns.map(col => (
                                        <th key={col.id} className="text-center">
                                            {col.column_label}
                                        </th>
                                    ))}
                                    <th className="text-center" style={{ width: '80px' }}>ลบ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <TableSkeleton rows={5} />
                                ) : licenses.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center">ไม่พบข้อมูล</td>
                                    </tr>
                                ) : (
                                    licenses.map(license => (
                                        <LicenseRow
                                            key={license.id}
                                            license={license}
                                            shopOptions={shopOptions}
                                            typeOptions={typeOptions}
                                            schemaColumns={columns}
                                            hiddenFields={hiddenFields}
                                            onUpdate={handleInlineUpdate}
                                            onDelete={handleDelete}
                                        />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
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

            {/* Add License Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="เพิ่มใบอนุญาตใหม่"
            >
                <LicenseForm
                    formData={formData}
                    schemaColumns={columns}
                    hiddenFields={hiddenFields}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    onCancel={() => setShowModal(false)}
                    shopOptions={shopOptions}
                    typeOptions={typeOptions}
                />
            </Modal>

            <Modal
                isOpen={showSchemaModal}
                onClose={() => setShowSchemaModal(false)}
                title="จัดการคอลัมน์เพิ่มเติม"
            >
                 <div className="mb-4">
                    <h5 className="mb-3">เพิ่มคอลัมน์ใหม่</h5>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        addColumn(newColumnData).then(success => {
                            if(success) {
                                setShowSchemaModal(false);
                                setNewColumnData({ column_key: '', column_label: '', column_type: 'text' });
                            }
                        });
                    }}>
                        <div className="form-group">
                            <label>ชื่อฟิลด์ (ภาษาอังกฤษ, ห้ามมีช่องว่าง) *</label>
                            <input 
                                type="text" 
                                className="form-control"
                                value={newColumnData.column_key}
                                onChange={e => setNewColumnData({...newColumnData, column_key: e.target.value.replace(/\s+/g, '_').toLowerCase()})}
                                required
                                placeholder="line_id"
                            />
                        </div>
                        <div className="form-group">
                            <label>ชื่อแสดงผล (ภาษาไทยได้) *</label>
                            <input 
                                type="text" 
                                className="form-control"
                                value={newColumnData.column_label}
                                onChange={e => setNewColumnData({...newColumnData, column_label: e.target.value})}
                                required
                                placeholder="LINE ID"
                            />
                        </div>
                         <div className="form-group">
                            <label>ประเภทข้อมูล *</label>
                            <select 
                                className="form-control"
                                value={newColumnData.column_type || 'text'}
                                onChange={e => setNewColumnData({...newColumnData, column_type: e.target.value})}
                            >
                                <option value="text">ข้อความ (Text)</option>
                                <option value="number">ตัวเลข (Number)</option>
                                <option value="date">วันที่ (Date)</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-primary btn-block mt-2">
                            เพิ่มคอลัมน์
                        </button>
                    </form>
                 </div>
                 <hr />
                 <hr />
                 <h5 className="mb-3">รายการคอลัมน์มาตรฐาน</h5>
                 <ul className="list-group mb-4">
                    {STANDARD_FIELDS.map(field => (
                        <li key={field.key} className="list-group-item d-flex justify-content-between align-items-center" style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                            <span style={{ opacity: isFieldVisible(field.key) ? 1 : 0.5 }}>
                                {field.label} {isFieldVisible(field.key) ? '' : '(ซ่อนอยู่)'}
                            </span>
                            {!field.required && (
                                <button 
                                    className={`btn btn-sm ${isFieldVisible(field.key) ? 'btn-danger' : 'btn-success'}`}
                                    onClick={() => toggleFieldVisibility(field.key)}
                                >
                                    <i className={`fas ${isFieldVisible(field.key) ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            )}
                            {field.required && <span className="badge badge-secondary">จำเป็น</span>}
                        </li>
                    ))}
                 </ul>
                 
                 <h5 className="mb-3">รายการคอลัมน์เพิ่มเติม</h5>
                 <ul className="list-group">
                    {columns.map(col => (
                        <li key={col.id} className="list-group-item d-flex justify-content-between align-items-center" style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                            <span>
                                {col.column_label} ({col.column_key}) 
                                <span className="badge badge-light ml-2" style={{ marginLeft: '8px', fontSize: '0.7em' }}>{col.column_type}</span>
                            </span>
                            <button className="btn btn-danger btn-sm" onClick={() => removeColumn(col.id)}>
                                <i className="fas fa-trash"></i>
                            </button>
                        </li>
                    ))}
                    {columns.length === 0 && <li className="text-muted">ยังไม่มีคอลัมน์เพิ่มเติม</li>}
                 </ul>
            </Modal>
        </>
    );
}

/**
 * LicenseRow Component
 * Single table row with inline editing
 */
function LicenseRow({ license, shopOptions, typeOptions, schemaColumns, hiddenFields, onUpdate, onDelete }) {
    const isVisible = (key) => !hiddenFields?.includes(key);

    return (
        <tr>
            {isVisible('shop_id') && (
                <td>
                    <EditableCell
                        value={license.shop_id}
                        displayValue={license.shop_name}
                        type="select"
                        options={shopOptions}
                        onSave={(value) => onUpdate(license.id, 'shop_id', value)}
                    />
                </td>
            )}
            {isVisible('license_type_id') && (
                <td>
                    <EditableCell
                        value={license.license_type_id}
                        displayValue={license.type_name}
                        type="select"
                        options={typeOptions}
                        onSave={(value) => onUpdate(license.id, 'license_type_id', value)}
                    />
                </td>
            )}
            {isVisible('issue_date') && (
                <td className="text-center">
                    <EditableCell
                        value={toInputDateFormat(license.issue_date)}
                        displayValue={formatThaiDate(license.issue_date)}
                        type="date"
                        onSave={(value) => onUpdate(license.id, 'issue_date', value)}
                    />
                </td>
            )}
            {isVisible('expiry_date') && (
                <td className="text-center">
                    <EditableCell
                        value={toInputDateFormat(license.expiry_date)}
                        displayValue={formatThaiDate(license.expiry_date)}
                        type="date"
                        onSave={(value) => onUpdate(license.id, 'expiry_date', value)}
                    />
                </td>
            )}
            {isVisible('status') && (
                <td className="text-center">
                    <EditableCell
                        value={license.status}
                        displayValue={<StatusBadge status={license.status} />}
                        type="select"
                        options={STATUS_OPTIONS}
                        onSave={(value) => onUpdate(license.id, 'status', value)}
                    />
                </td>
            )}
            {schemaColumns && schemaColumns.map(col => (
                <td key={col.id}>
                    <EditableCell
                        value={license.custom_fields?.[col.column_key] || ''}
                        displayValue={
                            col.column_type === 'date' && license.custom_fields?.[col.column_key]
                                ? formatThaiDate(license.custom_fields[col.column_key])
                                : (license.custom_fields?.[col.column_key] || '-')
                        }
                        type={col.column_type || 'text'}
                        placeholder={col.column_label}
                        onSave={(value) => onUpdate(license.id, `custom_${col.column_key}`, value)}
                    />
                </td>
            ))}
            <td className="text-center">
                <button
                    className="btn btn-danger btn-icon"
                    onClick={() => onDelete(license.id)}
                >
                    <i className="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    );
}

/**
 * LicenseForm Component
 * Form for creating new licenses
 */
function LicenseForm({ formData, schemaColumns, hiddenFields, onChange, onSubmit, onCancel, shopOptions, typeOptions }) {
    const isVisible = (key) => !hiddenFields?.includes(key);

    const handleChange = (e) => {
        onChange({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCustomChange = (e, key) => {
        onChange({
            ...formData,
            custom_fields: {
                ...formData.custom_fields,
                [key]: e.target.value
            }
        });
    };

    // Render input based on type
    const renderInput = (col) => {
        const type = col.column_type || 'text';
        if (type === 'date') {
             return (
                 <input
                    type="date"
                    className="form-control"
                    value={formData.custom_fields?.[col.column_key] || ''}
                    onChange={(e) => handleCustomChange(e, col.column_key)}
                 />
             );
        } else if (type === 'number') {
             return (
                 <input
                    type="number"
                     className="form-control"
                    value={formData.custom_fields?.[col.column_key] || ''}
                    onChange={(e) => handleCustomChange(e, col.column_key)}
                 />
             );
        }
        return (
             <input
                type="text"
                 className="form-control"
                value={formData.custom_fields?.[col.column_key] || ''}
                onChange={(e) => handleCustomChange(e, col.column_key)}
             />
        );
    };

    return (
        <form onSubmit={onSubmit}>
            {isVisible('shop_id') && (
                <div className="form-group">
                    <label>ร้านค้า *</label>
                    <CustomSelect
                        name="shop_id"
                        value={formData.shop_id}
                        onChange={handleChange}
                        options={[
                            { value: '', label: '-- เลือกร้านค้า --' },
                            ...shopOptions
                        ]}
                        placeholder="เลือกร้านค้า"
                        searchable
                        searchPlaceholder="ค้นหาร้านค้า..."
                    />
                </div>
            )}

            {isVisible('license_type_id') && (
                <div className="form-group">
                    <label>ประเภทใบอนุญาต *</label>
                    <CustomSelect
                        name="license_type_id"
                        value={formData.license_type_id}
                        onChange={handleChange}
                        options={[
                            { value: '', label: '-- เลือกประเภท --' },
                            ...typeOptions
                        ]}
                        placeholder="เลือกประเภท"
                        searchable
                        searchPlaceholder="ค้นหาประเภท..."
                    />
                </div>
            )}

            {isVisible('license_number') && (
                <div className="form-group">
                    <label>เลขที่ใบอนุญาต *</label>
                    <input
                        type="text"
                        name="license_number"
                        value={formData.license_number}
                        onChange={handleChange}
                        required
                    />
                </div>
            )}

            {isVisible('issue_date') && (
                <div className="form-group">
                    <label>วันที่ออก *</label>
                    <DatePicker
                        name="issue_date"
                        value={formData.issue_date}
                        onChange={handleChange}
                        placeholder="เลือกวันที่ออก"
                    />
                </div>
            )}

            {isVisible('expiry_date') && (
                <div className="form-group">
                    <label>วันหมดอายุ *</label>
                    <DatePicker
                        name="expiry_date"
                        value={formData.expiry_date}
                        onChange={handleChange}
                        placeholder="เลือกวันหมดอายุ"
                    />
                </div>
            )}

            {isVisible('status') && (
                <div className="form-group">
                    <label>สถานะ</label>
                    <CustomSelect
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        options={STATUS_OPTIONS}
                        placeholder="เลือกสถานะ"
                    />
                </div>
            )}

            {isVisible('notes') && (
                <div className="form-group">
                    <label>หมายเหตุ</label>
                    <textarea
                        name="notes"
                        rows="2"
                        value={formData.notes}
                        onChange={handleChange}
                    />
                </div>
            )}

            {/* Dynamic Fields */}
            {schemaColumns && schemaColumns.map(col => (
                <div className="form-group" key={col.id}>
                    <label>{col.column_label}</label>
                    {renderInput(col)}
                </div>
            ))}

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
