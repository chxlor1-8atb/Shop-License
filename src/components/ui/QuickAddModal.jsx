"use client";

import { useState, useEffect } from "react";
import CustomSelect from "./CustomSelect";
import DatePicker from "./DatePicker";
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
  shopOptions = DEFAULT_OPTIONS,
  typeOptions = DEFAULT_OPTIONS,
}) {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Initialize form data based on type
      if (type === "shop") {
        setFormData({
          shop_name: "",
          owner_name: "",
          phone: "",
          address: "",
          email: "",
          notes: "",
          // If we want to create a license too
          create_license: false,
          license_type_id: "",
          license_number: "",
          ...prefillData,
        });
      } else if (type === "license") {
        setFormData({
          shop_id: "",
          license_type_id: "",
          license_number: "",
          issue_date: new Date().toISOString().split("T")[0],
          expiry_date: "",
          status: "active",
          notes: "",
          ...prefillData,
        });
      }
      setError("");
    }
  }, [isOpen, type, prefillData]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="quick-add-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className={`fas ${type === "shop" ? "fa-store" : "fa-file-alt"}`}></i>
            {type === "shop" ? " สร้างร้านค้าใหม่" : " สร้างใบอนุญาตใหม่"}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-error">
                <i className="fas fa-exclamation-circle"></i> {error}
              </div>
            )}

            {type === "shop" ? (
              // Shop Form
              <>
                <div className="form-group">
                  <label className="form-label required">ชื่อร้านค้า</label>
                  <input
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
                    <label className="form-label">ชื่อเจ้าของ</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.owner_name || ""}
                      onChange={(e) => handleChange("owner_name", e.target.value)}
                      placeholder="ชื่อเจ้าของร้าน"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.phone || ""}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="0xx-xxx-xxxx"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">ที่อยู่</label>
                  <textarea
                    className="form-input"
                    value={formData.address || ""}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="ที่อยู่ร้านค้า"
                    rows={2}
                  />
                </div>

                {/* Option to create license too */}
                <div className="form-divider">
                  <label className="checkbox-label">
                    <input
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
                        <label className="form-label required">ประเภทใบอนุญาต</label>
                        <CustomSelect
                          value={formData.license_type_id || ""}
                          onChange={(e) => handleChange("license_type_id", e.target.value)}
                          options={[{ value: "", label: "-- เลือกประเภท --" }, ...typeOptions]}
                          searchable={true}
                          searchPlaceholder="🔍 ค้นหาประเภท..."
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label required">เลขที่ใบอนุญาต</label>
                        <input
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
                  <label className="form-label required">ร้านค้า</label>
                  <CustomSelect
                    value={formData.shop_id || ""}
                    onChange={(e) => handleChange("shop_id", e.target.value)}
                    options={[{ value: "", label: "-- เลือกร้านค้า --" }, ...shopOptions]}
                    searchable={true}
                    searchPlaceholder="🔍 ค้นหาร้านค้า..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">ประเภทใบอนุญาต</label>
                    <CustomSelect
                      value={formData.license_type_id || ""}
                      onChange={(e) => handleChange("license_type_id", e.target.value)}
                      options={[{ value: "", label: "-- เลือกประเภท --" }, ...typeOptions]}
                      searchable={true}
                      searchPlaceholder="🔍 ค้นหาประเภท..."
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">เลขที่ใบอนุญาต</label>
                    <input
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
                    <label className="form-label">วันที่ออก</label>
                    <DatePicker
                      value={formData.issue_date || ""}
                      onChange={(e) => handleChange("issue_date", e.target.value)}
                      placeholder="เลือกวันที่ออก"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันหมดอายุ</label>
                    <DatePicker
                      value={formData.expiry_date || ""}
                      onChange={(e) => handleChange("expiry_date", e.target.value)}
                      placeholder="เลือกวันหมดอายุ"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">หมายเหตุ</label>
                  <textarea
                    className="form-input"
                    value={formData.notes || ""}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="หมายเหตุเพิ่มเติม"
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
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
      </div>
    </div>
  );
}
