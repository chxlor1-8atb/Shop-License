"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { API_ENDPOINTS } from "@/constants";
import { showSuccess, showError } from "@/utils/alerts";
import ExcelTable from "@/components/ExcelTable";

// Constants
const STANDARD_COLUMNS = [
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
  const [columns, setColumns] = useState(STANDARD_COLUMNS);
  const [customFields, setCustomFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch License Types
      const typesRes = await fetch(
        `${API_ENDPOINTS.LICENSE_TYPES}?t=${new Date().getTime()}`
      );
      const typesData = await typesRes.json();

      // 2. Fetch Custom Fields
      const fieldsRes = await fetch(
        `/api/custom-fields?entity_type=license_types&t=${new Date().getTime()}`
      );
      const fieldsData = await fieldsRes.json();

      // 3. Fetch Custom Field Values
      const valuesRes = await fetch(
        `/api/custom-field-values?entity_type=license_types&t=${new Date().getTime()}`
      );
      const valuesData = await valuesRes.json();

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

        // Map DB fields to columns
        // This ensures we use the DB's label (name) and keep track of db_id
        const mergedColumns = fields
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .map((f) => {
            // Check if it's a standard/system column
            const standardCol = STANDARD_COLUMNS.find(
              (sc) => sc.id === f.field_name
            );

            return {
              id: f.field_name,
              name: f.field_label, // Use label from DB
              type: f.field_type || "text",
              width: standardCol ? standardCol.width : 150,
              align: standardCol ? standardCol.align : "left",
              readOnly: standardCol ? standardCol.readOnly : false,
              isCustom: !f.is_system_field,
              isSystem: f.is_system_field,
              db_id: f.id, // Store DB ID for updates
            };
          });

        // Add any missing standard columns (in case they aren't in DB yet/deleted)
        // Ideally they should always be in DB if we seeded correctly
        STANDARD_COLUMNS.forEach((sc) => {
          if (!mergedColumns.find((mc) => mc.id === sc.id)) {
            mergedColumns.push(sc);
          }
        });

        // Ensure "license_count" is there if it's not in DB fields
        // (It appeared in STANDARD_COLUMNS but might not be in custom_fields table if it's a pure computed field?)
        // In the previous run check, license_count WAS in the table.

        setColumns(mergedColumns);
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

      {!loading ? (
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
      ) : (
        <LoadingState />
      )}
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

function LoadingState() {
  return (
    <div className="card">
      <div
        className="card-body"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <i
          className="fas fa-spinner fa-spin"
          style={{ marginRight: "10px" }}
        ></i>
        Loading data...
      </div>
    </div>
  );
}
