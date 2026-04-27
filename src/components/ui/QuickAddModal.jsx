"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import CustomSelect from "./CustomSelect";
import DatePicker from "./DatePicker";
import Modal from "./Modal";
import { useDropdownData } from "@/hooks";
import useSWR, { mutate } from "swr";
import "./QuickAddModal.css";

const DEFAULT_PREFILL = {};
const DEFAULT_OPTIONS = [];

/**
 * Quick Add Modal - Modal for quick adding related entities
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal visibility
 * @param {Function} props.onClose - Close handler
 * @param {string} props.type - Type of entity to add: 'shop' | 'license'
 * @param {Object} props.prefillData - Pre-filled data for the form
 * @param {Function} props.onSubmit - Submit handler
 * @param {Array} props.shopOptions - Options for shop dropdown
 * @param {Array} props.typeOptions - Options for license type dropdown
 */
export default function QuickAddModal({
  isOpen,
  onClose,
  type,
  prefillData = DEFAULT_PREFILL,
  onSubmit,
}) {
  const { shopOptions, shopOptionsDetailed, typeOptions, refresh } = useDropdownData();

  // สร้าง option label แบบ 2 บรรทัดสำหรับ dropdown ร้านค้า:
  //   บรรทัด 1: ชื่อร้าน (ตัวหนา)
  //   บรรทัด 2: เจ้าของ · ที่อยู่ · เบอร์ (เล็ก, สีเทา, truncate ถ้ายาว)
  // ช่วยแยกร้านชื่อซ้ำ (เช่น 7ELEVEN หลายสาขา) ได้ชัดเจนขึ้น
  const shopOptionsWithDisplay = useMemo(() => {
    return shopOptionsDetailed.map(opt => {
      const subParts = [];
      if (opt.owner_name) subParts.push(opt.owner_name);
      if (opt.address)    subParts.push(opt.address);
      if (opt.phone)      subParts.push(opt.phone);
      const subText = subParts.join(' · ');

      return {
        ...opt,
        optionLabel: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              {opt.shop_name || '(ไม่ระบุชื่อร้าน)'}
            </div>
            {subText && (
              <div style={{
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }} title={subText}>
                {subText}
              </div>
            )}
          </div>
        ),
      };
    });
  }, [shopOptionsDetailed]);

  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customFields, setCustomFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // Refresh dropdown data when modal opens
  useEffect(() => {
    if (isOpen && refresh) {
      refresh();
    }
  }, [isOpen, refresh]);

  // Fetch custom fields when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCustomFields();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type]);

  const fetchCustomFields = async () => {
    setLoadingFields(true);
    try {
      const entityType = type === "shop" ? "shops" : "licenses";
      const res = await fetch(`/api/custom-fields?entity_type=${entityType}&t=${Date.now()}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        // Filter only fields that should show in form and are not standard fields
        const standardFields = type === "shop" 
          ? ['shop_name', 'owner_name', 'phone', 'address', 'notes', 'license_count']
          : ['shop_id', 'license_type_id', 'license_number', 'issue_date', 'expiry_date', 'status', 'notes'];
        const fields = (data.fields || []).filter(
          f => f.show_in_form && !standardFields.includes(f.field_name)
        );
        setCustomFields(fields);
      }
    } catch (err) {
      console.error('Error fetching custom fields:', err);
    } finally {
      setLoadingFields(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Initialize form data based on type
      if (type === "shop") {
        const initialData = {
          shop_name: "",
          owner_name: "",
          phone: "",
          address: "",
          notes: "",
          // If we want to create a license too
          create_license: false,
          license_type_id: "",
          license_number: "",
          ...prefillData,
        };
        
        // Initialize custom fields with empty values
        customFields.forEach(field => {
          if (!(field.field_name in initialData)) {
            initialData[field.field_name] = "";
          }
        });
        
        setFormData(initialData);
      } else if (type === "license") {
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);
        
        setFormData({
          shop_id: "",
          license_type_id: "",
          license_number: "",
          issue_date: today.toISOString().split("T")[0],
          expiry_date: nextYear.toISOString().split("T")[0],
          status: "active",
          notes: "",
          ...prefillData,
        });
      }
      setError("");
    }
  }, [isOpen, type, prefillData, customFields]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Separate standard fields from custom fields for both types
      if (type === "shop") {
        const standardFields = ['shop_name', 'owner_name', 'phone', 'address', 'notes', 'create_license', 'license_type_id', 'license_number'];
        const customFieldsData = {};
        
        // Extract custom field values
        Object.keys(formData).forEach(key => {
          if (!standardFields.includes(key)) {
            customFieldsData[key] = formData[key];
          }
        });
        
        // Create payload with custom_fields
        const payload = {
          shop_name: formData.shop_name,
          owner_name: formData.owner_name,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes,
          create_license: formData.create_license,
          license_type_id: formData.license_type_id,
          license_number: formData.license_number,
          custom_fields: customFieldsData,
        };
        
        await onSubmit(payload);
      } else if (type === "license") {
        const standardFields = ['shop_id', 'license_type_id', 'license_number', 'issue_date', 'expiry_date', 'status', 'notes'];
        const customFieldsData = {};
        
        // Extract custom field values
        Object.keys(formData).forEach(key => {
          if (!standardFields.includes(key)) {
            customFieldsData[key] = formData[key];
          }
        });
        
        // Create payload with custom_fields
        const payload = {
          shop_id: formData.shop_id,
          license_type_id: formData.license_type_id,
          license_number: formData.license_number,
          issue_date: formData.issue_date,
          expiry_date: formData.expiry_date,
          status: formData.status,
          notes: formData.notes,
          custom_fields: customFieldsData,
        };
        
        await onSubmit(payload);
      } else {
        await onSubmit(formData);
      }
      
      // Invalidate cache to refresh dropdown data immediately
      mutate(() => true, undefined, { revalidate: true });
      
      // Also call the refresh function to ensure dropdown data is updated
      if (refresh) {
        refresh();
      }
      
      // Force immediate revalidation of fast dropdown endpoints
      mutate('/api/shops/dropdown', undefined, { revalidate: true });
      mutate('/api/license-types/dropdown', undefined, { revalidate: true });
      
      onClose();
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={
        <>
          <i className={`fas ${type === "shop" ? "fa-store" : "fa-file-alt"}`} style={{ marginRight: '0.75rem' }}></i>
          {type === "shop" ? " สร้างร้านค้าใหม่" : " สร้างใบอนุญาตใหม่"}
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        )}

        {type === "shop" ? (
          // Shop Form
          <>
            <div className="form-group">
              <label htmlFor="shop_name" className="form-label required">ชื่อร้านค้า</label>
              <input
                id="shop_name"
                name="shop_name"
                type="text"
                className="form-input"
                value={formData.shop_name || ""}
                onChange={(e) => handleChange("shop_name", e.target.value)}
                placeholder="กรอกชื่อร้านค้า"
                required
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="owner_name" className="form-label">ชื่อเจ้าของ</label>
                <input
                  id="owner_name"
                  name="owner_name"
                  type="text"
                  className="form-input"
                  value={formData.owner_name || ""}
                  onChange={(e) => handleChange("owner_name", e.target.value)}
                  placeholder="ชื่อเจ้าของร้าน"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone" className="form-label">เบอร์โทรศัพท์</label>
                <input
                  id="phone"
                  name="phone"
                  type="text"
                  className="form-input"
                  value={formData.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="0xx-xxx-xxxx"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address" className="form-label">ที่อยู่</label>
              <textarea
                id="address"
                name="address"
                className="form-input"
                value={formData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="ที่อยู่ร้านค้า"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes" className="form-label">หมายเหตุ</label>
              <input
                id="notes"
                name="notes"
                type="text"
                className="form-input"
                value={formData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม"
              />
            </div>

            {/* Custom Fields Section */}
            {customFields.length > 0 && (
              <>
                <div className="form-divider" style={{ margin: '1.5rem 0 1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    <i className="fas fa-sliders-h" style={{ marginRight: '0.5rem' }}></i>
                    ข้อมูลเพิ่มเติม (Custom Fields)
                  </label>
                </div>
                
                {customFields.map((field) => {
                  const fieldValue = formData[field.field_name] || "";
                  
                  return (
                    <div key={field.id} className="form-group">
                      <label htmlFor={field.field_name} className={`form-label ${field.is_required ? 'required' : ''}`}>
                        {field.field_label}
                      </label>
                      
                      {field.field_type === 'textarea' ? (
                        <textarea
                          id={field.field_name}
                          name={field.field_name}
                          className="form-input"
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          placeholder={`กรอก${field.field_label}`}
                          required={field.is_required}
                          rows={3}
                        />
                      ) : field.field_type === 'number' ? (
                        <input
                          id={field.field_name}
                          name={field.field_name}
                          type="number"
                          className="form-input"
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          placeholder={`กรอก${field.field_label}`}
                          required={field.is_required}
                        />
                      ) : field.field_type === 'date' ? (
                        <DatePicker
                          id={field.field_name}
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          placeholder={`เลือก${field.field_label}`}
                          required={field.is_required}
                        />
                      ) : field.field_type === 'select' && field.field_options ? (
                        <CustomSelect
                          id={field.field_name}
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          options={[
                            { value: "", label: `-- เลือก${field.field_label} --` },
                            ...(Array.isArray(field.field_options) 
                              ? field.field_options.map(opt => ({ 
                                  value: typeof opt === 'string' ? opt : opt.value, 
                                  label: typeof opt === 'string' ? opt : opt.label 
                                }))
                              : []
                            )
                          ]}
                          searchable={true}
                          searchPlaceholder={`🔍 ค้นหา${field.field_label}...`}
                        />
                      ) : (
                        <input
                          id={field.field_name}
                          name={field.field_name}
                          type="text"
                          className="form-input"
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          placeholder={`กรอก${field.field_label}`}
                          required={field.is_required}
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}

            <div className="form-divider">
              <label className="checkbox-label" htmlFor="create_license">
                <input
                  id="create_license"
                  name="create_license"
                  type="checkbox"
                  checked={formData.create_license || false}
                  onChange={(e) => handleChange("create_license", e.target.checked)}
                />
                <span>สร้างใบอนุญาตพร้อมกัน</span>
              </label>
            </div>

            {formData.create_license && (
              <div className="nested-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="license_type_id_shop" className="form-label required">ประเภทใบอนุญาต</label>
                    <CustomSelect
                      id="license_type_id_shop"
                      value={formData.license_type_id || ""}
                      onChange={(e) => handleChange("license_type_id", e.target.value)}
                      options={[{ value: "", label: "-- เลือกประเภท --" }, ...typeOptions]}
                      searchable={true}
                      searchPlaceholder="🔍 ค้นหาประเภท..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="license_number_shop" className="form-label required">เลขที่ใบอนุญาต</label>
                    <input
                      id="license_number_shop"
                      name="license_number"
                      type="text"
                      className="form-input"
                      value={formData.license_number || ""}
                      onChange={(e) => handleChange("license_number", e.target.value)}
                      placeholder="เลขที่ใบอนุญาต"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // License Form
          <>
            <div className="form-group">
              <label htmlFor="shop_id" className="form-label required">ร้านค้า</label>
              <CustomSelect
                id="shop_id"
                value={formData.shop_id || ""}
                onChange={(e) => handleChange("shop_id", e.target.value)}
                options={[{ value: "", label: "-- เลือกร้านค้า --" }, ...shopOptionsWithDisplay]}
                searchable={true}
                searchPlaceholder="🔍 ค้นหาจากชื่อร้าน, เจ้าของ, ที่อยู่, หรือเบอร์โทร..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="license_type_id" className="form-label required">ประเภทใบอนุญาต</label>
                <CustomSelect
                  id="license_type_id"
                  value={formData.license_type_id || ""}
                  onChange={(e) => handleChange("license_type_id", e.target.value)}
                  options={[{ value: "", label: "-- เลือกประเภท --" }, ...typeOptions]}
                  searchable={true}
                  searchPlaceholder="🔍 ค้นหาประเภท..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="license_number" className="form-label required">เลขที่ใบอนุญาต</label>
                <input
                  id="license_number"
                  name="license_number"
                  type="text"
                  className="form-input"
                  value={formData.license_number || ""}
                  onChange={(e) => handleChange("license_number", e.target.value)}
                  placeholder="เลขที่ใบอนุญาต"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="issue_date" className="form-label">วันที่ออก</label>
                <DatePicker
                  id="issue_date"
                  value={formData.issue_date || ""}
                  onChange={(e) => {
                    const newIssueDate = e.target.value;
                    setFormData((prev) => {
                      let newExpiryDate = prev.expiry_date;
                      if (newIssueDate) {
                        const date = new Date(newIssueDate);
                        if (!isNaN(date.getTime())) {
                          date.setFullYear(date.getFullYear() + 1);
                          newExpiryDate = date.toISOString().split("T")[0];
                        }
                      }
                      return {
                        ...prev,
                        issue_date: newIssueDate,
                        expiry_date: newExpiryDate,
                      };
                    });
                  }}
                  placeholder="เลือกวันที่ออก"
                />
              </div>
              <div className="form-group">
                <label htmlFor="expiry_date" className="form-label">วันหมดอายุ</label>
                <DatePicker
                  id="expiry_date"
                  value={formData.expiry_date || ""}
                  onChange={(e) => handleChange("expiry_date", e.target.value)}
                  placeholder="เลือกวันหมดอายุ"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes" className="form-label">หมายเหตุ</label>
              <textarea
                id="notes"
                name="notes"
                className="form-input"
                value={formData.notes || ""}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม"
                rows={2}
              />
            </div>

            {/* Custom Fields Section for Licenses */}
            {customFields.length > 0 && (
              <>
                <div className="form-divider" style={{ margin: '1.5rem 0 1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    <i className="fas fa-sliders-h" style={{ marginRight: '0.5rem' }}></i>
                    ข้อมูลเพิ่มเติม (Custom Fields)
                  </label>
                </div>
                
                {customFields.map((field) => {
                  const fieldValue = formData[field.field_name] || "";
                  
                  return (
                    <div key={field.id} className="form-group">
                      <label className={`form-label ${field.is_required ? 'required' : ''}`}>
                        {field.field_label}
                      </label>
                      
                      {field.field_type === 'textarea' ? (
                        <textarea
                          className="form-input"
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          placeholder={`กรอก${field.field_label}`}
                          required={field.is_required}
                          rows={3}
                        />
                      ) : field.field_type === 'number' ? (
                        <input
                          type="number"
                          className="form-input"
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          placeholder={`กรอก${field.field_label}`}
                          required={field.is_required}
                        />
                      ) : field.field_type === 'date' ? (
                        <DatePicker
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          placeholder={`เลือก${field.field_label}`}
                          required={field.is_required}
                        />
                      ) : field.field_type === 'select' && field.field_options ? (
                        <CustomSelect
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          options={[
                            { value: "", label: `-- เลือก${field.field_label} --` },
                            ...(Array.isArray(field.field_options) 
                              ? field.field_options.map(opt => ({ 
                                  value: typeof opt === 'string' ? opt : opt.value, 
                                  label: typeof opt === 'string' ? opt : opt.label 
                                }))
                              : []
                            )
                          ]}
                          searchable={true}
                          searchPlaceholder={`🔍 ค้นหา${field.field_label}...`}
                        />
                      ) : (
                        <input
                          type="text"
                          className="form-input"
                          value={fieldValue}
                          onChange={(e) => handleChange(field.field_name, e.target.value)}
                          placeholder={`กรอก${field.field_label}`}
                          required={field.is_required}
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}

        <div
          className="modal-footer"
          style={{
            marginTop: "1.5rem",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem",
            background: "none",
            borderTop: "none",
            padding: 0
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            ยกเลิก
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> บันทึก
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
