"use client";

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import { usePagination, useDropdownData, useAutoRefresh, notifyDataChange, useShops, useRealtime } from "@/hooks";
import { API_ENDPOINTS } from "@/constants";
import { showSuccess, showError, pendingDelete } from "@/utils/alerts";
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

  // Use useState + manual fetch (same pattern as licenses page)
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadDoneRef = useRef(false);
  const deletedIdsRef = useRef(new Set());

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

  // Define fetchCustomColumns
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

  // Fetch shops data (same pattern as fetchLicenses in licenses page)
  const fetchShops = useCallback(async () => {
    if (!initialLoadDoneRef.current) {
      setIsLoading(true);
    }
    try {
      const params = new URLSearchParams({
        page: page,
        limit: limit,
        search: debouncedSearch,
        has_license: filterHasLicense,
        license_status: filterLicenseStatus,
        license_type: filterLicenseType,
        // Add cache-busting timestamp
        _t: Date.now()
      });

      const response = await fetch(`${API_ENDPOINTS.SHOPS}?${params}`, { 
        credentials: "include",
        cache: "no-store" // Force no caching
      });
      const data = await response.json();

      if (data.success) {
        // Filter out items that are currently being deleted locally (เหมือน licenses page)
        const filteredShops = (data.shops || []).filter(s => !deletedIdsRef.current.has(s.id));
        setShops(filteredShops);
        updateFromResponse(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch shops:", error);
      showError("โหลดข้อมูลร้านค้าล้มเหลว");
    } finally {
      setIsLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, [updateFromResponse, page, limit, debouncedSearch, filterHasLicense, filterLicenseStatus, filterLicenseType]);

  // Initial data fetch and refetch when filters change
  useEffect(() => {
    fetchCustomColumns();
    fetchShops();
  }, [fetchCustomColumns, fetchShops]);

  // Auto-refresh: ปิดชั่วคราวเพื่อแก้ไขปัญหาการแสดงข้อมูลซ้ำ (เหมือน licenses page)
// useAutoRefresh(fetchShops, { interval: 30000, channel: "shops-sync" });

  // Supabase Realtime: Listen for DB changes
  useRealtime('shops', (payload) => {
    // ตรวจสอบว่าเป็นการเพิ่มข้อมูลหรือไม่ ถ้าใช่ไม่ต้องโหลดทับ
    if (payload && payload.eventType === 'INSERT') {
      // สำหรับการเพิ่มข้อมูลใหม่ ไม่ต้องโหลดทับเพราะมี optimistic update อยู่แล้ว
      return;
    }
    // Refresh list for other events (UPDATE, DELETE)
    fetchShops(); 
    mutate('/api/shops/dropdown');
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
      notes: updatedRow.notes || "",
    };

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
          const newId = data.shop?.id || data.id;
          
          let finalShop;
          if (data.shop) {
            finalShop = {
              ...data.shop,
              ...(data.shop.custom_fields || {})
            };
          } else {
            finalShop = { ...updatedRow, ...standardData, ...customValues, id: newId };
          }
          
          setShops(prev => prev.map(s => s.id === updatedRow.id ? finalShop : s));
          notifyDataChange("shops-sync");
          
          // Invalidate SWR cache to update other components immediately
          mutate(() => true, undefined, { revalidate: true });
          mutate('/api/shops/dropdown');
        } else {
          showError(data.message || "ไม่สามารถสร้างร้านค้าได้");
          fetchShops();
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
          
          // Invalidate SWR cache to update other components immediately
          mutate(() => true, undefined, { revalidate: true });
          mutate('/api/shops/dropdown');
          
          if (data.shop) {
             setShops(prev => prev.map(s => s.id === updatedRow.id ? data.shop : s));
          } else {
             setShops(prev => prev.map(s => s.id === updatedRow.id ? updatedRow : s));
          }
        } else {
          showError(data.message || "ไม่สามารถอัปเดตร้านค้าได้");
          fetchShops(); 
        }
      }
    } catch (error) {
      console.error('Error updating shop:', error);
      showError(error.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      fetchShops();
    }
  };

  const handleRowDelete = async (rowId) => {
    if (rowId.toString().startsWith("id_")) return;
    
    // Check if shop has licenses bound
    const shop = shops.find(s => s.id === rowId);
    if (shop && parseInt(shop.license_count || 0) > 0) {
      showError(`ไม่สามารถลบร้านค้าได้ (มีใบอนุญาต ${shop.license_count} ใบผูกอยู่)`);
      return;
    }
    
    // Show pending delete toast with undo option
    pendingDelete({
      itemName: `ร้านค้า "${shop?.shop_name || 'ร้านนี้'}"`,
      duration: 5000,
      onDelete: async () => {
        // Execute actual delete after timer expires
        try {
          const res = await fetch(`${API_ENDPOINTS.SHOPS}?id=${rowId}`, {
            method: "DELETE",
            credentials: "include",
          });
          const data = await res.json();
          
          if (data.success) {
            showSuccess("ลบร้านค้าเรียบร้อย");
            notifyDataChange("shops-sync");
            
            // Clear ALL SWR cache aggressively
            mutate(() => true, undefined, { revalidate: false });
            mutate('/api/shops/dropdown', undefined, { revalidate: false });
            
            // Force clear browser cache and fetch fresh data after a short delay
            setTimeout(() => {
              fetchShops();
            }, 100);
            
            // Clean up deleted IDs tracking
            setTimeout(() => {
              if (deletedIdsRef.current.has(rowId)) {
                deletedIdsRef.current.delete(rowId);
              }
            }, 5000);
          } else {
            // Delete failed - restore the item
            showError(data.message || "ลบร้านค้าล้มเหลว");
            deletedIdsRef.current.delete(rowId);
            fetchShops();
          }
        } catch (error) {
          // Delete failed - restore the item
          showError(error.message || "ลบร้านค้าล้มเหลว");
          deletedIdsRef.current.delete(rowId);
          fetchShops();
        }
      },
      onCancel: () => {
        // User cancelled - restore the item
        deletedIdsRef.current.delete(rowId);
        fetchShops();
      }
    });
    
    // 1. Optimistic update - remove from UI immediately
    deletedIdsRef.current.add(rowId);
    setShops(prev => prev.filter(s => s.id !== rowId));
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
    // 🔴 Bug fix: เดิมส่ง `shops` (state) ซึ่งเป็นข้อมูลแค่ page ปัจจุบัน (10 records)
    // → user กด Export แต่ได้ PDF ไม่ครบ! ต้อง fetch ทั้งหมดก่อน โดย apply filters ปัจจุบันด้วย
    // แสดง loading ระหว่าง fetch เพราะอาจใช้เวลา (ข้อมูลเยอะ)
    Swal.fire({
      title: "กำลังเตรียมข้อมูล...",
      text: "กรุณารอสักครู่",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      // Fetch all shops ด้วย limit สูง (2000) + filters ปัจจุบัน
      const params = new URLSearchParams({
        page: 1,
        limit: 2000,
        search: debouncedSearch,
        has_license: filterHasLicense,
        license_status: filterLicenseStatus,
        license_type: filterLicenseType,
        _t: Date.now(),
      });

      const response = await fetch(`${API_ENDPOINTS.SHOPS}?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "ไม่สามารถโหลดข้อมูลทั้งหมด");
      }

      const allShops = data.shops || [];

      if (allShops.length === 0) {
        Swal.close();
        showError("ไม่มีข้อมูลสำหรับส่งออก");
        return;
      }

      // 🏷️ สร้าง filter info ภาษาไทย สำหรับแสดงใน PDF
      const pdfFilters = {};
      if (debouncedSearch) pdfFilters["คำค้นหา"] = debouncedSearch;
      if (filterHasLicense) {
        const hasLicenseLabels = {
          yes: "มีใบอนุญาต",
          no: "ไม่มีใบอนุญาตเลย",
          all_expired: "ใบอนุญาตหมดอายุทั้งหมด",
          no_active: "ไม่มีใบอนุญาตที่ใช้งานได้",
        };
        pdfFilters["ใบอนุญาต"] = hasLicenseLabels[filterHasLicense] || filterHasLicense;
      }
      if (filterLicenseStatus) {
        const statusLabels = {
          active: "ปกติ",
          expired: "หมดอายุ",
          pending: "กำลังดำเนินการ",
          suspended: "ถูกพักใช้",
          revoked: "ถูกเพิกถอน",
        };
        pdfFilters["สถานะใบอนุญาต"] = statusLabels[filterLicenseStatus] || filterLicenseStatus;
      }
      if (filterLicenseType) {
        const typeName = typeOptions.find((t) => String(t.value) === String(filterLicenseType))?.label;
        if (typeName) pdfFilters["ประเภทใบอนุญาต"] = typeName;
      }

      await exportShopsToPDF(allShops, pdfFilters);

      Swal.close();
      showSuccess(`ส่งออก PDF ${allShops.length} รายการเรียบร้อยแล้ว`);
    } catch (err) {
      Swal.close();
      console.error("Export shops failed:", err);
      showError(err.message || "Export PDF ล้มเหลว");
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
      // 🛡️ Bug fix: เดิมถ้า license POST fail → shop จะค้างใน DB (orphan record)
      // → ต้อง rollback ด้วยการลบ shop ที่เพิ่งสร้าง แล้วค่อย throw error
      const newShopId = shopData.shop?.id || shopData.shop_id || shopData.id;

      if (formData.create_license && formData.license_type_id && formData.license_number) {
        if (!newShopId) {
          throw new Error("สร้างร้านค้าแล้วแต่ไม่ได้รับ ID กลับมา");
        }

        try {
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
            // 🛡️ Rollback: ลบ shop ที่เพิ่งสร้างเพื่อป้องกัน orphan record
            await fetch(`${API_ENDPOINTS.SHOPS}?id=${newShopId}`, {
              method: "DELETE",
              credentials: "include",
            }).catch((e) => console.warn("Shop rollback failed:", e));
            throw new Error(
              "สร้างใบอนุญาตล้มเหลว: " + (licenseData.message || "Unknown error") + " — ร้านค้าถูกยกเลิกโดยอัตโนมัติ"
            );
          }
        } catch (licenseErr) {
          // Network error / unexpected error → rollback shop ด้วย
          if (!licenseErr.message?.includes("ร้านค้าถูกยกเลิกโดยอัตโนมัติ")) {
            await fetch(`${API_ENDPOINTS.SHOPS}?id=${newShopId}`, {
              method: "DELETE",
              credentials: "include",
            }).catch((e) => console.warn("Shop rollback failed:", e));
          }
          throw licenseErr;
        }
      }

      showSuccess("เพิ่มร้านค้าเรียบร้อย");
      setShowQuickAdd(false);
      fetchShops();
      mutate('/api/shops/dropdown');
    } catch (error) {
      console.error('Quick add shop error:', error);
      throw error; 
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
            <span>คำแนะนำ: คุณสามารถเพิ่ม/ลบร้านค้า, แก้ไขข้อมูลร้านค้า, และส่งออก PDF ได้</span>
          </span>
        </h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={fetchShops} title="รีเฟรช">
            <i className="fas fa-sync-alt"></i> รีเฟรช
          </button>
          <button type="button" className="btn btn-success btn-sm" onClick={handleExport}>
            <i className="fas fa-file-pdf"></i> Export PDF
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowQuickAdd(true)}>
            <i className="fas fa-plus"></i> เพิ่มร้านค้า
          </button>
        </div>
      </div>

      <div className="card-body">
        <div className="mb-4">
          <div className="filter-grid">
            <div className="filter-group">
              <label htmlFor="shop-search" className="filter-label">ค้นหาร้านค้า</label>
              <SearchInput
                id="shop-search"
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  pagination.resetPage();
                }}
                placeholder="ชื่อร้าน, เจ้าของ, เบอร์โทร, ที่อยู่..."
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
                  { value: "all_expired", label: "ใบอนุญาตหมดอายุทั้งหมด" },
                  { value: "no_active", label: "ไม่มีใบอนุญาตที่ใช้งานได้" },
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
              // 🛠 stable key — ไม่ include isLoading/rows.length เพื่อกัน re-mount
              // ทุกครั้งที่ loading toggle หรือ add/delete row → สูญเสีย undo stack + selection
              key="shops-table"
              initialColumns={columns}
              initialRows={shops}
              onRowUpdate={handleRowUpdate}
              onRowDelete={handleRowDelete}
              onRowAdd={handleRowAdd}
              onColumnAdd={handleColumnAdd}
              onColumnUpdate={handleColumnUpdate}
              onColumnDelete={handleColumnDelete}
              onRowClick={handleRowClick}
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
