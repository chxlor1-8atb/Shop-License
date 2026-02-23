"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { API_ENDPOINTS } from "@/constants";
import { showSuccess, showError, pendingDelete } from "@/utils/alerts";
import { useAutoRefresh, notifyDataChange, useRealtime } from "@/hooks";
import { mutate } from "swr";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ExcelTable from "@/components/ExcelTable";

// Constants
const STANDARD_COLUMNS = [
  { id: "name", name: "ชื่อประเภท", width: 250, align: "center" },
// Price column removed as requested
  { id: "description", name: "ข้อมูลอื่นๆ", width: 420, align: "center" },
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
  const initialLoadDoneRef = useRef(false);
  const shouldSkipFetchRef = useRef(false);
  const deletedIdsRef = useRef(new Set());

  // Helper to check if server data has real changes we should accept
  const hasRealDataChanges = useCallback((localTypes, serverTypes) => {
    if (!localTypes || !serverTypes) return true;
    
    // Check if server has new IDs we don't have locally
    const localIds = new Set(localTypes.map(t => t.id));
    const serverIds = new Set(serverTypes.map(t => t.id));
    
    // If server has IDs we don't have, accept the update
    for (const id of serverIds) {
      if (!localIds.has(id)) return true;
    }
    
    // If local has IDs that server doesn't have (deleted), accept the update
    for (const id of localIds) {
      if (!serverIds.has(id)) return true;
    }
    
    // If lengths differ significantly, accept the update
    if (Math.abs(localTypes.length - serverTypes.length) > 1) return true;
    
    return false;
  }, []);

  const fetchData = useCallback(async () => {
    // Skip if initial load is deliberately paused (e.g., during row addition)
    if (!initialLoadDoneRef.current && shouldSkipFetchRef.current) {
      return;
    }
    
    if (!initialLoadDoneRef.current) {
      setLoading(true);
    }
    try {
      // Parallel fetch all data at once with cache busting
      const timestamp = new Date().getTime();
      const [typesRes, fieldsRes, valuesRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.LICENSE_TYPES}?t=${timestamp}`, { credentials: "include" }),
        fetch(`/api/custom-fields?entity_type=license_types&t=${timestamp}`, { credentials: "include" }),
        fetch(`/api/custom-field-values?entity_type=license_types&t=${timestamp}`, { credentials: "include" })
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
        
        // Filter out items that are currently being deleted locally
        mergedTypes = mergedTypes.filter(t => !deletedIdsRef.current.has(t.id));
        
        // Only update state if we're not in the middle of row creation OR if we have real data changes
        setTypes(prev => {
          // Preserve local temp rows that haven't been saved yet
          const tempRows = prev.filter(t => t.id.toString().startsWith('id_'));
          
          // Check if we really need to update (to avoid unnecessary re-renders)
          if (shouldSkipFetchRef.current && !hasRealDataChanges(prev, mergedTypes)) {
            return prev;
          }
          
          // Merge temp rows with server data
          // Server data (mergedTypes) is the source of truth for saved items
          return [...tempRows, ...mergedTypes];
        });
        
        shouldSkipFetchRef.current = true;
      }

      if (fieldsData.success) {
        const fields = fieldsData.fields || [];
        setCustomFields(fields);

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

        const finalCols = STANDARD_COLUMNS.map((sc) => {
          const dbCol = dbColsMap.get(sc.id);
          if (dbCol) {
            return {
              ...sc,
              name: dbCol.name,
              db_id: dbCol.db_id,
              isSystem: dbCol.isSystem,
            };
          }
          return sc;
        });

        const customCols = [];
        dbColsMap.forEach((col, key) => {
          if (!STANDARD_COLUMNS.find((sc) => sc.id === key)) {
            customCols.push({
              ...col,
              width: 150,
              align: "center",
            });
          }
        });

        customCols.sort((a, b) => a.display_order - b.display_order);
        setColumns([...finalCols, ...customCols]);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showError("โหลดข้อมูลล้มเหลว");
    } finally {
      setLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, [hasRealDataChanges]); // Removed `types` from deps

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh: sync data every 5s + on tab focus + cross-tab
  useAutoRefresh(fetchData, { interval: 5000, channel: "license-types-sync" });

  // Supabase Realtime: Listen for DB changes
  useRealtime('license_types', () => {
    // console.log("[Realtime] License Types updated");
    // Refresh list
    fetchData();
    // Refresh dropdowns globally
    mutate('/api/license-types/dropdown');
    mutate('/api/license-types');
    mutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard')); // Update stats
  });

  const stats = useMemo(
    () => ({
      totalTypes: types.length,
      activeTypes: types.filter((t) => parseInt(t.license_count || 0) > 0).length,
      totalLicenses: types.reduce(
        (acc, curr) => acc + parseInt(curr.license_count || 0),
        0
      ),
    }),
    [types]
  );

  // --- Column Handlers ---

  const handleColumnAdd = async (newCol) => {
    const fieldName = `cf_${Date.now()}`;
    const maxOrder = Math.max(...columns.map((c, i) => i), 0) + 1;

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
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showSuccess("เพิ่มคอลัมน์เรียบร้อย");
        const newColumn = {
          id: fieldName,
          name: payload.field_label,
          type: payload.field_type,
          width: 150,
          align: "center",
          isCustom: true,
          db_id: data.field?.id || null,
          display_order: maxOrder,
        };
        setColumns((prev) => [...prev, newColumn]);
        setTypes((prev) => prev.map((t) => ({ ...t, [fieldName]: "" })));
      } else {
        showError(data.message);
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const handleColumnUpdate = async (updatedCol) => {
    const col = columns.find((c) => c.id === updatedCol.id);
    if (!col || !col.db_id) return;

    const payload = {
      id: col.db_id,
      field_label: updatedCol.name !== undefined ? updatedCol.name : col.name,
      field_type: updatedCol.type !== undefined ? updatedCol.type : col.type,
    };

    try {
      const res = await fetch("/api/custom-fields", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        showError(data.message);
        fetchData();
        shouldSkipFetchRef.current = false;
      } else {
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

    if (!col || col.isSystem || STANDARD_COLUMNS.some((sc) => sc.id === col.id)) {
      showError("ไม่สามารถลบคอลัมน์ของระบบได้");
      fetchData();
      shouldSkipFetchRef.current = false;
      return;
    }

    if (!col.isCustom) return;

    try {
      const res = await fetch(`/api/custom-fields?id=${col.db_id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success) {
        showSuccess("ลบคอลัมน์เรียบร้อย");
        setColumns((prev) => prev.filter((c) => c.id !== colId));
      } else {
        showError(data.message);
        fetchData();
        shouldSkipFetchRef.current = false;
      }
    } catch (error) {
      showError(error.message);
    }
  };

  // --- Row Handlers ---

  const handleRowUpdate = async (updatedRow) => {
    const isNew = updatedRow.id.toString().startsWith("id_");

    const standardData = {
      name: updatedRow.name,
      description: updatedRow.description || "",
      validity_days: updatedRow.validity_days || 365,
    };

    const customValues = {};
    if (customFields.length > 0) {
      customFields.forEach((field) => {
        if (updatedRow[field.field_name] !== undefined) {
          customValues[field.field_name] = updatedRow[field.field_name];
        }
      });
    }

    try {
      if (isNew) {
        if (!updatedRow.name) return;
        if (updatedRow._isSubmitting) return;
        
        setTypes(prev => prev.map(t => 
          t.id === updatedRow.id ? { ...t, _isSubmitting: true } : t
        ));
        
        const res = await fetch(API_ENDPOINTS.LICENSE_TYPES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(standardData),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        const newTypeId = data.type?.id || data.id;
        
        if (newTypeId) {
          setTypes((prev) =>
            prev.map((t) =>
              t.id === updatedRow.id
                ? { ...t, ...standardData, ...customValues, id: newTypeId, license_count: 0, _isSubmitting: false }
                : t
            )
          );
          
          showSuccess("สร้างประเภทใบอนุญาตเรียบร้อย");
          notifyDataChange("license-types-sync");
          mutate('/api/license-types/dropdown');
          mutate('/api/license-types');

          if (data.type) {
             setTypes(prev => prev.map(t => 
                 t.id === updatedRow.id ? { ...data.type, _isSubmitting: false, license_count: 0 } : t
             ));
          } else {
             fetchData();
          }
          
          shouldSkipFetchRef.current = false;
          
          if (Object.keys(customValues).length > 0) {
            const valuesPayload = {
              entity_type: "license_types",
              entity_id: newTypeId,
              values: customValues,
            };
            fetch("/api/custom-field-values", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(valuesPayload),
            }).catch(console.error);
          }
        } else {
          showSuccess("สร้างเรียบร้อย");
          fetchData();
          shouldSkipFetchRef.current = false;
        }
        return;
      } else {
        const updatePayload = { id: updatedRow.id, ...standardData };
        const res = await fetch(API_ENDPOINTS.LICENSE_TYPES, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(updatePayload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        
        showSuccess("บันทึกเรียบร้อย");
        notifyDataChange("license-types-sync");
        mutate('/api/license-types/dropdown');
        mutate('/api/license-types');

        if (data.type) {
           setTypes((prev) =>
             prev.map((t) =>
               t.id === updatedRow.id ? { ...t, ...data.type, ...customValues } : t
             )
           );
        } else {
           setTypes((prev) =>
             prev.map((t) =>
               t.id === updatedRow.id ? { ...t, ...standardData, ...customValues } : t
             )
           );
        }
      }

      if (Object.keys(customValues).length > 0) {
        const valuesPayload = {
          entity_type: "license_types",
          entity_id: updatedRow.id,
          values: customValues,
        };
        fetch("/api/custom-field-values", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(valuesPayload),
        }).catch(console.error);
      }

    } catch (error) {
      showError(error.message);
      fetchData();
      shouldSkipFetchRef.current = false;
    }
  };

  const deleteType = async (id) => {
    // Find type for display name
    const type = types.find((t) => t.id === id);
    const typeName = type?.name || `ประเภท #${id}`;
    
    // Show pending delete toast with undo option
    pendingDelete({
      itemName: `ประเภทใบอนุญาต "${typeName}"`,
      duration: 5000,
      onDelete: async () => {
        // Execute actual delete after timer expires
        try {
          const response = await fetch(`${API_ENDPOINTS.LICENSE_TYPES}?id=${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          const data = await response.json();
          if (!data.success) {
            throw new Error(data.message || "เกิดข้อผิดพลาด");
          }
          
          showSuccess("ลบประเภทใบอนุญาตเรียบร้อย");
          notifyDataChange("license-types-sync");
          
          // Targeted SWR cache invalidation
          mutate('/api/license-types/dropdown');
          mutate('/api/license-types');
          
          // Remove from deletedIdsRef after a delay
          setTimeout(() => {
            if (deletedIdsRef.current.has(id)) {
               deletedIdsRef.current.delete(id);
            }
          }, 5000);
          
          // Force refresh to ensure UI is in sync with server
          shouldSkipFetchRef.current = false;
          await fetchData();
        } catch (error) {
          // Delete failed - restore the item
          deletedIdsRef.current.delete(id);
          showError(error.message);
          fetchData();
          shouldSkipFetchRef.current = false;
        }
      },
      onCancel: () => {
        // User cancelled - restore the item
        deletedIdsRef.current.delete(id);
        fetchData();
        shouldSkipFetchRef.current = false;
      }
    });
    
    // 1. Optimistic update: Mark as deleted locally first
    deletedIdsRef.current.add(id);
    setTypes((prev) => prev.filter((t) => t.id !== id));
  };

  const handleRowDelete = (rowId) => {
    const type = types.find((t) => t.id === rowId);
    if (!type) return;

    if (parseInt(type.license_count || 0) > 0) {
      showError("ไม่สามารถลบได้เนื่องจากมีใบอนุญาตผูกอยู่");
      fetchData();
      shouldSkipFetchRef.current = false;
      return;
    }

    deleteType(rowId);
  };

  const handleRowAdd = (newRow) => {
    // This is called by ExcelTable when user clicks + inside the table (if enabled)
    // But we use the external button. 
    // If ExcelTable supports internal add, we should update state here too.
    setTypes((prev) => [...prev, { ...newRow, license_count: 0, _isSubmitting: false }]);
  };

  return (
    <>
      <StatsSection stats={stats} />

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 className="card-title" style={{ margin: 0 }}>
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
          <button type="button" className="btn btn-primary btn-sm" onClick={() => {
            const newType = {
              id: `id_${Date.now()}`,
              name: "",
              description: "",
              validity_days: 365,
              license_count: 0,
              _isSubmitting: false,
            };
            setTypes(prev => [newType, ...prev]);
          }}>
            <i className="fas fa-plus"></i> เพิ่มประเภทใบอนุญาต
          </button>
        </div>
        <div className="card-body">
          {!loading ? (
            <div style={{ overflow: "auto", maxHeight: "600px" }}>
              <ExcelTable
                key={`license-types-${types.length}-${loading}`}
                initialColumns={columns}
                initialRows={types}
                onRowUpdate={handleRowUpdate}
                onRowDelete={handleRowDelete}
                onRowAdd={handleRowAdd}
                onColumnAdd={handleColumnAdd}
                onColumnUpdate={handleColumnUpdate}
                onColumnDelete={handleColumnDelete}
                preserveTempRows={false}
              />
            </div>
          ) : (
            <div className="table-card">
              <div className="table-container">
                <table className="excel-table">
                  <thead>
                    <tr>
                      {["ชื่อประเภท", "คำอธิบาย", "อายุ (วัน)", "ใบอนุญาต"].map((h, i) => (
                        <th key={i} style={{ textAlign: "center" }}><div className="th-content" style={{ justifyContent: "center" }}>{h}</div></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <TableSkeleton rows={5} columns={[
                      { width: "80%", center: true },
                      { width: "90%", center: true },
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
    { label: 'ประเภททั้งหมด', value: stats.totalTypes || 0, icon: 'fas fa-tags', colorClass: 'indigo' },
    { label: 'ประเภทที่ใช้งาน', value: stats.activeTypes || 0, icon: 'fas fa-check-circle', colorClass: 'success' },
    { label: 'ใบอนุญาตที่ผูก', value: stats.totalLicenses || 0, icon: 'fas fa-file-contract', colorClass: 'primary' }
  ];

  return (
    <div className="card mb-3" style={{ border: 'none', boxShadow: 'none' }}>
        <div className="card-body" style={{ padding: '0.5rem' }}>
            <div className="types-stats-row">
                {statItems.map((item, index) => (
                    <div key={index} className="lt-stat-item">
                        <div className={`lt-stat-icon ${item.colorClass}`}>
                            <i className={item.icon}></i>
                        </div>
                        <div className="lt-stat-content">
                            <div className="lt-stat-value">{item.value}</div>
                            <div className="lt-stat-label">{item.label}</div>
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
            .lt-stat-item {
                padding: 0.25rem 0.5rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                position: relative;
            }
            .lt-stat-item:not(:last-child)::after {
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
                .lt-stat-item:not(:last-child)::after {
                    display: none;
                }
                .lt-stat-item {
                    background-color: #f9fafb;
                    border-radius: 6px;
                    padding: 0.75rem;
                }
            }
            .lt-stat-icon {
                width: 40px;
                height: 40px;
                min-width: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.1rem;
            }
            .lt-stat-icon.indigo  { background: rgba(79, 70, 229, 0.1); color: #4f46e5; }
            .lt-stat-icon.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
            .lt-stat-icon.primary { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

            .lt-stat-content {
                display: flex;
                flex-direction: column;
                justify-content: center;
                overflow: hidden;
            }
            .lt-stat-value {
                font-size: 1.125rem;
                font-weight: 700;
                line-height: 1.2;
                color: var(--text-primary);
            }
            .lt-stat-label {
                font-size: 0.8rem;
                color: var(--text-muted);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
        `}</style>
    </div>
  );
}


