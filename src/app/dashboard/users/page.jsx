"use client";

import { useState, useEffect, useCallback } from "react";
import { usePagination } from "@/hooks";
import { API_ENDPOINTS, ROLE_OPTIONS } from "@/constants";
import { formatThaiDateTime } from "@/utils/formatters";
import { showSuccess, showError, pendingDelete } from "@/utils/alerts";
// Lazy load PDF exports to reduce initial bundle size
const exportUsersToPDF = async (...args) => {
  const { exportUsersToPDF: exportFn } = await import("@/lib/pdfExport");
  return exportFn(...args);
};
const exportUserCredentialsPDF = async (...args) => {
  const { exportUserCredentialsPDF: exportFn } = await import("@/lib/pdfExport");
  return exportFn(...args);
};
import Swal from "sweetalert2";
import dynamic from "next/dynamic";


// Lazy load heavy ExcelTable component
const ExcelTable = dynamic(() => import("@/components/ExcelTable"), {
  ssr: false,
  loading: () => <TableSkeleton rows={5} columns={[{ width: "20%" }, { width: "25%" }, { width: "15%" }, { width: "20%" }]} />,
});

// UI Components
import CustomSelect from "@/components/ui/CustomSelect";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";

// Constants
const INITIAL_FORM_DATA = {
  id: "",
  username: "",
  full_name: "",
  password: "",
  role: "user",
};

const USER_COLUMNS = [
  { id: "username", name: "ชื่อผู้ใช้", width: 150, align: "center", readOnly: true },
  { id: "full_name", name: "ชื่อ-นามสกุล", width: 250, align: "left" },
  { 
    id: "role", 
    name: "บทบาท", 
    width: 150, 
    align: "center", 
    type: "select", 
    options: ROLE_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
    isBadge: true 
  },
  { id: "formatted_created_at", name: "วันที่สร้าง", width: 200, align: "center", readOnly: true },
];

/**
 * UsersPage Component
 */
export default function UsersPage() {
  const pagination = usePagination(10);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    totalRegularUsers: 0
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, pagination.limit]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
      });

      const response = await fetch(`${API_ENDPOINTS.USERS}?${params}`);
      const data = await response.json();

      if (data.success) {
        // Pre-format data for ExcelTable
        const formattedUsers = (data.users || []).map(u => ({
          ...u,
          formatted_created_at: formatThaiDateTime(u.created_at)
        }));
        
        setUsers(formattedUsers);
        pagination.updateFromResponse(data.pagination);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  const handleRowUpdate = async (updatedRow) => {
    const user = users.find((u) => u.id === updatedRow.id);
    if (!user) return;

    // Detect what changed or just send everything that is editable
    const updateData = {
      id: updatedRow.id,
      username: updatedRow.username, // Should match original
      full_name: updatedRow.full_name || "",
      role: updatedRow.role,
      // password is not updated here
    };

    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();

      if (data.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === updatedRow.id ? { ...u, ...updatedRow } : u))
        );
      } else {
        // Revert on failure
        fetchUsers();
        throw new Error(data.message);
      }
    } catch (error) {
      showError(error.message);
      fetchUsers();
    }
  };

  const handleDelete = async (id) => {
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) return;

    // Optimistic update
    setUsers((prev) => prev.filter((u) => u.id !== id));

    pendingDelete({
      itemName: `ผู้ใช้ "${userToDelete.full_name || userToDelete.username}"`,
      duration: 5000,
      onDelete: async () => {
        try {
          const response = await fetch(`${API_ENDPOINTS.USERS}?id=${id}`, {
            method: "DELETE",
          });
          const data = await response.json();

          if (data.success) {
            showSuccess("ลบผู้ใช้งานสำเร็จ");
            fetchUsers(); // Refresh to ensure stats are correct
          } else {
            setUsers((prev) => [...prev, userToDelete]);
            showError(data.message);
          }
        } catch (error) {
          setUsers((prev) => [...prev, userToDelete]);
          showError(error.message);
        }
      },
      onCancel: () => {
        setUsers((prev) => {
          if (prev.find((u) => u.id === id)) return prev;
          return [...prev, userToDelete].sort((a, b) => a.id - b.id);
        });
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submittedData = { ...formData }; 

    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        showSuccess(data.message);
        fetchUsers();

        Swal.fire({
          title: "สร้างผู้ใช้สำเร็จ",
          text: "ต้องการดาวน์โหลดเอกสารแจ้งรหัสผ่าน (PDF) หรือไม่?",
          icon: "success",
          showCancelButton: true,
          confirmButtonText: "ดาวน์โหลด PDF",
          cancelButtonText: "ปิด",
          reverseButtons: true,
          confirmButtonColor: "#3b82f6",
          cancelButtonColor: "#64748b",
        }).then((result) => {
          if (result.isConfirmed) {
            exportUserCredentialsPDF({
              ...submittedData,
              role: submittedData.role || "user",
            });
          }
        });
      } else {
        showError(data.message);
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const handleExportList = () => {
    exportUsersToPDF(users);
  };

  const openModal = () => {
    setFormData(INITIAL_FORM_DATA);
    setShowModal(true);
  };

  return (
    <>
      <StatsSection stats={stats} />
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-users"></i> รายการผู้ใช้งาน
            <span style={{ 
              fontSize: '0.85rem', 
              color: 'var(--text-muted)', 
              fontWeight: 'normal', 
              marginLeft: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <i className="fas fa-lightbulb" style={{ 
                color: '#f59e0b',
                background: 'none',
                boxShadow: 'none',
                width: 'auto',
                height: 'auto',
                padding: 0,
                borderRadius: 0 
              }}></i>
              คลิก 2 ครั้งที่ข้อมูลเพื่อแก้ไขได้ทันที
            </span>
          </h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExportList}
            >
              <i className="fas fa-file-pdf"></i> Export PDF
            </button>
            <button className="btn btn-primary btn-sm" onClick={openModal}>
              <i className="fas fa-plus"></i> เพิ่มผู้ใช้
            </button>
          </div>
        </div>

        <div className="card-body">
          {!loading ? (
             <div style={{ overflow: "auto", maxHeight: "600px" }}>
              <ExcelTable
                initialColumns={USER_COLUMNS}
                initialRows={users}
                onRowUpdate={handleRowUpdate}
                onRowDelete={handleDelete}
                // No column add/delete for this view
              />
            </div>
          ) : (
            <div className="table-card">
              <div className="table-container">
                 <TableSkeleton rows={5} columns={[{ width: "20%" }, { width: "25%" }, { width: "15%" }, { width: "20%" }]} />
              </div>
            </div>
          )}

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
        title="เพิ่มผู้ใช้ใหม่"
      >
        <UserForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </>
  );
}

/**
 * UserForm Component
 */
function UserForm({ formData, onChange, onSubmit, onCancel }) {
  const handleChange = (e) => {
    onChange({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <form onSubmit={onSubmit}>
      <div className="form-group">
        <label htmlFor="form-username">ชื่อผู้ใช้ *</label>
        <input
          id="form-username"
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="form-fullname">ชื่อ-นามสกุล *</label>
        <input
          id="form-fullname"
          type="text"
          name="full_name"
          value={formData.full_name}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="form-password">รหัสผ่าน *</label>
        <input
          id="form-password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="form-role">บทบาท *</label>
        <CustomSelect
          id="form-role"
          name="role"
          value={formData.role}
          onChange={handleChange}
          options={ROLE_OPTIONS}
          placeholder="เลือกบทบาท"
        />
      </div>
      <div
        className="modal-footer"
        style={{
          marginTop: "1.5rem",
          display: "flex",
          justifyContent: "flex-end",
          gap: "0.5rem",
        }}
      >
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

/**
 * StatsSection Component
 */
function StatsSection({ stats }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon primary">
          <i className="fas fa-users"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalUsers || 0}</div>
          <div className="stat-label">ผู้ใช้ทั้งหมด</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon success">
            <i className="fas fa-user-shield"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalAdmins || 0}</div>
          <div className="stat-label">ผู้ดูแลระบบ</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon info">
            <i className="fas fa-user"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalRegularUsers || 0}</div>
          <div className="stat-label">ผู้ใช้ทั่วไป</div>
        </div>
      </div>
    </div>
  );
}
