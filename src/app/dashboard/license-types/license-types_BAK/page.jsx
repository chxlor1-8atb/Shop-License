"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { API_ENDPOINTS } from "@/constants";
import { showSuccess, showError, pendingDelete } from "@/utils/alerts";
// import EditableCell from '@/components/ui/EditableCell'; // REMOVED
import Modal from "@/components/ui/Modal";
// import TableSkeleton from '@/components/ui/TableSkeleton'; // Optional: keep or replace
import ExcelTable from "@/components/ExcelTable"; // New Component

// Constants
const INITIAL_FORM_DATA = {
  id: "",
  name: "",
  description: "",
  validity_days: 365,
};

const TABLE_COLUMNS = [
  { id: "name", name: "ชื่อประเภท", width: 250, align: "left" },
  { id: "description", name: "คำอธิบาย", width: 400, align: "left" },
  {
    id: "validity_days",
    name: "อายุ (วัน)",
    width: 150,
    align: "center",
    type: "number",
  },
  {
    id: "license_count",
    name: "ใบอนุญาต",
    width: 100,
    align: "center",
    readOnly: true,
  },
];

/**
 * LicenseTypesPage Component
 */
export default function LicenseTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  useEffect(() => {
    fetchTypes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_ENDPOINTS.LICENSE_TYPES}?t=${new Date().getTime()}`
      );
      const data = await response.json();
      if (data.success) {
        // Map API data to match column IDs if necessary
        // API keys: id, name, description, validity_days, license_count
        // Table Columns: name, description, validity_days, license_count
        // It matches perfectly.
        setTypes(data.types || []);
      }
    } catch (error) {
      console.error("Failed to fetch types:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Computed statistics
  const stats = useMemo(
    () => ({
      totalTypes: types.length,
      activeTypes: types.filter((t) => parseInt(t.license_count) > 0).length,
      totalLicenses: types.reduce(
        (acc, curr) => acc + parseInt(curr.license_count || 0),
        0
      ),
    }),
    [types]
  );

  // Handle updates from ExcelTable
  const handleRowUpdate = async (updatedRow) => {
    // Optimistic update locally?
    // ExcelTable already updated the UI. We just need to sync backend.
    // We probably should check what changed.

    // Find original row to see if anything actually changed?
    // updatedRow comes from ExcelTable state.

    // We only support updating existing rows here.
    // Newly added rows via ExcelTable (if support inline add) might have temp IDs like "id_..."
    // If it starts with "id_", it's a new row.

    // TODO: Handle inline ADD.
    // For now, let's assume update existing.

    if (updatedRow.id.toString().startsWith("id_")) {
      // Create new type
      if (!updatedRow.name) return; // Name is required

      const createData = {
        name: updatedRow.name,
        description: updatedRow.description || "",
        validity_days: updatedRow.validity_days || 365,
      };

      try {
        const response = await fetch(API_ENDPOINTS.LICENSE_TYPES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(createData),
        });
        const data = await response.json();

        if (data.success) {
          showSuccess("สร้างประเภทใบอนุญาตเรียบร้อย");
          // Fetch to get the real ID and sync custom hook
          fetchTypes();
        } else {
          showError(data.message);
        }
      } catch (error) {
        showError(error.message);
      }
      return;
    }

    const typeId = updatedRow.id;

    const updateData = {
      id: typeId,
      name: updatedRow.name,
      description: updatedRow.description || "",
      validity_days: updatedRow.validity_days || 365,
    };

    try {
      const response = await fetch(API_ENDPOINTS.LICENSE_TYPES, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message);
      }
      // Success - maybe update local state to ensure consistency?
      setTypes((prev) =>
        prev.map((t) => (t.id === typeId ? { ...t, ...updateData } : t))
      );
    } catch (error) {
      showError(error.message);
      // Revert changes? fetchTypes() to reset.
      fetchTypes();
    }
  };

  const handleRowDelete = (rowId) => {
    // Check constraints
    const type = types.find((t) => t.id === rowId);
    if (!type) return; // Might be temp row

    if (parseInt(type.license_count) > 0) {
      showError("ไม่สามารถลบได้เนื่องจากมีใบอนุญาตผูกอยู่");
      // Revert local state requires re-fetch or manual revert in ExcelTable
      // Since ExcelTable already deleted it from UI, we need to force reset it?
      // Or better: ExcelTable calls onDeleteRow, we perform check, if fail, we add it back.
      fetchTypes(); // Safest way to restore
      return;
    }

    // Perform Delete
    // pendingDelete is a SweetAlert confirmation.
    // But ExcelTable implementation allows immediate delete with undo?
    // Or just delete. The ExcelTable implementation in ExcelWeb didn't show confirmation in the component (TableRow just calls onDeleteRow).
    // We can use the pendingDelete here.

    // NOTE: ExcelTable Component ALREADY removed it from its internal state when we clicked trash.
    // So "pendingDelete" confirm dialog is awkward because the row is gone.
    // Better to modify ExcelTable to ask for confirmation OR optimistic delete.
    // Let's go with Optimistic Delete + Error recovery.

    deleteType(rowId);
  };

  const deleteType = async (id) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.LICENSE_TYPES}?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message);
      }
      // Success
      // Update stats
      setTypes((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      showError(error.message);
      fetchTypes(); // Restore
    }
  };

  const handleRowAdd = (newRow) => {
    // This is called when user clicks "add row" in ExcelTable or Context Menu.
    // It creates a temp row in ExcelTable.
    // We don't save to backend yet until they enter data.
    // So we just track it.
  };

  // Modal Form (Legacy) - keeping for "Add Type" button in header if needed?
  // User wants "Card" to use Excel system.
  // The Excel system HAS "Add Row" functionality.

  return (
    <>
      {/* Stats Cards */}
      <StatsSection stats={stats} />

      {!loading ? (
        <ExcelTable
          initialColumns={TABLE_COLUMNS}
          initialRows={types}
          onRowUpdate={handleRowUpdate}
          onRowDelete={handleRowDelete}
          onRowAdd={handleRowAdd}
        />
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: "2rem", textAlign: "center" }}>
            Loading...
          </div>
        </div>
      )}

      {/* Modal - keeping it available code-wise but maybe unused if fully Excel-like */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="เพิ่มประเภทใหม่"
      >
        <TypeForm
          formData={formData}
          onChange={setFormData}
          onSubmit={(e) => {
            /* Reuse existing submit logic */
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>
    </>
  );
}

/**
 * StatsSection Component
 */
function StatsSection({ stats }) {
  return (
    <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
      <div className="stat-card">
        <div className="stat-icon primary">
          <i className="fas fa-tags"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalTypes}</div>
          <div className="stat-label">ประเภททั้งหมด</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon success">
          <i className="fas fa-check-circle"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.activeTypes}</div>
          <div className="stat-label">ประเภทที่ใช้งาน</div>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon info">
          <i className="fas fa-file-alt"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalLicenses}</div>
          <div className="stat-label">ใบอนุญาตที่ผูก</div>
        </div>
      </div>
    </div>
  );
}

/**
 * TypeForm Component (Legacy/Fallback)
 */
function TypeForm({ formData, onChange, onSubmit, onCancel }) {
  // ... kept for reference or backup
  return null;
}
