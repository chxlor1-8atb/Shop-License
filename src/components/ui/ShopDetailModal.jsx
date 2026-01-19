"use client";

import { useState, useEffect } from "react";
import { API_ENDPOINTS, STATUS_OPTIONS } from "@/constants";
import { showSuccess, showError } from "@/utils/alerts";
import CustomSelect from "./CustomSelect";
import DatePicker from "./DatePicker";
import "./ShopDetailModal.css";

/**
 * Shop Detail Modal - Shows shop info with its licenses
 */
export default function ShopDetailModal({
  isOpen,
  onClose,
  shop,
  typeOptions = [],
  onLicenseCreated,
}) {
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddLicense, setShowAddLicense] = useState(false);
  const [newLicense, setNewLicense] = useState({
    license_type_id: "",
    license_number: "",
    issue_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    status: "active",
    notes: "",
  });

  useEffect(() => {
    if (isOpen && shop?.id) {
      fetchShopLicenses();
      setShowAddLicense(false);
    }
  }, [isOpen, shop?.id]);

  const fetchShopLicenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_ENDPOINTS.LICENSES}?shop_id=${shop.id}&limit=100`);
      const data = await res.json();
      if (data.success) {
        setLicenses(data.licenses || []);
      }
    } catch (err) {
      console.error("Failed to fetch licenses:", err);
    } finally {
      setLoading(false);
    }
  };

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
        body: JSON.stringify({
          shop_id: shop.id,
          ...newLicense,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("สร้างใบอนุญาตเรียบร้อย");
        setShowAddLicense(false);
        setNewLicense({
          license_type_id: "",
          license_number: "",
          issue_date: new Date().toISOString().split("T")[0],
          expiry_date: "",
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

  if (!isOpen || !shop) return null;

  return (
    <div className="modal-overlay show" onClick={onClose}>
      <div className="shop-detail-modal" onClick={(e) => e.stopPropagation()}>
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
          {/* Shop Details */}
          <div className="shop-details-grid">
            {shop.address && (
              <div className="detail-item">
                <span className="detail-label"><i className="fas fa-map-marker-alt"></i> ที่อยู่</span>
                <span className="detail-value">{shop.address}</span>
              </div>
            )}
            {shop.email && (
              <div className="detail-item">
                <span className="detail-label"><i className="fas fa-envelope"></i> อีเมล</span>
                <span className="detail-value">{shop.email}</span>
              </div>
            )}
            {shop.notes && (
              <div className="detail-item">
                <span className="detail-label"><i className="fas fa-sticky-note"></i> หมายเหตุ</span>
                <span className="detail-value">{shop.notes}</span>
              </div>
            )}
          </div>

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
                    <label className="form-label required">ประเภท</label>
                    <CustomSelect
                      value={newLicense.license_type_id}
                      onChange={(e) =>
                        setNewLicense((prev) => ({ ...prev, license_type_id: e.target.value }))
                      }
                      options={[{ value: "", label: "-- เลือกประเภท --" }, ...typeOptions]}
                      placeholder="เลือกประเภท"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">เลขที่ใบอนุญาต</label>
                    <input
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
                    <label className="form-label">วันที่ออก</label>
                    <DatePicker
                      value={newLicense.issue_date}
                      onChange={(e) =>
                        setNewLicense((prev) => ({ ...prev, issue_date: e.target.value }))
                      }
                      placeholder="เลือกวันที่ออก"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">วันหมดอายุ</label>
                    <DatePicker
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
                <small>คลิก "เพิ่มใบอนุญาต" เพื่อสร้างใบอนุญาตใหม่</small>
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
    </div>
  );
}
