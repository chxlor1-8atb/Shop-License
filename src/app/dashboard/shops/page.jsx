"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePagination, useDropdownData } from "@/hooks";
import { API_ENDPOINTS } from "@/constants";
import { showSuccess, showError } from "@/utils/alerts";
import Pagination from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/FilterRow";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ShopDetailModal from "@/components/ui/ShopDetailModal";
import QuickAddModal from "@/components/ui/QuickAddModal";
import { mutate } from "swr"; // Import mutate

// Lazy load PDF export to reduce initial bundle size
const exportShopsToPDF = async (...args) => {
  const { exportShopsToPDF: exportFn } = await import("@/lib/pdfExportSafe");
  return exportFn(...args);
};

// Lazy load heavy ExcelTable component
const ExcelTable = dynamic(() => import("@/components/ExcelTable"), {
  ssr: false,
  loading: () => (
    <div className="table-card">
      <div className="table-container">
        <table className="excel-table">
          <thead>
            <tr>
              {["ชื่อร้านค้า", "ชื่อเจ้าของ", "เบอร์โทรศัพท์", "ที่อยู่", "อีเมล", "หมายเหตุ", "จำนวนใบอนุญาต"].map((h, i) => (
                <th key={i} style={{ minWidth: "120px", textAlign: "center" }}><div className="th-content" style={{ justifyContent: "center" }}>{h}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableSkeleton rows={10} columns={[
              { width: "90%", center: true },
              { width: "80%", center: true },
              { width: "70%", center: true },
              { width: "85%", center: true },
              { width: "70%", center: true },
              { width: "60%", center: true },
              { width: "40%", center: true },
            ]} />
          </tbody>
        </table>
      </div>
    </div>
  ),
});

// Default column definition
const STANDARD_COLUMNS = [
  { id: "shop_name", name: "ชื่อร้านค้า", width: 250, align: "center" },
  { id: "owner_name", name: "ชื่อเจ้าของ", width: 200, align: "center" },
  { id: "phone", name: "เบอร์โทรศัพท์", width: 150, align: "center" },
  { id: "address", name: "ที่อยู่", width: 300, align: "center" }, // Added address as it was in form
  { id: "email", name: "อีเมล", width: 200, align: "center" }, // Added email
  { id: "notes", name: "หมายเหตุ", width: 200, align: "center" }, // Added notes
  {
    id: "license_count",
    name: "จำนวนใบอนุญาต",
    width: 120,
    align: "center",
    readOnly: true,
    type: "number",
    render: (value, row) => (
      value > 0 ? (
        <Link 
          href={`/dashboard/licenses?shop_id=${row.id}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {value} <i className="fas fa-external-link-alt" style={{ fontSize: '0.7em' }}></i>
        </Link>
      ) : (
        <span className="text-muted">-</span>
      )
    ),
  },
];

export default function ShopsPage() {
  const pagination = usePagination(10);
  const { typeOptions } = useDropdownData();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [columns, setColumns] = useState(STANDARD_COLUMNS);
  
  // Modal states
  const [selectedShop, setSelectedShop] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Shared fetch function that takes search as parameter to avoid stale closures
  const performFetchShops = async (searchValue) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchValue,
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
      }
    } catch (error) {
      console.error("Failed to fetch shops:", error);
      showError("โหลดข้อมูลร้านค้าล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  // Initial parallel data fetch for faster loading
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchCustomColumns(), performFetchShops("")]);
    };
    loadInitialData();
  }, []);

  // Refetch shops when filters change - use debouncedSearch directly
  useEffect(() => {
    if (columns.length > 0) {
      performFetchShops(debouncedSearch);
    }
  }, [pagination.page, pagination.limit, debouncedSearch]);

  // Keep fetchShops for external use (e.g., after updates)
  const fetchShops = useCallback(async () => {
    await performFetchShops(debouncedSearch);
  }, [debouncedSearch]);

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
          mutate('/api/shops?limit=1000'); // Update dropdown cache
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
          mutate('/api/shops?limit=1000'); // Update dropdown cache
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
        mutate('/api/shops?limit=1000'); // Update dropdown cache
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
    if (!col) return;

    // Auto-create in DB if standard column doesn't have a record yet
    if (!col.db_id) {
      const payload = {
        entity_type: "shops",
        field_name: col.id,
        field_label: updatedCol.name !== undefined ? updatedCol.name : col.name,
        field_type: updatedCol.type !== undefined ? updatedCol.type : (col.type || "text"),
        show_in_table: true,
        display_order: columns.findIndex(c => c.id === col.id) + 1
      };

      try {
        const res = await fetch("/api/custom-fields", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showSuccess("บันทึกชื่อคอลัมน์เรียบร้อย");
          fetchCustomColumns();
        } else {
          showError(data.message);
        }
      } catch (e) {
        showError(e.message);
      }
      return;
    }

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

  // Custom columns are now fetched in parallel above

  const fetchCustomColumns = async () => {
    try {
      const res = await fetch(
        `/api/custom-fields?entity_type=shops&t=${Date.now()}`
      );
      const data = await res.json();
      if (data.success) {
        const apiFields = data.fields || [];

        // Map standard columns to db fields if they exist
        const updatedStandardCols = STANDARD_COLUMNS.map((col) => {
          const match = apiFields.find((f) => f.field_name === col.id);
          if (match) {
            return {
              ...col,
              name: match.field_label,
              db_id: match.id,
              isSystem: true,
            };
          }
          return col;
        });

        // Pure custom columns
        const customCols = apiFields
          .filter((f) => !STANDARD_COLUMNS.find((sc) => sc.id === f.field_name))
          .map((f) => ({
            id: f.field_name,
            name: f.field_label,
            type: f.field_type || "text",
            width: 150,
            isCustom: true,
            db_id: f.id,
          }));

        // Merge with standard
        setColumns([...updatedStandardCols, ...customCols]);
      }
    } catch (e) {
      console.error(e);
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

  // Handle row click to show detail modal
  const handleRowClick = (row) => {
    // Don't open for new rows
    if (row.id.toString().startsWith("id_")) return;
    setSelectedShop(row);
    setShowDetailModal(true);
  };

  // Handle quick add shop with optional license
  const handleQuickAddShop = async (formData) => {
    // Create shop first
    const shopPayload = {
      shop_name: formData.shop_name,
      owner_name: formData.owner_name,
      phone: formData.phone,
      address: formData.address,
      email: formData.email,
      notes: formData.notes,
    };

    const shopRes = await fetch(API_ENDPOINTS.SHOPS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shopPayload),
    });
    const shopData = await shopRes.json();

    if (!shopData.success) {
      throw new Error(shopData.message || "ไม่สามารถสร้างร้านค้าได้");
    }

    // If user wants to create license too
    if (formData.create_license && formData.license_type_id && formData.license_number) {
      // Need to get the new shop ID - fetch shops again
      const shopsRes = await fetch(`${API_ENDPOINTS.SHOPS}?search=${encodeURIComponent(formData.shop_name)}&limit=1`);
      const shopsData = await shopsRes.json();
      const newShop = shopsData.shops?.[0];

      if (newShop) {
        const licenseRes = await fetch(API_ENDPOINTS.LICENSES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shop_id: newShop.id,
            license_type_id: formData.license_type_id,
            license_number: formData.license_number,
            issue_date: new Date().toISOString().split("T")[0],
            status: "active",
          }),
        });
        const licenseData = await licenseRes.json();

        if (!licenseData.success) {
          showError("สร้างร้านค้าแล้วแต่ไม่สามารถสร้างใบอนุญาตได้: " + licenseData.message);
        } else {
          showSuccess("สร้างร้านค้าและใบอนุญาตเรียบร้อย");
        }
      }
    } else {
      showSuccess("สร้างร้านค้าเรียบร้อย");
    }

    fetchShops();
    mutate('/api/shops?limit=1000'); // Update dropdown cache
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <i className="fas fa-store"></i> รายการร้านค้า
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
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowQuickAdd(true)}>
            <i className="fas fa-plus"></i> สร้างร้านค้าใหม่
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="filter-grid" style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="filter-group" style={{ maxWidth: '400px', flex: 1 }}>
            <label htmlFor="shop-search" className="filter-label">ค้นหา</label>
            <SearchInput
              id="shop-search"
              value={search}
              onChange={(val) => {
                setSearch(val);
                pagination.resetPage();
              }}
              placeholder="ชื่อร้าน, เจ้าของ, เบอร์โทร, ที่อยู่, อีเมล..."
            />
          </div>
        </div>

        {!loading ? (
          <div style={{ overflow: "auto", maxHeight: "600px" }}>
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
              onRowClick={handleRowClick}
              exportLabel="Export PDF"
              exportIcon="fa-file-pdf"
            />
          </div>
        ) : (
          <div className="table-card">
            <div className="table-container">
              <table className="excel-table">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.id}
                        style={{ width: col.width, minWidth: col.width, textAlign: "center" }}
                      >
                        <div className="th-content" style={{ justifyContent: "center" }}>{col.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <TableSkeleton
                    rows={pagination.limit}
                    columns={[
                      { width: "90%", center: true },
                      { width: "80%", center: true },
                      { width: "70%", center: true },
                      { width: "85%", center: true },
                      { width: "70%", center: true },
                      { width: "60%", center: true },
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

      {/* Shop Detail Modal */}
      <ShopDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedShop(null);
        }}
        shop={selectedShop}
        typeOptions={typeOptions}
        onLicenseCreated={fetchShops}
      />

      {/* Quick Add Shop Modal */}
      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        type="shop"
        typeOptions={typeOptions}
        onSubmit={handleQuickAddShop}
      />
    </div>
  );
}
