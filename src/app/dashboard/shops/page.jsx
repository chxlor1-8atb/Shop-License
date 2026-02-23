"use client";

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePagination, useDropdownData, useAutoRefresh, notifyDataChange, useShops, useRealtime } from "@/hooks";
import { API_ENDPOINTS } from "@/constants";
import { showSuccess, showError } from "@/utils/alerts";
import Pagination from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/FilterRow";
import CustomSelect from "@/components/ui/CustomSelect";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ShopDetailModal from "@/components/ui/ShopDetailModal";
import QuickAddModal from "@/components/ui/QuickAddModal";
import ExcelTable from "@/components/ExcelTable";
import { mutate } from "swr";

// Lazy load PDF export to reduce initial bundle size
const exportShopsToPDF = async (...args) => {
  const { exportShopsToPDF: exportFn } = await import("@/lib/pdfExportSafe");
  return exportFn(...args);
};

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

function ShopsPageContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") || "";
  const pagination = usePagination(10);
  const { page, limit, updateFromResponse } = pagination;

  const { typeOptions } = useDropdownData();
  const [columns, setColumns] = useState(STANDARD_COLUMNS);
  
  // Filter states
  const [filterHasLicense, setFilterHasLicense] = useState("");
  const [filterLicenseStatus, setFilterLicenseStatus] = useState("");
  const [filterLicenseType, setFilterLicenseType] = useState("");
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);

  // Use SWR hook for shops data
  const { shops, isLoading, error, refresh: fetchShops } = useShops({
    search: debouncedSearch,
    page,
    limit,
    has_license: filterHasLicense,
    license_status: filterLicenseStatus,
    license_type: filterLicenseType,
  });

  // Local state for optimistic updates
  const [localShops, setLocalShops] = useState([]);
  const deletedIdsRef = useRef(new Set());
  
  // Safely compute display shops
  // Force re-render counter for deletedIds changes (since useRef doesn't trigger re-render)
  const [, forceUpdate] = useState(0);
  
  const displayShops = useMemo(() => {
    let mergedShops = [];
    if (!shops) {
      mergedShops = localShops;
    } else {
      // Filter out local shops that are now present in server data to avoid duplicates
      const serverShopIds = new Set(shops.map(s => s.id));
      const uniqueLocalShops = localShops.filter(s => !serverShopIds.has(s.id));
      // Merge: New local shops first, then server shops
      mergedShops = [...uniqueLocalShops, ...shops];
    }
    
    // Filter out items marked as deleted
    return mergedShops.filter(s => !deletedIdsRef.current.has(s.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localShops, shops]);

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

  // Track if columns have been fetched to prevent infinite loop
  const columnsLoadedRef = useRef(false);

  // Define fetchCustomColumns before useEffect that uses it
  const fetchCustomColumns = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/custom-fields?entity_type=shops`,
        { credentials: "include" }
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
            align: "center",
            isCustom: true,
            db_id: f.id,
          }));

        // Merge with standard
        setColumns([...updatedStandardCols, ...customCols]);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch custom columns only once on mount
  useEffect(() => {
    if (!columnsLoadedRef.current) {
      fetchCustomColumns();
      columnsLoadedRef.current = true;
    }
  }, [fetchCustomColumns]);

  // Auto-refresh: sync data every 5s + on tab focus + cross-tab
  useAutoRefresh(fetchShops, { interval: 5000, channel: "shops-sync" });

  // Supabase Realtime: Listen for DB changes
  useRealtime('shops', (payload) => {
    // console.log("[Realtime] Shops updated:", payload);
    // Refresh list
    fetchShops(); 
    // Refresh dropdowns everywhere
    mutate('/api/shops/dropdown');
    mutate((key) => typeof key === 'string' && key.startsWith('/api/shops'));
  });

  // --- Row Handlers ---

  const handleRowUpdate = async (updatedRow) => {
    const isNew = updatedRow.id.toString().startsWith("id_");

    // Split standard vs custom fields
    const standardData = {
      shop_name: updatedRow.shop_name || "",
      owner_name: updatedRow.owner_name || "",
      phone: updatedRow.phone || "",
      address: updatedRow.address || "",
      email: updatedRow.email || "",
      notes: updatedRow.notes || "",
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
        if (!updatedRow.shop_name || updatedRow.shop_name.trim() === "") {
          showError("กรุณาระบุชื่อร้านค้า");
          return;
        }

        const payload = {
          ...standardData,
          custom_fields: customValues,
        };

        const res = await fetch(API_ENDPOINTS.SHOPS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          showSuccess("สร้างร้านค้าเรียบร้อย");
          notifyDataChange("shops-sync");
          
          // Optimistic update: Replace temp row with real data from server
          if (data.shop) {
             // Update local state - replace temp ID with real shop object
             setLocalShops(prev => 
               prev.map(shop => 
                 shop.id === updatedRow.id 
                   ? data.shop
                   : shop
               )
             );

             // Update SWR cache immediately
             fetchShops(currentData => ({
               ...currentData,
               shops: [data.shop, ...(currentData?.shops || [])]
             }), { revalidate: false });
            
            // Clear optimistic updates after a short delay
            setTimeout(() => {
              setLocalShops(prev => prev.filter(s => s.id !== data.shop.id));
            }, 1000);
          } else {
             // Fallback if no shop returned
             fetchShops();
          }
          
          // Targeted cache invalidation
          try {
            mutate('/api/shops/dropdown');
          } catch (err) {
            console.error('Failed to mutate dropdown:', err);
          }
        } else {
          showError(data.message || "ไม่สามารถสร้างร้านค้าได้");
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
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          showSuccess("อัปเดตร้านค้าเรียบร้อย");
          notifyDataChange("shops-sync");
          mutate('/api/shops/dropdown');
          
          // Real-time update: Update SWR cache immediately
          if (data.shop) {
             fetchShops(currentData => ({
                ...currentData,
                shops: currentData?.shops?.map(s => s.id === updatedRow.id ? data.shop : s) || []
             }), { revalidate: false });
          } else {
             // Fallback
             fetchShops(currentData => ({
                ...currentData,
                shops: currentData?.shops?.map(s => s.id === updatedRow.id ? updatedRow : s) || []
             }), { revalidate: false });
          }
        } else {
          showError(data.message || "ไม่สามารถอัปเดตร้านค้าได้");
          fetchShops(); // Revert only on error
        }
      }
    } catch (error) {
      console.error('Error updating shop:', error);
      showError(error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      fetchShops();
    }
  };

  const handleRowDelete = async (rowId) => {
    // Skip API call for unsaved temp rows
    if (rowId.toString().startsWith("id_")) {
      return;
    }
    
    // 1. Optimistic update: Mark as deleted locally first
    deletedIdsRef.current.add(rowId);
    forceUpdate(n => n + 1); // Trigger re-render to update displayShops

    try {
      const res = await fetch(`${API_ENDPOINTS.SHOPS}?id=${rowId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("ลบร้านค้าเรียบร้อย");
        notifyDataChange("shops-sync");
        mutate('/api/shops/dropdown'); // Update dropdown data
        
        // Update SWR cache effectively
        fetchShops(currentData => ({
            ...currentData,
            shops: currentData?.shops?.filter(s => s.id !== rowId) || []
        }), { revalidate: true });

        // Remove from deletedIdsRef after a delay to allow server sync
        setTimeout(() => {
          if (deletedIdsRef.current.has(rowId)) {
            deletedIdsRef.current.delete(rowId);
          }
        }, 5000);
      } else {
        showError(data.message);
        // Revert optimistic delete on error
        deletedIdsRef.current.delete(rowId);
        forceUpdate(n => n + 1);
        fetchShops(); // Re-fetch to restore data
      }
    } catch (error) {
      showError(error.message);
      // Revert optimistic delete on error
      deletedIdsRef.current.delete(rowId);
      forceUpdate(n => n + 1);
      fetchShops(); // Re-fetch to restore data
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
        credentials: "include",
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
          credentials: "include",
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
        credentials: "include",
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
        credentials: "include",
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
    try {
      // Validate required fields
      if (!formData.shop_name || formData.shop_name.trim() === "") {
        throw new Error("กรุณาระบุชื่อร้านค้า");
      }

      // Create shop first
      const shopPayload = {
        shop_name: formData.shop_name?.trim() || "",
        owner_name: formData.owner_name?.trim() || "",
        phone: formData.phone?.trim() || "",
        address: formData.address?.trim() || "",
        email: formData.email?.trim() || "",
        notes: formData.notes?.trim() || "",
        custom_fields: formData.custom_fields || {},
      };

      const shopRes = await fetch(API_ENDPOINTS.SHOPS, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(shopPayload),
      });
      const shopData = await shopRes.json();

      if (!shopData.success) {
        throw new Error(shopData.message || "ไม่สามารถสร้างร้านค้าได้");
      }

      // If user wants to create license too
      if (formData.create_license && formData.license_type_id && formData.license_number) {
        const newShopId = shopData.shop_id || shopData.id;

        if (newShopId) {
          const licenseRes = await fetch(API_ENDPOINTS.LICENSES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              shop_id: newShopId,
              license_type_id: formData.license_type_id,
              license_number: formData.license_number?.trim() || "",
              issue_date: new Date().toISOString().split("T")[0],
              status: "active",
            }),
          });
          const licenseData = await licenseRes.json();

          if (!licenseData.success) {
            throw new Error("สร้างร้านค้าแล้วแต่ไม่สามารถสร้างใบอนุญาตได้: " + (licenseData.message || "Unknown error"));
          }
        } else {
          throw new Error("สร้างร้านค้าแล้วแต่ไม่ได้รับ ID กลับมา");
        }
      }

      // Optimistic update: Add new shop to UI immediately
      // Handle different response formats between local and production
      const newShopId = shopData.shop?.id || shopData.shop_id || shopData.id || shopData.data?.id;
      
      // Debug logging for production
      if (process.env.NODE_ENV === 'production') {
        console.log('Shop creation response:', shopData);
        console.log('Extracted shop ID:', newShopId);
      }
      
      const newShop = {
        id: newShopId || `temp_${Date.now()}`, // Fallback ID for UI
        shop_name: formData.shop_name?.trim() || "",
        owner_name: formData.owner_name?.trim() || "",
        phone: formData.phone?.trim() || "",
        address: formData.address?.trim() || "",
        email: formData.email?.trim() || "",
        notes: formData.notes?.trim() || "",
        license_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(formData.custom_fields || {})
      };

      // Update local state immediately for instant UI feedback
      setLocalShops(prev => [newShop, ...prev]);
      
      // Update SWR cache immediately
      fetchShops(currentData => ({
        ...currentData,
        shops: [newShop, ...(currentData?.shops || [])]
      }), { revalidate: false });
      
      // Removed the setTimeout that clears localShops too early
      // Data will naturally deduplicate in displayShops when server data arrives
      
      // Targeted cache invalidation
      try {
        mutate('/api/shops/dropdown');
      } catch (err) {
        console.error('Failed to mutate dropdown:', err);
      }
    } catch (error) {
      console.error('Quick add shop error:', error);
      throw error; // Re-throw to let QuickAddModal handle the error display
    }
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
        <div className="mb-4">
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
              placeholder="ชื่อร้าน, เจ้าของ, เบอร์โทร, ที่อยู่, อีเมล..."
            />
          </div>
          <div className="filter-group">
            <label htmlFor="has-license-filter" className="filter-label">ใบอนุญาต</label>
            <CustomSelect
              id="has-license-filter"
              value={filterHasLicense}
              onChange={(e) => {
                setFilterHasLicense(e.target.value);
                pagination.resetPage();
              }}
              options={[
                { value: "", label: "ทั้งหมด" },
                { value: "yes", label: "มีใบอนุญาต" },
                { value: "no", label: "ไม่มีใบอนุญาตเลย" },
                { value: "all_expired", label: "🔴 ใบอนุญาตหมดอายุทั้งหมด" },
                { value: "no_active", label: "⚠️ ไม่มีใบอนุญาตที่ใช้งานได้" },
              ]}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="license-status-filter" className="filter-label">สถานะใบอนุญาต</label>
            <CustomSelect
              id="license-status-filter"
              value={filterLicenseStatus}
              onChange={(e) => {
                setFilterLicenseStatus(e.target.value);
                pagination.resetPage();
              }}
              options={[
                { value: "", label: "ทุกสถานะ" },
                { value: "active", label: "ปกติ" },
                { value: "expired", label: "หมดอายุ" },
                { value: "pending", label: "กำลังดำเนินการ" },
                { value: "suspended", label: "ถูกพักใช้" },
                { value: "revoked", label: "ถูกเพิกถอน" },
              ]}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="license-type-filter" className="filter-label">ประเภทใบอนุญาต</label>
            <CustomSelect
              id="license-type-filter"
              value={filterLicenseType}
              onChange={(e) => {
                setFilterLicenseType(e.target.value);
                pagination.resetPage();
              }}
              options={[{ value: "", label: "ทุกประเภท" }, ...typeOptions]}
            />
          </div>
        </div>
        </div>

        {!isLoading ? (
          <div style={{ overflow: "auto", maxHeight: "600px" }}>
            <ExcelTable
              key={`shops-${displayShops.length}-${isLoading}`}
              initialColumns={columns}
              initialRows={displayShops}
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
              preserveTempRows={false}
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
        onSubmit={handleQuickAddShop}
      />
    </div>
  );
}

export default function ShopsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <ShopsPageContent />
    </Suspense>
  );
}
