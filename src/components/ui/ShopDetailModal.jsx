"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { API_ENDPOINTS } from "@/constants";
import { showSuccess, showError } from "@/utils/alerts";
import { formatThaiDate } from "@/utils/formatters";
import CustomSelect from "./CustomSelect";
import DatePicker from "./DatePicker";
import "./ShopDetailModal.css";

// Fields ที่แสดงใน header อยู่แล้ว — ไม่ต้องแสดงซ้ำใน grid
const HEADER_FIELDS = new Set(["id", "shop_name", "owner_name", "phone", "license_count", "active_license_count"]);

// Format ค่าตาม type ของ column — กลับเป็น ReactNode/string
function formatValue(value, type) {
  if (value === null || value === undefined || value === "") return null;
  if (type === "date") return formatThaiDate(value);
  if (type === "number") return Number(value).toLocaleString("th-TH");
  if (type === "boolean") return value ? "ใช่" : "ไม่";
  return String(value);
}

// ดึงค่าจาก shop row รองรับทั้ง flatten และ nested custom_fields
function resolveValue(shop, colId) {
  if (!shop) return undefined;
  if (shop[colId] !== undefined && shop[colId] !== null && shop[colId] !== "") {
    return shop[colId];
  }
  if (shop.custom_fields && typeof shop.custom_fields === "object") {
    return shop.custom_fields[colId];
  }
  return undefined;
}

// Icon map ตาม column id มาตรฐาน (fallback เป็น icon ทั่วไปถ้าไม่พบ)
const ICON_MAP = {
  address: "fa-map-marker-alt",
  email: "fa-envelope",
  notes: "fa-sticky-note",
  phone: "fa-phone",
  owner_name: "fa-user",
  shop_name: "fa-store",
  created_at: "fa-calendar-plus",
  updated_at: "fa-calendar-check",
};

/**
 * Shop Detail Modal - Shows shop info with its licenses
 * @param {Array} columns - (optional) Column definitions จาก ExcelTable — ถ้าส่งมา จะแสดงทุกฟิลด์รวม custom fields
 */
export default function ShopDetailModal({
  isOpen,
  onClose,
  shop,
  typeOptions = [],
  columns = [],
  onLicenseCreated,
}) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddLicense, setShowAddLicense] = useState(false);
  const [newLicense, setNewLicense] = useState(() => {
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    return {
      license_type_id: "",
      license_number: "",
      issue_date: today.toISOString().split("T")[0],
      expiry_date: nextYear.toISOString().split("T")[0],
      status: "active",
      notes: "",
    };
  });

  // Define fetchShopLicenses before useEffect that uses it
  const fetchShopLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.LICENSES}?shop_id=${shop.id}&limit=100`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses || []);
      }
    } catch (err) {
      console.error("Failed to fetch licenses:", err);
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => {
    if (isOpen && shop?.id) {
      fetchShopLicenses();
      setShowAddLicense(false);
    }
  }, [isOpen, shop?.id, fetchShopLicenses]);

  const handleAddLicense = async (e) => {
    e.preventDefault();
    if (!newLicense.license_type_id || !newLicense.license_number) {
      showError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.LICENSES, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          shop_id: shop.id,
          ...newLicense,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("สร้างใบอนุญาตเรียบร้อย");
        setShowAddLicense(false);
        const today = new Date();
        const nextYear = new Date(today);
        nextYear.setFullYear(today.getFullYear() + 1);

        setNewLicense({
          license_type_id: "",
          license_number: "",
          issue_date: today.toISOString().split("T")[0],
          expiry_date: nextYear.toISOString().split("T")[0],
          status: "active",
          notes: "",
        });
        fetchShopLicenses();
        onLicenseCreated?.();
      } else {
        showError(data.message);
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: "badge-success", label: "ใช้งาน" },
      expired: { class: "badge-danger", label: "หมดอายุ" },
      pending: { class: "badge-warning", label: "รอดำเนินการ" },
      suspended: { class: "badge-secondary", label: "ระงับ" },
    };
    const config = statusConfig[status] || { class: "badge-secondary", label: status };
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // สร้าง list ของ detail items จาก columns (ถ้าส่งมา) — ครอบคลุมทั้ง standard + custom fields
  // ถ้าไม่มี columns ให้ fallback เป็น fields มาตรฐาน 3 ตัว (address, email, notes) เหมือนเดิม
  const detailItems = useMemo(() => {
    if (!shop) return [];

    // มี columns จาก ExcelTable → iterate ทุก column
    if (columns && columns.length > 0) {
      return columns
        .filter((col) => !HEADER_FIELDS.has(col.id))
        .map((col) => {
          const rawValue = resolveValue(shop, col.id);
          const formatted = formatValue(rawValue, col.type);
          return {
            id: col.id,
            label: col.name || col.id,
            icon: ICON_MAP[col.id] || (col.isCustom ? "fa-tag" : "fa-info-circle"),
            value: formatted,
          };
        })
        .filter((item) => item.value !== null && item.value !== undefined && item.value !== "");
    }

    // Fallback — ไม่ได้ส่ง columns มา: แสดงฟิลด์มาตรฐาน
    const fallbackFields = [
      { id: "address", label: "ที่อยู่", icon: "fa-map-marker-alt" },
      { id: "email", label: "อีเมล", icon: "fa-envelope" },
      { id: "notes", label: "หมายเหตุ", icon: "fa-sticky-note" },
    ];
    return fallbackFields
      .map((f) => ({ ...f, value: shop[f.id] }))
      .filter((item) => item.value);
  }, [shop, columns]);

  if (!isOpen || !shop) return null;

  return createPortal(
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="shop-info-header">
            <div className="shop-avatar">
              <i className="fas fa-store"></i>
            </div>
            <div>
              <h3>{shop.shop_name}</h3>
              <p className="shop-meta">
                {shop.owner_name && <span><i className="fas fa-user"></i> {shop.owner_name}</span>}
                {shop.phone && <span><i className="fas fa-phone"></i> {shop.phone}</span>}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Shop Details — ครอบคลุมทุก column (รวม custom fields) ถ้ามี columns ส่งมา */}
          {detailItems.length > 0 && (
            <div className="shop-details-grid">
              {detailItems.map((item) => (
                <div key={item.id} className="detail-item">
                  <span className="detail-label">
                    <i className={`fas ${item.icon}`}></i> {item.label}
                  </span>
                  <span className="detail-value">{item.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Licenses Section */}
          <div className="licenses-section">
            <div className="section-header">
              <h4>
                <i className="fas fa-file-alt"></i> ใบอนุญาต
                <span className="count-badge">{licenses.length}</span>
              </h4>
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShowAddLicense(!showAddLicense)}
              >
                <i className={`fas ${showAddLicense ? "fa-minus" : "fa-plus"}`}></i>
                {showAddLicense ? "ยกเลิก" : "เพิ่มใบอนุญาต"}
              </button>
            </div>

            {/* Add License Form */}
            {showAddLicense && (
              <form className="add-license-form" onSubmit={handleAddLicense}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="shop_detail_license_type" className="form-label required">ประเภท</label>
                    <CustomSelect
                      id="shop_detail_license_type"
                      value={newLicense.license_type_id}
                      onChange={(e) =>
                        setNewLicense((prev) => ({ ...prev, license_type_id: e.target.value }))
                      }
                      options={[{ value: "", label: "-- เลือกประเภท --" }, ...typeOptions]}
                      placeholder="เลือกประเภท"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="shop_detail_license_number" className="form-label required">เลขที่ใบอนุญาต</label>
                    <input
                      id="shop_detail_license_number"
                      name="license_number"
                      type="text"
                      className="form-input"
                      value={newLicense.license_number}
                      onChange={(e) =>
                        setNewLicense((prev) => ({ ...prev, license_number: e.target.value }))
                      }
                      placeholder="เลขที่ใบอนุญาต"
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="shop_detail_issue_date" className="form-label">วันที่ออก</label>
                    <DatePicker
                      id="shop_detail_issue_date"
                      value={newLicense.issue_date}
                      onChange={(e) => {
                        const newIssueDate = e.target.value;
                        setNewLicense((prev) => {
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
                    <label htmlFor="shop_detail_expiry_date" className="form-label">วันหมดอายุ</label>
                    <DatePicker
                      id="shop_detail_expiry_date"
                      value={newLicense.expiry_date}
                      onChange={(e) =>
                        setNewLicense((prev) => ({ ...prev, expiry_date: e.target.value }))
                      }
                      placeholder="เลือกวันหมดอายุ"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block">
                  <i className="fas fa-save"></i> บันทึกใบอนุญาต
                </button>
              </form>
            )}

            {/* Licenses List */}
            {loading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i> กำลังโหลด...
              </div>
            ) : licenses.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-file-alt"></i>
                <p>ยังไม่มีใบอนุญาต</p>
                <small>คลิก &quot;เพิ่มใบอนุญาต&quot; เพื่อสร้างใบอนุญาตใหม่</small>
              </div>
            ) : (
              <div className="licenses-list">
                {licenses.map((license) => (
                  <div key={license.id} className="license-card">
                    <div className="license-icon">
                      <i className="fas fa-certificate"></i>
                    </div>
                    <div className="license-info">
                      <div className="license-title">
                        <span className="license-number">{license.license_number}</span>
                        {getStatusBadge(license.status)}
                      </div>
                      <div className="license-meta">
                        <span className="type-name">{license.type_name || "ไม่ระบุประเภท"}</span>
                        <span className="dates">
                          <i className="fas fa-calendar"></i>
                          {formatDate(license.issue_date)} - {formatDate(license.expiry_date)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            <i className="fas fa-times"></i> ปิด
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
