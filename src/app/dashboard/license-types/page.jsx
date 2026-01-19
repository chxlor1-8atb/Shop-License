"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { API_ENDPOINTS } from "@/constants";
import { showSuccess, showError } from "@/utils/alerts";
import TableSkeleton from "@/components/ui/TableSkeleton";

// Lazy load heavy ExcelTable component
const ExcelTable = dynamic(() => import("@/components/ExcelTable"), {
  ssr: false,
  loading: () => (
    <div className="table-card">
      <div className="table-container">
        <table className="excel-table">
          <thead>
            <tr>
              {["ชื่อประเภท", "คำอธิบาย", "อายุ (วัน)", "ใบอนุญาต"].map((h, i) => (
                <th key={i}><div className="th-content">{h}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableSkeleton rows={5} columns={[
              { width: "80%" },
              { width: "90%" },
              { width: "50%", center: true },
              { width: "40%", center: true },
            ]} />
          </tbody>
        </table>
      </div>
    </div>
  ),
});

// Constants
const STANDARD_COLUMNS = [
  { id: "name", name: "ชื่อประเภท", width: 250, align: "left" },
// Price column removed as requested
  { id: "description", name: "ข้อมูลอื่นๆ", width: 420, align: "left" },
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
  const [columns, setColumns] = useState(STANDARD_COLUMNS);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      
      // Parallel fetch all data at once - significantly faster than sequential
      const [typesRes, fieldsRes, valuesRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.LICENSE_TYPES}?t=${timestamp}`),
        fetch(`/api/custom-fields?entity_type=license_types&t=${timestamp}`),
        fetch(`/api/custom-field-values?entity_type=license_types&t=${timestamp}`)
      ]);
      
      const [typesData, fieldsData, valuesData] = await Promise.all([
        typesRes.json(),
        fieldsRes.json(),
        valuesRes.json()
      ]);

      let mergedTypes = [];
      if (typesData.success) {
        const rawTypes = typesData.types || [];
        const values = valuesData.success ? valuesData.values : [];

        // Group values by entity_id
        const valuesByEntity = {};
        values.forEach((v) => {
          if (!valuesByEntity[v.entity_id]) valuesByEntity[v.entity_id] = {};
          valuesByEntity[v.entity_id][v.field_name] = v.value;
        });

        // Merge
        mergedTypes = rawTypes.map((t) => ({
          ...t,
          ...(valuesByEntity[t.id] || {}),
        }));

        setTypes(mergedTypes);
      }

      if (fieldsData.success) {
        const fields = fieldsData.fields || [];
        setCustomFields(fields);

        // Refactored: Prioritize STANDARD_COLUMNS order, then append Custom Columns
        const dbColsMap = new Map();
        fields.forEach((f) => {
          dbColsMap.set(f.field_name, {
            id: f.field_name,
            name: f.field_label,
            type: f.field_type || "text",
            isCustom: !f.is_system_field,
            isSystem: f.is_system_field,
            db_id: f.id,
            display_order: f.display_order || 0,
          });
        });

        // 1. Build columns based on STANDARD_COLUMNS order
        const finalCols = STANDARD_COLUMNS.map((sc) => {
          const dbCol = dbColsMap.get(sc.id);
          if (dbCol) {
            // Merge DB info
            return {
              ...sc,
              name: dbCol.name,
              db_id: dbCol.db_id,
              isSystem: dbCol.isSystem,
            };
          }
          return sc;
        });

        // 2. Add remaining custom fields
        const customCols = [];
        dbColsMap.forEach((col, key) => {
          if (!STANDARD_COLUMNS.find((sc) => sc.id === key)) {
            customCols.push({
              ...col,
              width: 150,
              align: "left",
            });
          }
        });

        // Sort custom cols by display_order
        customCols.sort((a, b) => a.display_order - b.display_order);

        setColumns([...finalCols, ...customCols]);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showError("โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
    }
  }, []);

  // Computed statistics
  const stats = useMemo(
    () => ({
      totalTypes: types.length,
      activeTypes: types.filter((t) => parseInt(t.license_count || 0) > 0)
        .length,
      totalLicenses: types.reduce(
        (acc, curr) => acc + parseInt(curr.license_count || 0),
        0
      ),
    }),
    [types]
  );

  // --- Column Handlers ---

  const handleColumnAdd = async (newCol) => {
    // Generate a field name based on timestamp to ensure uniqueness
    const fieldName = `cf_${Date.now()}`;

    // Calculate next display order
    const maxOrder = Math.max(...columns.map((c, i) => i), 0) + 1;

    // Default values for new column
    const payload = {
      entity_type: "license_types",
      field_name: fieldName,
      field_label: "คอลัมน์ใหม่",
      field_type: "text",
      show_in_table: true,
      show_in_form: true,
      display_order: maxOrder,
    };

    try {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showSuccess("เพิ่มคอลัมน์เรียบร้อย");
        fetchData(); // Reload to sync with DB
      } else {
        showError(data.message);
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const handleColumnUpdate = async (updatedCol) => {
    // Find the column to get its db_id
    const col = columns.find((c) => c.id === updatedCol.id);

    // If it doesn't have a DB ID, we can't update it in DB
    if (!col || !col.db_id) {
      return;
    }

    const payload = {
      id: col.db_id, // Use the stored DB ID
      field_label: updatedCol.name !== undefined ? updatedCol.name : col.name,
      field_type: updatedCol.type !== undefined ? updatedCol.type : col.type,
    };

    try {
      const res = await fetch("/api/custom-fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        showError(data.message);
        fetchData(); // Revert on failure
      } else {
        // Success: Update local state to reflect change permanently
        setColumns((prev) =>
          prev.map((c) =>
            c.id === updatedCol.id ? { ...c, ...updatedCol } : c
          )
        );
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const handleColumnDelete = async (colId) => {
    const col = columns.find((c) => c.id === colId);

    // Prevent deleting system columns
    if (
      !col ||
      col.isSystem ||
      STANDARD_COLUMNS.some((sc) => sc.id === col.id)
    ) {
      showError("ไม่สามารถลบคอลัมน์ของระบบได้");
      fetchData(); // Revert UI
      return;
    }

    if (!col.isCustom) {
      return;
    }

    try {
      const res = await fetch(`/api/custom-fields?id=${col.db_id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        showSuccess("ลบคอลัมน์เรียบร้อย");
        setColumns((prev) => prev.filter((c) => c.id !== colId));
      } else {
        showError(data.message);
        fetchData(); // Revert
      }
    } catch (error) {
      showError(error.message);
    }
  };

  // --- Row Handlers ---

  const handleRowUpdate = async (updatedRow) => {
    // 1. Separate standard fields from custom fields
    // Standard: id, name, description, validity_days
    // Custom: anything else that matches our customFields list

    const isNew = updatedRow.id.toString().startsWith("id_");

    const standardData = {
      name: updatedRow.name,

      description: updatedRow.description || "",
      validity_days: updatedRow.validity_days || 365,
    };

    // Extract custom values
    const customValues = {};
    if (customFields.length > 0) {
      customFields.forEach((field) => {
        if (updatedRow[field.field_name] !== undefined) {
          customValues[field.field_name] = updatedRow[field.field_name];
        }
      });
    }

    let typeId = updatedRow.id;

    try {
      if (isNew) {
        if (!updatedRow.name) return;
        const res = await fetch(API_ENDPOINTS.LICENSE_TYPES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(standardData),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        showSuccess("สร้างเรียบร้อย (กรุณารีโหลดเพื่อแก้ไขข้อมูลเสริม)");
        fetchData();
        return;
      } else {
        const updatePayload = { id: typeId, ...standardData };
        const res = await fetch(API_ENDPOINTS.LICENSE_TYPES, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
      }

      // Save Custom Field Values (if any)
      if (Object.keys(customValues).length > 0) {
        const valuesPayload = {
          entity_type: "license_types",
          entity_id: typeId,
          values: customValues,
        };

        const valRes = await fetch("/api/custom-field-values", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(valuesPayload),
        });
        const valData = await valRes.json();
        if (!valData.success)
          console.warn("Failed to save custom values", valData.message);
      }

      setTypes((prev) =>
        prev.map((t) =>
          t.id === typeId ? { ...t, ...standardData, ...customValues } : t
        )
      );
    } catch (error) {
      showError(error.message);
      fetchData();
    }
  };

  const handleRowDelete = (rowId) => {
    const type = types.find((t) => t.id === rowId);
    if (!type) return;

    if (parseInt(type.license_count || 0) > 0) {
      showError("ไม่สามารถลบได้เนื่องจากมีใบอนุญาตผูกอยู่");
      fetchData();
      return;
    }

    deleteType(rowId);
  };

  const deleteType = async (id) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.LICENSE_TYPES}?id=${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "เกิดข้อผิดพลาด");
      }
      setTypes((prev) => prev.filter((t) => t.id !== id));
      showSuccess("ลบประเภทใบอนุญาตเรียบร้อย");
    } catch (error) {
      showError(error.message);
      fetchData();
    }
  };

  const handleRowAdd = (newRow) => {
    // Handled via onRowUpdate when saved
  };

  return (
    <>
      <StatsSection stats={stats} />

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-tags"></i>
            ประเภทใบอนุญาต
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
              คลิก 2 ครั้งที่หัวตารางเพื่อแก้ไข | คลิกขวาเพื่อเปิดเมนู
            </span>
          </h3>
        </div>
        <div className="card-body">
          {!loading ? (
            <div style={{ overflow: "auto", maxHeight: "600px" }}>
              <ExcelTable
                initialColumns={columns}
                initialRows={types}
                onRowUpdate={handleRowUpdate}
                onRowDelete={handleRowDelete}
                onRowAdd={handleRowAdd}
                onColumnAdd={handleColumnAdd}
                onColumnUpdate={handleColumnUpdate}
                onColumnDelete={handleColumnDelete}
              />
            </div>
          ) : (
            <div className="table-card">
              <div className="table-container">
                <table className="excel-table">
                  <thead>
                    <tr>
                      {["ชื่อประเภท", "คำอธิบาย", "อายุ (วัน)", "ใบอนุญาต"].map((h, i) => (
                        <th key={i}><div className="th-content">{h}</div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <TableSkeleton rows={5} columns={[
                      { width: "80%" },
                      { width: "90%" },
                      { width: "50%", center: true },
                      { width: "40%", center: true },
                    ]} />
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
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


