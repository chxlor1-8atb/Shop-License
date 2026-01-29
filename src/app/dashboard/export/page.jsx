"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import CustomSelect from "@/components/ui/CustomSelect";
import DatePicker from "@/components/ui/DatePicker";

export default function ExportPage() {
  const [type, setType] = useState("licenses");
  const [format, setFormat] = useState("csv");
  const [typesList, setTypesList] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  // Custom Fields Selection
  const [customFields, setCustomFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);

  // License filters
  const [licenseType, setLicenseType] = useState("");
  const [status, setStatus] = useState("");
  const [expiryFrom, setExpiryFrom] = useState("");
  const [expiryTo, setExpiryTo] = useState("");

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
      const res = await fetch("/api/license-types");
      const data = await res.json();
      if (data.success) {
        setTypesList(data.types || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportCSV = () => {
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
    }

    const url = `/api/export?${params.toString()}`;
    
    // Create hidden link to force download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `export_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      title: "กำลังดาวน์โหลด...",
      text: "ไฟล์ CSV กำลังถูกสร้างและดาวน์โหลด",
      icon: "success",
      timer: 2000,
      showConfirmButton: false,
    });
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

            {/* Column Selection */}
            {customFields.length > 0 && (
              <div className="form-group" style={{ marginTop: "1.5rem" }}>
                 <label style={{ fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                    เลือกคอลัมน์ที่ต้องการแสดง (Custom Fields)
                 </label>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                    {customFields.map(field => (
                        <label key={field.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '4px', background: 'var(--white)' }}>
                            <input 
                                type="checkbox"
                                checked={selectedFields.includes(field.field_name)}
                                onChange={() => handleToggleField(field.field_name)}
                            />
                            <span style={{ fontSize: '0.9rem' }}>{field.field_label}</span>
                        </label>
                    ))}
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

            {/* Export Button */}
            <div className="form-actions" style={{ marginTop: "2rem" }}>
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
    </div>
  );
}
