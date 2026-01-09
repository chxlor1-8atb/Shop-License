'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePagination } from '@/hooks';
import { useSchema } from '@/hooks';
import { API_ENDPOINTS } from '@/constants';
import { formatThaiDate } from '@/utils/formatters';
import { showSuccess, showError, pendingDelete } from '@/utils/alerts';

// UI Components
import Pagination from '@/components/ui/Pagination';
import EditableCell from '@/components/ui/EditableCell';
import EditableHeader from '@/components/ui/EditableHeader';
import Modal from '@/components/ui/Modal';
import FilterRow, { SearchInput } from '@/components/ui/FilterRow';
import TableSkeleton from '@/components/ui/TableSkeleton';

// Initial form state
const INITIAL_FORM_DATA = {
    id: '',
    shop_name: '',
    owner_name: '',
    address: '',
    phone: '',
    email: '',
    notes: ''
};

// Default column names
const DEFAULT_COLUMN_NAMES = {
    shop_name: 'ชื่อร้าน',
    owner_name: 'เจ้าของ',
    phone: 'โทรศัพท์',
    license_count: 'ใบอนุญาต',
    actions: 'ลบ'
};

const STANDARD_FIELDS = [
    { key: 'shop_name', label: 'ชื่อร้านค้า', required: true },
    { key: 'owner_name', label: 'ชื่อเจ้าของ' },
    { key: 'phone', label: 'เบอร์โทรศัพท์' },
    { key: 'address', label: 'ที่อยู่', formOnly: true },
    { key: 'email', label: 'อีเมล', formOnly: true },
    { key: 'notes', label: 'หมายเหตุ', formOnly: true },
    { key: 'license_count', label: 'จำนวนใบอนุญาต', tableOnly: true }
];

/**
 * ShopsPage Component
 * Manages shop listing with CRUD operations
 */
export default function ShopsPage() {
    const pagination = usePagination(20);

    // Local state
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState(INITIAL_FORM_DATA);
    
    // Editable column names (stored in localStorage)
    const [columnNames, setColumnNames] = useState(DEFAULT_COLUMN_NAMES);
    
    // Dynamic Schema State
    // Dynamic Schema Hook
    const { columns, loading: schemaLoading, addColumn, removeColumn } = useSchema('shops');
    // const [schemaColumns, setSchemaColumns] = useState([]); // Removed
    const [showSchemaModal, setShowSchemaModal] = useState(false);
    const [newColumnData, setNewColumnData] = useState({ column_key: '', column_label: '', column_type: 'text' });
    
    // Hidden Fields State
    const [hiddenFields, setHiddenFields] = useState([]);

    // Load hidden fields
    useEffect(() => {
        const savedHidden = localStorage.getItem('shops_hidden_fields');
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
        localStorage.setItem('shops_hidden_fields', JSON.stringify(newHidden));
    };

    const isFieldVisible = (key) => !hiddenFields.includes(key);

    // Load saved column names from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('shops_column_names');
        if (saved) {
            try {
                setColumnNames({ ...DEFAULT_COLUMN_NAMES, ...JSON.parse(saved) });
            } catch (e) {
                console.error('Failed to load column names:', e);
            }
        }
    }, []);

    // Save column name change
    const handleColumnNameSave = (fieldKey, newName) => {
        const updated = { ...columnNames, [fieldKey]: newName };
        setColumnNames(updated);
        localStorage.setItem('shops_column_names', JSON.stringify(updated));
        showSuccess('บันทึกชื่อคอลัมน์เรียบร้อยแล้ว');
    };

    // Fetch shops and schema when dependencies change
    // Fetch shops when dependencies change
    useEffect(() => {
        fetchShops();
    }, [pagination.page, pagination.limit, search]);

    // fetchSchema, handleAddColumn, handleDeleteColumn are removed (replaced by hook)

    // Removed manual schema fetching and handlers

    /**
     * Fetches shops from API
     */
    const fetchShops = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                search
            });

            const response = await fetch(`${API_ENDPOINTS.SHOPS}?${params}`);
            const data = await response.json();

            if (data.success) {
                setShops(data.shops);
                pagination.updateFromResponse(data.pagination);
            }
        } catch (error) {
            console.error('Failed to fetch shops:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, search]);

    /**
     * Handles inline field updates
     */
    const handleInlineUpdate = async (shopId, field, value) => {
        const shop = shops.find(s => s.id === shopId);
        if (!shop) return;

        const updateData = {
            id: shopId,
            shop_name: shop.shop_name,
            owner_name: shop.owner_name || '',
            address: shop.address || '',
            phone: shop.phone || '',
            email: shop.email || '',
            notes: shop.notes || '',
            email: shop.email || '',
            notes: shop.notes || '',
            custom_fields: shop.custom_fields || {},
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
            const response = await fetch(API_ENDPOINTS.SHOPS, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updateData)
            });
            const data = await response.json();

            if (data.success) {
                setShops(prev => prev.map(s =>
                    s.id === shopId ? { ...s, [field]: value } : s
                ));
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            showError(error.message);
            throw error;
        }
    };

    /**
     * Handles shop deletion
     */
    /**
     * Handles shop deletion
     */
    const handleDelete = (id) => {
        const itemToDelete = shops.find(s => s.id === id);
        if (!itemToDelete) return;

        // Optimistic update
        setShops(prev => prev.filter(s => s.id !== id));

        pendingDelete({
            itemName: 'ร้านค้า',
            onDelete: async () => {
                try {
                    const response = await fetch(`${API_ENDPOINTS.SHOPS}?id=${id}`, {
                        method: 'DELETE'
                    });
                    const data = await response.json();

                    if (!data.success) {
                        throw new Error(data.message);
                    }
                    // Success - optionally refresh to sync pagination
                    fetchShops(); 
                } catch (error) {
                    showError(error.message);
                    // Restore on error
                    setShops(prev => [...prev, itemToDelete]);
                    fetchShops();
                }
            },
            onCancel: () => {
                // Restore on cancel
                setShops(prev => [...prev, itemToDelete]);
                fetchShops();
            }
        });
    };

    /**
     * Opens modal for adding new shop
     */
    const openModal = () => {
        setFormData(INITIAL_FORM_DATA);
        setShowModal(true);
    };

    /**
     * Handles form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(API_ENDPOINTS.SHOPS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (data.success) {
                setShowModal(false);
                showSuccess(data.message);
                fetchShops();
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError(error.message);
        }
    };

    /**
     * Handles search with page reset
     */
    const handleSearch = (value) => {
        setSearch(value);
        pagination.resetPage();
    };

    // Skeleton columns definition
    const skeletonColumns = [
        { width: '30%' },
        { width: '25%' },
        { width: '20%' },
        { width: '15%', center: true },
        { width: '10%', center: true }
    ];

    return (
        <>
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <i className="fas fa-store"></i> รายการร้านค้า
                    </h3>
                    <div className="flex gap-2">
                        <button className="btn btn-primary btn-sm" onClick={openModal}>
                            <i className="fas fa-plus"></i> เพิ่มร้านค้า
                        </button>
                        <button className="btn btn-secondary btn-sm ml-2" onClick={() => setShowSchemaModal(true)} style={{ marginLeft: '8px' }}>
                             จัดการคอลัมน์
                        </button>
                    </div>
                </div>

                <div className="card-body">
                    <FilterRow>
                        <SearchInput
                            value={search}
                            onChange={handleSearch}
                            placeholder="ค้นหาร้านค้า..."
                        />
                    </FilterRow>

                    <div className="table-container">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    {isFieldVisible('shop_name') && (
                                        <EditableHeader
                                            value={columnNames.shop_name}
                                            fieldKey="shop_name"
                                            onSave={handleColumnNameSave}
                                        />
                                    )}
                                    {isFieldVisible('owner_name') && (
                                        <EditableHeader
                                            value={columnNames.owner_name}
                                            fieldKey="owner_name"
                                            onSave={handleColumnNameSave}
                                        />
                                    )}
                                    {isFieldVisible('phone') && (
                                        <EditableHeader
                                            value={columnNames.phone}
                                            fieldKey="phone"
                                            onSave={handleColumnNameSave}
                                        />
                                    )}
                                    {isFieldVisible('license_count') && (
                                        <EditableHeader
                                            value={columnNames.license_count}
                                            fieldKey="license_count"
                                            onSave={handleColumnNameSave}
                                            className="text-center"
                                        />
                                    )}
                                    {columns.map(col => (
                                        <th key={col.id} className="text-center">
                                            {col.column_label}
                                        </th>
                                    ))}
                                    <th className="text-center" style={{ width: '80px' }}>{columnNames.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <TableSkeleton rows={5} columns={skeletonColumns} />
                                ) : shops.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center">ไม่พบข้อมูล</td>
                                    </tr>
                                ) : (
                                    shops.map(shop => (
                                        <ShopRow
                                            key={shop.id}
                                            shop={shop}
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
                title="เพิ่มร้านค้าใหม่"
            >
                <ShopForm
                    formData={formData}
                    schemaColumns={columns}
                    hiddenFields={hiddenFields}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    onCancel={() => setShowModal(false)}
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
 * ShopRow Component - Single table row
 */
function ShopRow({ shop, schemaColumns, hiddenFields, onUpdate, onDelete }) {
    const isVisible = (key) => !hiddenFields?.includes(key);

    return (
        <tr>
            {isVisible('shop_name') && (
                <td>
                    <EditableCell
                        value={shop.shop_name}
                        type="text"
                        onSave={(value) => onUpdate(shop.id, 'shop_name', value)}
                    />
                </td>
            )}
            {isVisible('owner_name') && (
                <td>
                    <EditableCell
                        value={shop.owner_name || ''}
                        displayValue={shop.owner_name || '-'}
                        type="text"
                        placeholder="ชื่อเจ้าของ"
                        onSave={(value) => onUpdate(shop.id, 'owner_name', value)}
                    />
                </td>
            )}
            {isVisible('phone') && (
                <td>
                    <EditableCell
                        value={shop.phone || ''}
                        displayValue={shop.phone || '-'}
                        type="text"
                        placeholder="เบอร์โทร"
                        onSave={(value) => onUpdate(shop.id, 'phone', value)}
                    />
                </td>
            )}
            {isVisible('license_count') && (
                <td className="text-center">
                    <span className="badge badge-active">{shop.license_count}</span>
                </td>
            )}
            {schemaColumns && schemaColumns.map(col => (
                <td key={col.id}>
                    <EditableCell
                        value={shop.custom_fields?.[col.column_key] || ''}
                        displayValue={
                            col.column_type === 'date' && shop.custom_fields?.[col.column_key]
                                ? formatThaiDate(shop.custom_fields[col.column_key])
                                : (shop.custom_fields?.[col.column_key] || '-')
                        }
                        type={col.column_type || 'text'}
                        placeholder={col.column_label}
                        onSave={(value) => onUpdate(shop.id, `custom_${col.column_key}`, value)}
                    />
                </td>
            ))}
            <td className="text-center">
                <button
                    className="btn btn-danger btn-icon"
                    onClick={() => onDelete(shop.id)}
                >
                    <i className="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    );
}

/**
 * ShopForm Component - Form for creating shops
 */
function ShopForm({ formData, schemaColumns, hiddenFields, onChange, onSubmit, onCancel }) {
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
            {isVisible('shop_name') && (
                <div className="form-group">
                    <label>ชื่อร้านค้า *</label>
                    <input
                        type="text"
                        name="shop_name"
                        value={formData.shop_name}
                        onChange={handleChange}
                        required
                    />
                </div>
            )}
            {isVisible('owner_name') && (
                <div className="form-group">
                    <label>ชื่อเจ้าของ</label>
                    <input
                        type="text"
                        name="owner_name"
                        value={formData.owner_name}
                        onChange={handleChange}
                    />
                </div>
            )}
            {isVisible('address') && (
                <div className="form-group">
                    <label>ที่อยู่</label>
                    <textarea
                        name="address"
                        rows="2"
                        value={formData.address}
                        onChange={handleChange}
                    />
                </div>
            )}
            {isVisible('phone') && (
                <div className="form-group">
                    <label>โทรศัพท์</label>
                    <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                    />
                </div>
            )}
            {isVisible('email') && (
                <div className="form-group">
                    <label>อีเมล</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
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
