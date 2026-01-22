"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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
    render: (value, row) => (
      parseInt(value) > 0 ? (
        <Link 
          href={`/dashboard/licenses?license_type=${row.id}`}
          className="text-primary hover:underline font-medium"
        >
          {value} <i className="fas fa-external-link-alt" style={{ fontSize: '0.7em' }}></i>
        </Link>
      ) : (
         <span className="text-muted">0</span>
      )
    ),
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
        // Add column locally instead of fetchData() to preserve unsaved rows
        const newColumn = {
          id: fieldName,
          name: payload.field_label,
          type: payload.field_type,
          width: 150,
          align: "left",
          isCustom: true,
          db_id: data.field?.id || null,
          display_order: maxOrder,
        };
        setColumns((prev) => [...prev, newColumn]);
        // Add empty field to all existing rows
        setTypes((prev) => prev.map((t) => ({ ...t, [fieldName]: "" })));
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
        if (!updatedRow.name) return; // Wait until name is filled
        const res = await fetch(API_ENDPOINTS.LICENSE_TYPES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(standardData),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        // Get the new ID from API response
        const newTypeId = data.type?.id || data.id;
        
        if (newTypeId) {
          // Update local state - replace temp ID with real ID
          setTypes((prev) =>
            prev.map((t) =>
              t.id === updatedRow.id
                ? { ...t, ...standardData, ...customValues, id: newTypeId, license_count: 0 }
                : t
            )
          );
          showSuccess("สร้างประเภทใบอนุญาตเรียบร้อย");
          
          // Save custom values with new ID
          if (Object.keys(customValues).length > 0) {
            const valuesPayload = {
              entity_type: "license_types",
              entity_id: newTypeId,
              values: customValues,
            };
            await fetch("/api/custom-field-values", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(valuesPayload),
            });
          }
        } else {
          // Fallback to fetchData if no ID returned
          showSuccess("สร้างเรียบร้อย");
          fetchData();
        }
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
  const statItems = [
    { label: 'ประเภททั้งหมด', value: stats.totalTypes || 0, icon: 'fas fa-tags', colorClass: 'primary' },
    { label: 'ประเภทที่ใช้งาน', value: stats.activeTypes || 0, icon: 'fas fa-check-circle', colorClass: 'success' },
    { label: 'ใบอนุญาตที่ผูก', value: stats.totalLicenses || 0, icon: 'fas fa-file-contract', colorClass: 'info' }
  ];

  return (
    <div className="card mb-3" style={{ border: 'none', boxShadow: 'var(--shadow-sm)' }}>
        <div className="card-body" style={{ padding: '0.5rem' }}>
            <div className="types-stats-row">
                {statItems.map((item, index) => (
                    <div key={index} className="stat-item">
                        <div className={`stat-icon ${item.colorClass}`}>
                            <i className={item.icon}></i>
                        </div>
                        <div className="stat-content">
                            <div className="stat-value text-dark">{item.value}</div>
                            <div className="stat-label">{item.label}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <style jsx>{`
            .types-stats-row {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.5rem;
            }
            @media (max-width: 768px) {
                .types-stats-row {
                    grid-template-columns: repeat(1, 1fr);
                }
            }
            .stat-item {
                padding: 0.25rem 0.5rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                position: relative;
            }
            .stat-item:not(:last-child)::after {
                content: '';
                position: absolute;
                right: -0.25rem;
                top: 20%;
                height: 60%;
                width: 1px;
                background-color: var(--border-color);
                opacity: 0.5;
            }
            @media (max-width: 768px) {
                .stat-item:not(:last-child)::after {
                    display: none;
                }
                .stat-item {
                    background-color: #f9fafb;
                    border-radius: 6px;
                    padding: 0.75rem;
                }
            }
            .stat-icon {
                width: 36px;
                height: 36px;
                min-width: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
            }
            /* Icon Colors */
            .stat-icon.primary { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
            .stat-icon.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
            .stat-icon.info    { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

            .stat-content {
                display: flex;
                flex-direction: column;
                justify-content: center;
                overflow: hidden;
            }
            .stat-value {
                font-size: 1rem;
                font-weight: 700;
                line-height: 1.2;
                color: var(--text-primary);
            }
            .stat-label {
                font-size: 0.75rem;
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `}</style>
    </div>
  );
}


