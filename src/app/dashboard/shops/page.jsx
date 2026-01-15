"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePagination } from "@/hooks";
// import { useSchema } from '@/hooks'; // useSchema might be useful if we want to sync columns with backend 'custom_fields' definition?
// Actually LicenseTypesPage manages custom fields manually. ShopsPage used useSchema.
// Let's stick to manual management to match LicenseTypesPage pattern if simpler, or wrap useSchema results into ExcelTable columns.
// Since we want "License Type Capabilities", we should follow its pattern.
import { API_ENDPOINTS } from "@/constants";
import { showSuccess, showError } from "@/utils/alerts";
import ExcelTable from "@/components/ExcelTable";
import Pagination from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/FilterRow";
import { exportShopsToPDF } from "@/lib/pdfExport";
import TableSkeleton from "@/components/ui/TableSkeleton";

// Default column definition
const STANDARD_COLUMNS = [
  { id: "shop_name", name: "ชื่อร้านค้า", width: 250, align: "left" },
  { id: "owner_name", name: "ชื่อเจ้าของ", width: 200, align: "left" },
  { id: "phone", name: "เบอร์โทรศัพท์", width: 150, align: "left" },
  { id: "address", name: "ที่อยู่", width: 300, align: "left" }, // Added address as it was in form
  { id: "email", name: "อีเมล", width: 200, align: "left" }, // Added email
  { id: "notes", name: "หมายเหตุ", width: 200, align: "left" }, // Added notes
  {
    id: "license_count",
    name: "จำนวนใบอนุญาต",
    width: 120,
    align: "center",
    readOnly: true,
    type: "number",
  },
];

export default function ShopsPage() {
  const pagination = usePagination(10);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [columns, setColumns] = useState(STANDARD_COLUMNS);

  // We can use a simplified approach for custom columns like LicenseTypesPage
  // Or just use what we have. API supports 'custom_fields' jsonb.
  // If we want "dynamic schema" support like before, we should fetch schema.
  // For now, let's assume columns are driven by data or saved state.
  // But LicenseTypesPage fetches metadata.
  // Let's try to preserve the existing "custom fields" logic if possible
  // or simplify to just "if it's not standard, it's custom".

  // Fetch custom columns on mount
  useEffect(() => {
    fetchCustomColumns();
  }, []);

  useEffect(() => {
    fetchShops();
  }, [pagination.page, pagination.limit, search]);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search,
      });

      const response = await fetch(`${API_ENDPOINTS.SHOPS}?${params}`);
      const data = await response.json();

      if (data.success) {
        // Formatting for ExcelTable
        // Flatten custom_fields
        const formattedShops = data.shops.map((s) => ({
          ...s,
          ...(s.custom_fields || {}),
        }));

        setShops(formattedShops);
        pagination.updateFromResponse(data.pagination);

        // Update columns if we discover new custom fields in data?
        // Or stick to fixed columns + dynamic add?
        // ShopsPage previously used `useSchema`.
        // Let's rely on ExcelTable's onColumnAdd to manage columns locally
        // and maybe save them to persistent storage/API if we want.
        // For this implementation, I will just start with STANDARD_COLUMNS.
        // If the user adds a column in ExcelTable, onColumnAdd is called.
      }
    } catch (error) {
      console.error("Failed to fetch shops:", error);
      showError("โหลดข้อมูลร้านค้าล้มเหลว");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  // --- Row Handlers ---

  const handleRowUpdate = async (updatedRow) => {
    const isNew = updatedRow.id.toString().startsWith("id_");

    // Split standard vs custom fields
    const standardData = {
      shop_name: updatedRow.shop_name,
      owner_name: updatedRow.owner_name,
      phone: updatedRow.phone,
      address: updatedRow.address,
      email: updatedRow.email,
      notes: updatedRow.notes,
    };

    // Determine custom fields
    // Everything in updatedRow that is NOT a standard field and NOT id/created_at/etc.
    const customValues = {};
    Object.keys(updatedRow).forEach((key) => {
      if (
        !STANDARD_COLUMNS.find((c) => c.id === key) &&
        key !== "id" &&
        key !== "custom_fields" &&
        key !== "created_at" &&
        key !== "updated_at"
      ) {
        customValues[key] = updatedRow[key];
      }
    });

    try {
      if (isNew) {
        if (!updatedRow.shop_name) return; // minimal validation

        const payload = {
          ...standardData,
          custom_fields: customValues,
        };

        const res = await fetch(API_ENDPOINTS.SHOPS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          showSuccess("สร้างร้านค้าเรียบร้อย");
          fetchShops(); // Refresh to get real ID
        } else {
          showError(data.message);
        }
      } else {
        const payload = {
          id: updatedRow.id,
          ...standardData,
          custom_fields: customValues,
        };

        const res = await fetch(API_ENDPOINTS.SHOPS, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          // Update local state
          setShops((prev) =>
            prev.map((s) => (s.id === updatedRow.id ? updatedRow : s))
          );
        } else {
          showError(data.message);
          fetchShops(); // Revert
        }
      }
    } catch (error) {
      showError(error.message);
      fetchShops();
    }
  };

  const handleRowDelete = async (rowId) => {
    try {
      const res = await fetch(`${API_ENDPOINTS.SHOPS}?id=${rowId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("ลบร้านค้าเรียบร้อย");
        setShops((prev) => prev.filter((s) => s.id !== rowId));
        // Optional: refresh if page empty?
      } else {
        showError(data.message);
        fetchShops();
      }
    } catch (error) {
      showError(error.message);
      fetchShops();
    }
  };

  const handleRowAdd = (newRow) => {
    // Just UI update, actual save happens on update (blur)
  };

  // --- Column Handlers ---
  // Note: To fully support "Dynamic Schema" like before, we should call /api/schema or similar.
  // Yet ShopsPage used `useSchema` hook which calls `/api/custom-fields`.
  // Accessing `column_definitions` table.
  // For now, I'll implement basic local column add.
  // If backend support is needed for permanent columns, we need to call API.
  // LicenseTypesPage calls /api/custom-fields.
  // I should probably replicate that if I want it to be persistent.

  const handleColumnAdd = async (newCol) => {
    // Generate field name
    const fieldName = `cf_${Date.now()}`;
    const payload = {
      entity_type: "shops",
      field_name: fieldName,
      field_label: "คอลัมน์ใหม่",
      field_type: "text",
      show_in_table: true,
      display_order: 99,
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
        fetchCustomColumns();
      } else {
        showError(data.message);
      }
    } catch (e) {
      console.error(e);
      showError(e.message);
    }
  };

  const handleColumnUpdate = async (updatedCol) => {
    // Find the column to get its db_id
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
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setColumns((prev) =>
          prev.map((c) =>
            c.id === updatedCol.id ? { ...c, ...updatedCol } : c
          )
        );
      } else {
        showError(data.message);
        fetchCustomColumns();
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const handleColumnDelete = async (colId) => {
    const col = columns.find((c) => c.id === colId);
    if (!col || !col.isCustom) {
      showError("ไม่สามารถลบคอลัมน์หลักได้");
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
        fetchCustomColumns();
      }
    } catch (error) {
      showError(error.message);
    }
  };

  // Standard column definitions with default values
  const STANDARD_COLUMN_DEFS = {
    shop_name: { width: 250, type: "text", align: "left" },
    owner_name: { width: 200, type: "text", align: "left" },
    phone: { width: 150, type: "text", align: "left" },
    address: { width: 300, type: "text", align: "left" },
    email: { width: 200, type: "text", align: "left" },
    notes: { width: 200, type: "text", align: "left" },
    license_count: { width: 120, type: "number", align: "center", readOnly: true },
  };

  const fetchCustomColumns = async () => {
    try {
      const res = await fetch(
        `/api/custom-fields?entity_type=shops&t=${Date.now()}`
      );
      const data = await res.json();
      
      if (data.success && data.fields.length > 0) {
        // Map DB fields to columns, preserving db_id for all columns
        const mergedColumns = data.fields
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .map((f) => {
            // Get standard column definition if exists
            const standardDef = STANDARD_COLUMN_DEFS[f.field_name];
            
            return {
              id: f.field_name,
              name: f.field_label, // Use label from DB (editable)
              type: f.field_type || (standardDef?.type || "text"),
              width: standardDef?.width || 150,
              align: standardDef?.align || "left",
              readOnly: standardDef?.readOnly || false,
              isCustom: !f.is_system_field,
              isSystem: f.is_system_field,
              db_id: f.id, // Store DB ID for updates
            };
          });

        setColumns(mergedColumns);
      } else {
        // Fallback to STANDARD_COLUMNS if no DB fields found
        setColumns(STANDARD_COLUMNS);
      }
    } catch (e) {
      console.error(e);
      // Fallback on error
      setColumns(STANDARD_COLUMNS);
    }
  };

  const handleExport = async () => {
    try {
      await exportShopsToPDF(shops);
    } catch (err) {
      console.error(err);
      showError("Export PDF ล้มเหลว");
    }
  };

  return (
    <div className="card h-100">
      <div className="card-header">
        <h3 className="card-title">
          <i className="fas fa-store"></i> รายการร้านค้า
        </h3>
      </div>

      <div className="card-body">
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="shop-search" className="filter-label">ค้นหา</label>
            <SearchInput
              id="shop-search"
              value={search}
              onChange={(val) => {
                setSearch(val);
                pagination.resetPage();
              }}
              placeholder="ชื่อร้าน, เจ้าของ, เบอร์โทร..."
            />
          </div>
        </div>

        {!loading ? (
          <ExcelTable
            initialColumns={columns}
            initialRows={shops}
            onRowUpdate={handleRowUpdate}
            onRowDelete={handleRowDelete}
            onRowAdd={handleRowAdd}
            onColumnAdd={handleColumnAdd}
            onColumnUpdate={handleColumnUpdate}
            onColumnDelete={handleColumnDelete}
            onExport={handleExport}
            exportLabel="Export PDF"
            exportIcon="fa-file-pdf"
          />
        ) : (
          <div className="table-card">
            <div className="table-container">
              <table className="excel-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        style={{ width: col.width, minWidth: col.width }}
                      >
                        <div className="th-content">{col.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <TableSkeleton
                    rows={pagination.limit}
                    columns={[
                      { width: "90%" },
                      { width: "80%" },
                      { width: "70%" },
                      { width: "85%" },
                      { width: "70%" },
                      { width: "60%" },
                      { width: "40%", center: true },
                    ]}
                  />
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-4">
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
    </div>
  );
}
