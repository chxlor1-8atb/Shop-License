"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";
import { SearchInput } from "@/components/ui/FilterRow";

export default function ExportPage() {
  const [type, setType] = useState("licenses");
  const [format, setFormat] = useState("csv");
  const [typesList, setTypesList] = useState([]);
  const [shopOptions, setShopOptions] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Custom Fields Selection
  const [customFields, setCustomFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);

  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [previewCount, setPreviewCount] = useState(0);

  // License filters
  const [licenseType, setLicenseType] = useState("");
  const [status, setStatus] = useState("");
  const [expiryFrom, setExpiryFrom] = useState("");
  const [expiryTo, setExpiryTo] = useState("");
  const [search, setSearch] = useState("");
  const [filterShop, setFilterShop] = useState("");

  useEffect(() => {
    loadDropdowns();
  }, []);

  // Fetch custom fields when type changes
  useEffect(() => {
    if (type === 'licenses' || type === 'shops') {
        fetchCustomFields(type);
    } else {
        setCustomFields([]);
        setSelectedFields([]);
    }
  }, [type]);

  const fetchCustomFields = async (entityType) => {
      try {
          const res = await fetch(`/api/custom-fields?entity_type=${entityType}`);
          const data = await res.json();
          if (data.success) {
              const fields = data.fields || [];
              setCustomFields(fields);
              // Default select all
              setSelectedFields(fields.map(f => f.field_name));
          }
      } catch (e) {
          console.error("Error fetching custom fields:", e);
      }
  };

  const handleToggleField = (fieldName) => {
      if (selectedFields.includes(fieldName)) {
          setSelectedFields(selectedFields.filter(f => f !== fieldName));
      } else {
          setSelectedFields([...selectedFields, fieldName]);
      }
  };

  const loadDropdowns = async () => {
    try {
      const [typeRes, shopRes] = await Promise.all([
        fetch("/api/license-types"),
        fetch("/api/shops?limit=1000")
      ]);
      
      const typeData = await typeRes.json();
      if (typeData.success) {
        setTypesList(typeData.types || []);
      }

      const shopData = await shopRes.json();
      if (shopData.success) {
        setShopOptions((shopData.shops || []).map(s => ({ value: s.id, label: s.shop_name })));
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Helper function to build params
  const buildParams = () => {
    const params = new URLSearchParams();
    params.append("type", type);
    
    if (selectedFields.length > 0) {
      params.append("fields", selectedFields.join(','));
    }

    if (type === "licenses") {
      if (licenseType) params.append("license_type", licenseType);
      if (status) params.append("status", status);
      if (expiryFrom) params.append("expiry_from", expiryFrom);
      if (expiryTo) params.append("expiry_to", expiryTo);
      if (search) params.append("search", search);
      if (filterShop) params.append("shop_id", filterShop);
    }
    return params;
  };

  // Handle Preview
  const handlePreview = async () => {
    setPreviewLoading(true);
    setShowPreview(true);

    try {
      const params = buildParams();
      params.append("limit", "50"); // Preview first 50 rows

      const response = await fetch(`/api/export-preview?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setPreviewData(result.data);
        setPreviewColumns(result.columns);
        setTotalCount(result.totalCount);
        setPreviewCount(result.previewCount);
      } else {
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: result.message || "ไม่สามารถโหลดข้อมูลตัวอย่างได้",
          icon: "error"
        });
        setShowPreview(false);
      }
    } catch (error) {
      console.error('Preview Error:', error);
      Swal.fire({
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถโหลดข้อมูลตัวอย่างได้",
        icon: "error"
      });
      setShowPreview(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);

    const params = new URLSearchParams();
    params.append("type", type);
    params.append("format", "csv");
    
    // Append selected fields
    if (selectedFields.length > 0) {
        params.append("fields", selectedFields.join(','));
    }

    if (type === "licenses") {
      if (licenseType) params.append("license_type", licenseType);
      if (status) params.append("status", status);
      if (expiryFrom) params.append("expiry_from", expiryFrom);
      if (expiryTo) params.append("expiry_to", expiryTo);
      if (search) params.append("search", search);
      if (filterShop) params.append("shop_id", filterShop);
    }

    const url = `/api/export?${params.toString()}`;
    const filename = `export_${type}_${new Date().toISOString().split('T')[0]}.csv`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Export failed');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        Swal.fire({
            title: "สำเร็จ!",
            text: "ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
        });
    } catch (error) {
        console.error('CSV Export Error:', error);
        Swal.fire({
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถส่งออกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
            icon: "error"
        });
    } finally {
        setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true); // Start loading state
    
    const params = new URLSearchParams();
    params.append("type", type);
    params.append("format", "pdf");

    // Append selected fields
    if (selectedFields.length > 0) {
        params.append("fields", selectedFields.join(','));
    }

    if (type === "licenses") {
      if (licenseType) params.append("license_type", licenseType);
      if (status) params.append("status", status);
      if (expiryFrom) params.append("expiry_from", expiryFrom);
      if (expiryTo) params.append("expiry_to", expiryTo);
      if (search) params.append("search", search);
      if (filterShop) params.append("shop_id", filterShop);
    }

    const url = `/api/export?${params.toString()}`;
    const filename = `export_${type}_${new Date().toISOString().split('T')[0]}.pdf`;

    try {
        Swal.fire({
            title: "กำลังสร้างไฟล์ PDF...",
            text: "กรุณารอสักครู่ ระบบกำลังประมวลผล",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Export failed');
        }

        const blob = await response.blob();
        
        // Force PDF type to ensure browser handles it correctly
        const pdfBlob = new Blob([blob], { type: 'application/pdf' });
        const downloadUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);

        Swal.fire({
            title: "สำเร็จ!",
            text: "ดาวน์โหลดไฟล์เรียบร้อยแล้ว",
            icon: "success",
            timer: 2000,
            showConfirmButton: false,
        });

    } catch (error) {
        console.error('Export Error:', error);
        Swal.fire({
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถส่งออกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
            icon: "error"
        });
    } finally {
        setIsExporting(false); // Stop loading state
    }
  };

  const handleExport = () => {
    if (format === "csv") {
      handleExportCSV();
    } else {
      handleExportPDF();
    }
  };

  return (
    <div className="content-container">
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-file-export"></i> ส่งออกข้อมูล
          </h3>
        </div>
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleExport();
            }}
          >
            {/* Data Type Selection */}
            <div className="form-group">
              <label>เลือกประเภทข้อมูล *</label>
              <CustomSelect
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[
                  { value: "licenses", label: "ใบอนุญาต" },
                  { value: "shops", label: "ร้านค้า" },
                  { value: "users", label: "ผู้ใช้งาน" },
                ]}
                placeholder="เลือกประเภทข้อมูล"
              />
            </div>

            {/* Format Selection */}
            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label>รูปแบบไฟล์ *</label>
              <div
                style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}
              >
                <label
                  className={`export-format-option ${
                    format === "csv" ? "active" : ""
                  }`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "1rem 1.5rem",
                    border:
                      format === "csv"
                        ? "2px solid var(--primary)"
                        : "2px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    background:
                      format === "csv"
                        ? "rgba(99, 102, 241, 0.1)"
                        : "var(--bg-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === "csv"}
                    onChange={(e) => setFormat(e.target.value)}
                    style={{ display: "none" }}
                  />
                  <i
                    className="fas fa-file-csv"
                    style={{
                      fontSize: "1.5rem",
                      color:
                        format === "csv" ? "var(--primary)" : "var(--success)",
                    }}
                  ></i>
                  <div>
                    <div style={{ fontWeight: 600 }}>CSV</div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      สำหรับ Excel
                    </div>
                  </div>
                </label>

                <label
                  className={`export-format-option ${
                    format === "pdf" ? "active" : ""
                  }`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "1rem 1.5rem",
                    border:
                      format === "pdf"
                        ? "2px solid var(--primary)"
                        : "2px solid var(--border-color)",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    background:
                      format === "pdf"
                        ? "rgba(99, 102, 241, 0.1)"
                        : "var(--bg-secondary)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={format === "pdf"}
                    onChange={(e) => setFormat(e.target.value)}
                    style={{ display: "none" }}
                  />
                  <i
                    className="fas fa-file-pdf"
                    style={{
                      fontSize: "1.5rem",
                      color:
                        format === "pdf" ? "var(--primary)" : "var(--danger)",
                    }}
                  ></i>
                  <div>
                    <div style={{ fontWeight: 600 }}>PDF</div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      รายงานสวยงาม
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Column Selection (Minimal Design) */}
            {customFields.length > 0 && (
              <div className="form-group" style={{ 
                  marginTop: "1.5rem", 
                  padding: "1.25rem", 
                  background: "var(--bg-secondary)", 
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)"
              }}>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <label style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <i className="fas fa-sliders-h" style={{ color: 'var(--primary)', fontSize: '0.9rem' }}></i>
                        ปรับแต่งคอลัมน์ (Custom Fields)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.05)', padding: '2px 8px', borderRadius: '10px' }}>
                        แสดง {selectedFields.length}/{customFields.length}
                    </span>
                 </div>
                 
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {customFields.map(field => {
                        const isSelected = selectedFields.includes(field.field_name);
                        return (
                            <div 
                                key={field.id}
                                onClick={() => handleToggleField(field.field_name)}
                                style={{
                                    padding: '0.4rem 0.85rem',
                                    borderRadius: '50px',
                                    border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.1)' : 'var(--white)',
                                    color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontWeight: isSelected ? 500 : 400,
                                    userSelect: 'none',
                                    boxShadow: isSelected ? '0 2px 4px rgba(99, 102, 241, 0.1)' : '0 1px 2px rgba(0,0,0,0.03)'
                                }}
                            >
                                <div style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    border: isSelected ? 'none' : '1px solid #cbd5e1',
                                    background: isSelected ? 'var(--primary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    {isSelected && <i className="fas fa-check" style={{ fontSize: '8px', color: 'white' }}></i>}
                                </div>
                                {field.field_label}
                            </div>
                        );
                    })}
                 </div>
                 <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <i className="fas fa-info-circle" style={{ marginRight: '4px' }}></i>
                    คลิกเพื่อแสดง/ซ่อนข้อมูลในไฟล์ PDF และ CSV
                 </div>
              </div>
            )}

            {/* License Filters */}
            {type === "licenses" && (
              <div
                className="form-group"
                style={{
                  marginTop: "1.5rem",
                  padding: "1rem",
                  background: "var(--bg-secondary)",
                  borderRadius: "0.5rem",
                }}
              >
                <label
                  style={{
                    marginBottom: "1rem",
                    display: "block",
                    fontWeight: 600,
                  }}
                >
                  ตัวกรองข้อมูล (ใบอนุญาต)
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      ค้นหา
                    </label>
                    <SearchInput
                      value={search}
                      onChange={setSearch}
                      placeholder="ระบุคำค้นหา..."
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      ร้านค้า
                    </label>
                     <CustomSelect
                      value={filterShop}
                      onChange={(e) => setFilterShop(e.target.value)}
                      options={[{ value: "", label: "ทุกร้านค้า" }, ...shopOptions]}
                      placeholder="เลือกร้านค้า..."
                      searchable={true}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      ประเภทใบอนุญาต
                    </label>
                    <CustomSelect
                      value={licenseType}
                      onChange={(e) => setLicenseType(e.target.value)}
                      options={[
                        { value: "", label: "ทั้งหมด" },
                        ...typesList.map((t) => ({
                          value: t.id,
                          label: t.name,
                        })),
                      ]}
                      placeholder="ทั้งหมด"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      สถานะ
                    </label>
                    <CustomSelect
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      options={[
                        { value: "", label: "ทั้งหมด" },
                        { value: "active", label: "ปกติ" },
                        { value: "expired", label: "หมดอายุ" },
                        { value: "pending", label: "กำลังดำเนินการ" },
                        { value: "suspended", label: "ถูกพักใช้" },
                        { value: "revoked", label: "ถูกเพิกถอน" },
                      ]}
                      placeholder="ทั้งหมด"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      หมดอายุจาก
                    </label>
                    <DatePicker
                      value={expiryFrom}
                      onChange={(e) => setExpiryFrom(e.target.value)}
                      placeholder="เลือกวันที่"
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "0.875rem",
                        marginBottom: "0.5rem",
                        display: "block",
                      }}
                    >
                      หมดอายุถึง
                    </label>
                    <DatePicker
                      value={expiryTo}
                      onChange={(e) => setExpiryTo(e.target.value)}
                      placeholder="เลือกวันที่"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="form-actions" style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {/* Preview Button */}
              <button
                type="button"
                onClick={handlePreview}
                className="btn btn-outline"
                disabled={previewLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  border: "2px solid var(--primary)",
                  background: "transparent",
                  color: "var(--primary)",
                  borderRadius: "8px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                {previewLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    กำลังโหลด...
                  </>
                ) : (
                  <>
                    <i className="fas fa-eye"></i>
                    ดูตัวอย่างก่อนส่งออก
                  </>
                )}
              </button>

              {/* Export Button */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isExporting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                }}
              >
                {isExporting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    กำลังสร้างไฟล์...
                  </>
                ) : (
                  <>
                    <i
                      className={
                        format === "csv" ? "fas fa-file-csv" : "fas fa-file-pdf"
                      }
                    ></i>
                    ส่งออกเป็น {format.toUpperCase()}
                  </>
                )}
              </button>
            </div>

            {/* Tips Section */}
            <div
              className="export-tips"
              style={{
                marginTop: "1.5rem",
                padding: "0.75rem 1rem",
                background: "rgba(0, 0, 0, 0.02)",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  marginBottom: "0.5rem",
                }}
              >
                <i
                  className="fas fa-info-circle"
                  style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}
                ></i>
                <span
                  style={{
                    fontWeight: 500,
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                  }}
                >
                  คำแนะนำ
                </span>
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "1rem",
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  lineHeight: "1.5",
                }}
              >
                <li>
                  ไฟล์ CSV สามารถเปิดด้วย Microsoft Excel หรือ Google Sheets
                </li>
                <li>ไฟล์ PDF เหมาะสำหรับพิมพ์หรือส่งเป็นรายงานทางการ</li>
                <li>ข้อมูลจะถูกส่งออกตามตัวกรองที่เลือก</li>
              </ul>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div 
          className="preview-modal-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
            animation: "fadeIn 0.2s ease"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreview(false);
          }}
        >
          <div 
            className="preview-modal"
            style={{
              background: "var(--bg-primary)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "95vw",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "slideUp 0.3s ease"
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-secondary)",
              borderRadius: "16px 16px 0 0"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, var(--primary), var(--primary-dark))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white"
                }}>
                  <i className="fas fa-eye" style={{ fontSize: "1.25rem" }}></i>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    ดูตัวอย่างข้อมูลก่อนส่งออก
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    {type === "licenses" ? "ใบอนุญาต" : type === "shops" ? "ร้านค้า" : "ผู้ใช้งาน"} • 
                    แสดง {previewCount} จาก {totalCount} รายการ
                    {totalCount > 50 && <span style={{ color: "var(--warning)" }}> (แสดงตัวอย่าง 50 รายการแรก)</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--bg-secondary)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease"
                }}
              >
                <i className="fas fa-times" style={{ fontSize: "1.1rem" }}></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              flex: 1,
              overflow: "auto",
              padding: "1rem",
              background: "var(--bg-primary)"
            }}>
              {previewLoading ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4rem",
                  color: "var(--text-muted)"
                }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem", marginBottom: "1rem", color: "var(--primary)" }}></i>
                  <p style={{ margin: 0 }}>กำลังโหลดข้อมูลตัวอย่าง...</p>
                </div>
              ) : previewData.length === 0 ? (
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4rem",
                  color: "var(--text-muted)"
                }}>
                  <i className="fas fa-inbox" style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }}></i>
                  <p style={{ margin: 0, fontSize: "1.1rem" }}>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
                  <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>ลองปรับตัวกรองใหม่อีกครั้ง</p>
                </div>
              ) : (
                <div style={{ 
                  overflowX: "auto",
                  border: "1px solid var(--border-color)",
                  borderRadius: "12px"
                }}>
                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.85rem"
                  }}>
                    <thead>
                      <tr style={{ background: "var(--bg-secondary)" }}>
                        <th style={{
                          padding: "0.75rem 1rem",
                          textAlign: "center",
                          borderBottom: "2px solid var(--border-color)",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          width: "50px"
                        }}>
                          #
                        </th>
                        {previewColumns.map((col, idx) => (
                          <th key={idx} style={{
                            padding: "0.75rem 1rem",
                            textAlign: "left",
                            borderBottom: "2px solid var(--border-color)",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap"
                          }}>
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, rowIdx) => (
                        <tr 
                          key={rowIdx}
                          style={{
                            background: rowIdx % 2 === 0 ? "var(--bg-primary)" : "var(--bg-secondary)",
                            transition: "background 0.15s ease"
                          }}
                        >
                          <td style={{
                            padding: "0.65rem 1rem",
                            borderBottom: "1px solid var(--border-color)",
                            textAlign: "center",
                            color: "var(--text-muted)",
                            fontWeight: 500
                          }}>
                            {rowIdx + 1}
                          </td>
                          {previewColumns.map((col, colIdx) => {
                            let value = row[col.dataKey];
                            
                            // Handle custom fields
                            if (value === undefined && row.custom_fields) {
                              value = row.custom_fields[col.key] || row.custom_fields[col.dataKey];
                            }
                            
                            // Format status
                            if (col.dataKey === 'status') {
                              const statusMap = {
                                'active': { label: 'ปกติ', color: 'var(--success)' },
                                'expired': { label: 'หมดอายุ', color: 'var(--danger)' },
                                'pending': { label: 'กำลังดำเนินการ', color: 'var(--warning)' },
                                'suspended': { label: 'ถูกพักใช้', color: 'var(--warning)' },
                                'revoked': { label: 'ถูกเพิกถอน', color: 'var(--danger)' }
                              };
                              const statusInfo = statusMap[value?.toLowerCase()] || { label: value, color: 'var(--text-muted)' };
                              return (
                                <td key={colIdx} style={{
                                  padding: "0.65rem 1rem",
                                  borderBottom: "1px solid var(--border-color)"
                                }}>
                                  <span style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    padding: "0.25rem 0.6rem",
                                    borderRadius: "20px",
                                    background: `${statusInfo.color}15`,
                                    color: statusInfo.color,
                                    fontSize: "0.75rem",
                                    fontWeight: 500
                                  }}>
                                    <span style={{
                                      width: "6px",
                                      height: "6px",
                                      borderRadius: "50%",
                                      background: statusInfo.color
                                    }}></span>
                                    {statusInfo.label}
                                  </span>
                                </td>
                              );
                            }
                            
                            // Format role
                            if (col.dataKey === 'role') {
                              value = value === 'admin' ? 'แอดมิน' : 'ผู้ใช้ทั่วไป';
                            }

                            // Format dates
                            if ((col.dataKey === 'issue_date' || col.dataKey === 'expiry_date' || col.dataKey === 'created_at') && value) {
                              try {
                                value = new Date(value).toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                });
                              } catch (e) {}
                            }

                            return (
                              <td key={colIdx} style={{
                                padding: "0.65rem 1rem",
                                borderBottom: "1px solid var(--border-color)",
                                color: "var(--text-primary)",
                                maxWidth: "250px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}>
                                {value ?? '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-secondary)",
              borderRadius: "0 0 16px 16px",
              flexWrap: "wrap",
              gap: "1rem"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "0.5rem",
                color: "var(--text-muted)",
                fontSize: "0.85rem"
              }}>
                <i className="fas fa-info-circle"></i>
                {totalCount > 50 
                  ? `ไฟล์ที่ส่งออกจะมีข้อมูลครบทั้ง ${totalCount} รายการ`
                  : `จะส่งออกข้อมูลทั้งหมด ${totalCount} รายการ`
                }
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setShowPreview(false)}
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-primary)",
                    color: "var(--text-primary)",
                    cursor: "pointer",
                    fontWeight: 500,
                    transition: "all 0.2s ease"
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    handleExport();
                  }}
                  disabled={isExporting || previewData.length === 0}
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, var(--primary), var(--primary-dark, var(--primary)))",
                    color: "white",
                    cursor: previewData.length === 0 ? "not-allowed" : "pointer",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s ease",
                    opacity: previewData.length === 0 ? 0.5 : 1
                  }}
                >
                  <i className={format === "csv" ? "fas fa-file-csv" : "fas fa-file-pdf"}></i>
                  ยืนยันส่งออก {format.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Animation Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.98); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
      `}</style>
    </div>
  );
}
