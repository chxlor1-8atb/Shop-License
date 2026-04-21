"use client";

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePagination, useDropdownData, useAutoRefresh, notifyDataChange, useRealtime } from "@/hooks";
import { API_ENDPOINTS, STATUS_OPTIONS, STATUS_FILTER_OPTIONS } from "@/constants";
import Swal from "sweetalert2";
import { showSuccess, showError, pendingDelete } from "@/utils/alerts";
import Pagination from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/FilterRow";
import CustomSelect from "@/components/ui/CustomSelect";
import TableSkeleton from "@/components/ui/TableSkeleton";
import QuickAddModal from "@/components/ui/QuickAddModal";
import ExcelTable from "@/components/ExcelTable";
import { mutate } from "swr";

// Lazy load PDF export to reduce initial bundle size
const exportLicensesToPDF = async (...args) => {
  const { exportLicensesToPDF: exportFn } = await import("@/lib/pdfExportSafe");
  return exportFn(...args);
};

// Helper to format options for ExcelTable select columns
const formatOptions = (items, labelKey = "name", valueKey = "id") =>
  items.map((item) => ({ label: item[labelKey], value: item[valueKey] }));

// Special value for "create new shop" option
const CREATE_NEW_SHOP_VALUE = "__CREATE_NEW__";

function LicensesPageContent() {
  const searchParams = useSearchParams();
  const { shopOptions, shopOptionsDetailed, typeOptions, shops, error: dropdownError } = useDropdownData(); // Use hook for dropdown data
  
  useEffect(() => {
    if (dropdownError) {
      console.error("Dropdown data error:", dropdownError);
      showError("โหลดข้อมูลร้านค้าหรือประเภทล้มเหลว กรุณารีเฟรชหน้าจอ");
    }
  }, [dropdownError]);
  const pagination = usePagination();
  const { page, limit, updateFromResponse } = pagination;

  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDoneRef = useRef(false);
  const deletedIdsRef = useRef(new Set());
  
  // Initialize from URL params
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [filterType, setFilterType] = useState(searchParams.get("license_type") || "");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [filterShop, setFilterShop] = useState(searchParams.get("shop_id") || "");
  
  // Modal for creating new shop
  const [showQuickAddShop, setShowQuickAddShop] = useState(false);
  // Modal for quick adding license
  const [showQuickAddLicense, setShowQuickAddLicense] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Enhanced shop options with "Create New" option
  // ใช้ shopOptionsDetailed เพื่อให้ dropdown แยกร้านชื่อซ้ำได้ (label รวมเจ้าของ + เบอร์)
  // — cell display ใช้ shop_name (sort) ผ่าน render() ด้านล่าง
  const enhancedShopOptions = useMemo(() => [
    { value: CREATE_NEW_SHOP_VALUE, label: "➕ สร้างร้านค้าใหม่...", shop_name: "➕ สร้างร้านค้าใหม่..." },
    ...shopOptionsDetailed,
  ], [shopOptionsDetailed]);

  // Define Standard Columns with dependencies
  // We need to recreate columns when options change
  const [columns, setColumns] = useState([]);

  const fetchCustomColumns = useCallback(async () => {
    const baseCols = [
      {
        id: "shop_id",
        name: "ร้านค้า",
        width: 200,
        type: "select",
        options: enhancedShopOptions,
        display_order: 1,
        align: "center",
        readOnly: false,
        render: (value, row, isEditing) => {
          // ถ้ากำลังแก้ไข ไม่ต้องแสดง render function
          if (isEditing) return null;

          // ใช้ shop_name (สั้น) สำหรับ cell display แทน label (detailed รวมเจ้าของ)
          // เพื่อให้ตารางไม่กว้างเกินไป — เจ้าของมี column "เจ้าของร้าน" แยกอยู่แล้ว
          const opt = enhancedShopOptions.find((o) => o.value == value);
          const shopName = opt?.shop_name || row.shop_name || opt?.label || value;
          if (!value || value === CREATE_NEW_SHOP_VALUE) return <span className="text-muted">-</span>;
          return (
            <Link
              href={`/dashboard/shops?search=${encodeURIComponent(shopName)}`}
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
              title={`ดูข้อมูลร้าน: ${shopName}`}
            >
              {shopName} <i className="fas fa-external-link-alt" style={{ fontSize: '0.65em', opacity: 0.6 }}></i>
            </Link>
          );
        },
      },
      {
        id: "owner_name",
        name: "เจ้าของร้าน",
        width: 180,
        display_order: 1.5, // วางต่อจากร้านค้าทันที
        align: "center",
        readOnly: true, // ดึงจากตาราง shops อัตโนมัติ แก้ไขที่หน้าร้านค้าเท่านั้น
        render: (value, row) => {
          // ค่าอาจมาทั้งทาง row.owner_name (จาก API) หรือ lookup จาก shops list
          const ownerFromRow = row.owner_name;
          const ownerFromShops = shops?.find((s) => s.id == row.shop_id)?.owner_name;
          const name = value || ownerFromRow || ownerFromShops || "";
          if (!name) return <span className="text-muted">-</span>;
          return (
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }} title={name}>
              {name}
            </span>
          );
        },
      },
      {
        id: "license_type_id",
        name: "ประเภทใบอนุญาต",
        width: 200,
        type: "select",
        options: typeOptions || [],
        display_order: 2,
        align: "center",
        readOnly: false,
      },
      {
        id: "license_number", 
        name: "เลขที่ใบอนุญาต", 
        width: 200,
        display_order: 5,
        align: "center",
        readOnly: false,
      },
      {
        id: "issue_date",
        name: "วันที่ออก",
        width: 150,
        type: "date",
        align: "center",
        display_order: 6,
        readOnly: false,
      },
      {
        id: "expiry_date",
        name: "วันหมดอายุ",
        width: 150,
        type: "date",
        align: "center",
        display_order: 7,
        readOnly: false,
      },
      {
        id: "status",
        name: "สถานะ",
        width: 120,
        align: "center",
        type: "select",
        options: STATUS_OPTIONS,
        isBadge: true,
        display_order: 10,
        readOnly: false,
      },
          ];

    try {
      const res = await fetch(
        `/api/custom-fields?entity_type=licenses`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        const apiFields = data.fields || [];

        // Update Base Cols with info from DB if available
        const updatedBaseCols = baseCols.map((col) => {
           const match = apiFields.find((f) => f.field_name === col.id);
           if (match) {
             return {
               ...col,
               name: match.field_label, 
               db_id: match.id,
               isSystem: true,
               display_order: match.display_order !== undefined && match.display_order !== null 
                  ? Number(match.display_order) 
                  : col.display_order
             };
           }
           return col;
        });

        // Get pure custom columns with proper ordering
        const pureCustomCols = apiFields
          .filter((f) => !baseCols.find((bc) => bc.id === f.field_name))
          .map((f) => {
            const customCol = {
              id: f.field_name,
              name: f.field_label,
              type: f.field_type || "text",
              width: 150,
              align: "center",
              isCustom: true,
              db_id: f.id,
              display_order: f.display_order !== undefined && f.display_order !== null 
                ? Number(f.display_order) 
                : 99,
              readOnly: false, // ตรวจสอบว่า custom fields สามารถแก้ไขได้
            };
            
            return customCol;
          });

        // Combine and sort all columns by display_order
        const allColumns = [...updatedBaseCols, ...pureCustomCols];
        const sortedColumns = allColumns.sort((a, b) => {
          const orderA = a.display_order !== undefined ? a.display_order : 999;
          const orderB = b.display_order !== undefined ? b.display_order : 999;
          return orderA - orderB;
        });

        setColumns(sortedColumns);
      } else {
        setColumns(baseCols);
      }
    } catch (e) {
      console.error(e);
      setColumns(baseCols);
    }
  }, [enhancedShopOptions, typeOptions]);

  // Reload columns when options change (fixes missing labels in table)
  useEffect(() => {
    fetchCustomColumns();
  }, [fetchCustomColumns]);

  const fetchLicenses = useCallback(async () => {
    // Only show skeleton on initial load, not on refetch
    if (!initialLoadDoneRef.current) {
      setLoading(true);
    }
    
    try {
      const params = new URLSearchParams({
        page: page,
        limit: limit,
        search: debouncedSearch,
        license_type: filterType,
        status: filterStatus,
        shop_id: filterShop,
        // 🛠 Cache-busting timestamp — ให้เหมือน fetchShops (กัน Vercel edge cache/SWR stale)
        _t: Date.now(),
      });

      const response = await fetch(`${API_ENDPOINTS.LICENSES}?${params}`, {
        credentials: "include",
        cache: "no-store", // Force no caching (consistent with shops page)
      });
      const data = await response.json();

      if (data.success) {
        // Flatten custom_fields
        let formattedLicenses = data.licenses.map((l, index) => {
          const flattened = {
            ...l,
            ...(l.custom_fields || {})
          };
          
          return flattened;
        });
        
        // Filter out items that are currently being deleted locally
        formattedLicenses = formattedLicenses.filter(l => !deletedIdsRef.current.has(l.id));
        
        setLicenses(formattedLicenses);
        // เรียก updateFromResponse ตรงๆ แทนที่จะเป็น dependency
        updateFromResponse(data.pagination);
      } else {
        console.error('❌ fetchLicenses failed:', data.message);
        showError("โหลดข้อมูลใบอนุญาตล้มเหลว");
      }
    } catch (error) {
      console.error('❌ fetchLicenses error:', error);
      showError("โหลดข้อมูลใบอนุญาตล้มเหลว");
    } finally {
      setLoading(false);
      initialLoadDoneRef.current = true;
    }
  }, [page, limit, debouncedSearch, filterType, filterStatus, filterShop, updateFromResponse]);

  // Initial license data fetch and refetch when filters change
  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  // Auto-refresh: sync data every 5s + on tab focus + cross-tab
  // ปิดชั่วคราวเพื่อแก้ไขปัญหาการเพิ่มข้อมูลซ้ำ
  // useAutoRefresh(fetchLicenses, { interval: 5000, channel: "licenses-sync" });

  // Supabase Realtime: Listen for DB changes
  useRealtime('licenses', (payload) => {
    // console.log("[Realtime] Licenses updated:", payload);
    // ตรวจสอบว่าเป็นการเพิ่มข้อมูลหรือไม่ ถ้าใช่ไม่ต้องโหลดทับ
    if (payload.eventType === 'INSERT') {
      // สำหรับการเพิ่มข้อมูลใหม่ ไม่ต้องโหลดทับเพราะมี optimistic update อยู่แล้ว
      return;
    }
    // Refresh list for other events (UPDATE, DELETE)
    fetchLicenses();
    // Refresh global states
    mutate('/api/dashboard?action=stats');
    mutate('/api/dashboard?action=expiring_count');
    mutate('/api/dashboard?action=license_breakdown');
  });



  // --- Row Handlers ---

  const handleRowUpdate = async (updatedRow) => {
    const existingLicense = licenses.find(l => l.id === updatedRow.id);
    const isNew = updatedRow.id.toString().startsWith("id_");

    // Check for "Create New Shop" special selection
    if (updatedRow.shop_id === CREATE_NEW_SHOP_VALUE) {
      setShowQuickAddShop(true);
      return;
    }

    const STANDARD_COLUMNS_IDS = ["shop_id", "license_type_id", "license_number", "issue_date", "expiry_date", "status"];
    
    // 1. Identify changed standard fields
    const standardData = {};
    STANDARD_COLUMNS_IDS.forEach(key => {
      const existingValue = existingLicense?.[key] ?? '';
      const updatedValue = updatedRow[key] ?? '';
      if (updatedValue !== existingValue) {
        standardData[key] = updatedRow[key];
      }
    });

    // 2. Identify changed custom fields
    const customValues = {};
    Object.keys(updatedRow).forEach(key => {
      if (key.startsWith('cf_')) {
        const existingValue = existingLicense?.[key] ?? '';
        const updatedValue = updatedRow[key] ?? '';
        if (updatedValue !== existingValue) {
          customValues[key] = updatedRow[key];
        }
      }
    });

    // 3. Stop if no changes
    if (Object.keys(standardData).length === 0 && Object.keys(customValues).length === 0) {
      return;
    }

    try {
      let res, data;

      if (isNew) {
        // POST for new records
        const payload = {
          ...standardData,
          shop_id: updatedRow.shop_id,
          license_type_id: updatedRow.license_type_id,
          license_number: updatedRow.license_number,
          custom_fields: customValues,
        };

        res = await fetch(API_ENDPOINTS.LICENSES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        data = await res.json();

        if (data.success) {
          showSuccess("สร้างใบอนุญาตเรียบร้อย");
          const newId = data.license?.id || data.id;
          
          let finalLicense;
          if (data.license) {
            finalLicense = {
              ...data.license,
              ...(data.license.custom_fields || {})
            };
          } else {
            finalLicense = { ...updatedRow, ...standardData, ...customValues, id: newId };
          }
          
          setLicenses(prev => prev.map(l => l.id === updatedRow.id ? finalLicense : l));
          notifyDataChange("licenses-sync");

        } else {
          showError(data.message);
          fetchLicenses();
        }
      } else {
        // PUT for existing records
        // ALWAYS include required fields for the API
        // 🛡️ status handling: ใน state เก็บทั้ง `status` (computed: active/expired) และ
        //    `original_status` (stored: active/expired/pending/suspended/revoked)
        //    เวลา PUT ต้องส่ง `original_status` ไป server (เพื่อไม่ทับ stored value ด้วย computed)
        //    ยกเว้นกรณี user แก้ status จาก UI → standardData.status จะ override อีกที
        //    (เพราะ `...standardData` มาหลัง status base ใน spread)
        const payload = {
          id: updatedRow.id,
          shop_id: updatedRow.shop_id || existingLicense?.shop_id,
          license_type_id: updatedRow.license_type_id || existingLicense?.license_type_id,
          license_number: updatedRow.license_number || existingLicense?.license_number,
          status: existingLicense?.original_status || updatedRow.original_status || updatedRow.status,
          ...standardData,
          custom_fields: customValues,
        };

        res = await fetch(API_ENDPOINTS.LICENSES, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        data = await res.json();

        if (data.success) {
          showSuccess("อัปเดตใบอนุญาตเรียบร้อย");
          if (data.license) {
            // Flatten custom_fields before updating state
            const flattenedLicense = {
              ...data.license,
              ...(data.license.custom_fields || {})
            };
            setLicenses(prev => prev.map(l => l.id === updatedRow.id ? flattenedLicense : l));
          } else {
            // Fallback manual update if server doesn't return full object
            setLicenses(prev => prev.map(l => l.id === updatedRow.id ? { ...l, ...standardData, ...customValues } : l));
            
            // Targeted catch invalidation
            setTimeout(() => {
              fetchLicenses();
            }, 500);
          }

          notifyDataChange("licenses-sync");
        } else {
          showError(data.message);
          fetchLicenses(); // Revert on error
        }
      }
    } catch (error) {
      console.error("❌ Update failed:", error);
      showError(error.message);
      fetchLicenses();
    }
  };


  const handleRowDelete = async (rowId) => {
    // Find license for display name
    const license = licenses.find(l => l.id === rowId);
    const licenseName = license?.license_number || `ใบอนุญาต #${rowId}`;
    const shopName = license?.shop_name || 'ร้านค้า';
    
    // Show pending delete toast with undo option
    pendingDelete({
      itemName: `${licenseName} (${shopName})`,
      duration: 5000,
      onDelete: async () => {
        // Execute actual delete after timer expires
        try {
          const res = await fetch(`${API_ENDPOINTS.LICENSES}?id=${rowId}`, {
            method: "DELETE",
            credentials: "include",
          });
          
          const data = await res.json();
          
          if (data.success) {
            showSuccess("ลบใบอนุญาตเรียบร้อย");
            notifyDataChange("licenses-sync");
            
            // Revalidate SWR cache to update other components
            mutate(() => true, undefined, { revalidate: true });
            
            // Remove from deletedIdsRef after a delay
            setTimeout(() => {
                if (deletedIdsRef.current.has(rowId)) {
                    deletedIdsRef.current.delete(rowId);
                }
            }, 5000);
          } else {
            // Delete failed - restore the item
            showError(data.message);
            deletedIdsRef.current.delete(rowId);
            fetchLicenses();
          }
        } catch (error) {
          // Delete failed - restore the item
          showError(error.message);
          deletedIdsRef.current.delete(rowId);
          fetchLicenses();
        }
      },
      onCancel: () => {
        // User cancelled - restore the item
        deletedIdsRef.current.delete(rowId);
        fetchLicenses();
      }
    });
    
    // 1. Optimistic update: Mark as deleted locally
    deletedIdsRef.current.add(rowId);
    setLicenses((prev) => prev.filter((l) => l.id !== rowId));
  };

  const handleRowAdd = (newRow) => {
    // Add the new row to the local state immediately
    setLicenses(prev => [...prev, newRow]);
  };

  const handleColumnAdd = async (newCol) => {
    const fieldName = `cf_${Date.now()}`;
    const payload = {
      entity_type: "licenses",
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
    const col = columns.find((c) => c.id === updatedCol.id);
    if (!col) return;

    // If it's a standard column without a DB record yet, creating it now allows persistence of the name change.
    if (!col.db_id) {
      const payload = {
        entity_type: "licenses",
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
          // Refresh to link this column to the new DB ID
          fetchCustomColumns();
        } else {
          showError(data.message);
        }
      } catch (e) {
        showError(e.message);
      }
      return;
    }

    // Existing DB Update Logic
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

  // --- Renew License Handler ---
  const handleRenewLicense = useCallback(async (rowId) => {
    const license = licenses.find((l) => l.id === rowId);
    if (!license) {
      showError("ไม่พบข้อมูลใบอนุญาต");
      return;
    }

    const shopName = shopOptions.find((o) => o.value == license.shop_id)?.label || license.shop_name || "";
    const typeName = typeOptions.find((o) => o.value == license.license_type_id)?.label || license.type_name || "";
    const currentExpiry = license.expiry_date
      ? new Date(license.expiry_date).toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })
      : "ไม่ระบุ";

    // Calculate new expiry for display
    const currentExp = license.expiry_date ? new Date(license.expiry_date) : new Date();
    const today = new Date();
    const baseDate = currentExp > today ? currentExp : today;
    const newExp = new Date(baseDate);
    newExp.setFullYear(newExp.getFullYear() + 1);
    const newExpiryDisplay = newExp.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

    const confirmResult = await Swal.fire({
      title: "🔄 ต่ออายุใบอนุญาต",
      html: `
        <div style="text-align:left; margin-bottom:1rem; padding:0.75rem 1rem; background:#f8f9fa; border-radius:8px; font-size:0.9rem;">
          <div style="margin-bottom:0.25rem;"><strong>ร้านค้า:</strong> ${shopName}</div>
          <div style="margin-bottom:0.25rem;"><strong>ประเภท:</strong> ${typeName}</div>
          <div style="margin-bottom:0.25rem;"><strong>เลขที่:</strong> ${license.license_number || "-"}</div>
          <div><strong>หมดอายุปัจจุบัน:</strong> <span style="color:#ef4444; font-weight:600;">${currentExpiry}</span></div>
        </div>
        <div style="text-align:left; font-size:0.95rem;">
          <p>⚡ ต่ออายุ 1 ปี → วันหมดอายุใหม่: <strong style="color:#10b981;">${newExpiryDisplay}</strong></p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "✅ ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d97757",
    });

    if (!confirmResult.isConfirmed) return;

    try {
      const res = await fetch("/api/licenses/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: license.id,
          mode: "one_year",
        }),
      });
      const data = await res.json();

      if (data.success) {
        showSuccess(data.message);
        // No need to call fetchLicenses() - SWR will handle revalidation
      } else {
        showError(data.message);
      }
    } catch (error) {
      showError(error.message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenses, shopOptions, typeOptions, fetchLicenses]);

  const customContextMenuItems = useMemo(() => [
    {
      label: "🔄 ต่ออายุใบอนุญาต",
      icon: "fas fa-sync-alt",
      onClick: handleRenewLicense,
    },
  ], [handleRenewLicense]);

  const handleExport = async () => {
    // 🔴 Bug fix: เดิมส่ง `licenses` (state = data หน้าปัจจุบัน 10 รายการ) → PDF ไม่ครบ
    // → ต้อง fetch ใหม่ด้วย limit สูง (2000) + apply filter ปัจจุบัน ก่อน export
    // + ใช้ key ภาษาไทยสำหรับ filter info (เดิมใช้ search/type/status/shop = อังกฤษ)
    Swal.fire({
      title: "กำลังเตรียมข้อมูล...",
      text: "กรุณารอสักครู่",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const params = new URLSearchParams({
        page: 1,
        limit: 2000,
        search: debouncedSearch,
        license_type: filterType,
        status: filterStatus,
        shop_id: filterShop,
      });

      const response = await fetch(`${API_ENDPOINTS.LICENSES}?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "ไม่สามารถโหลดข้อมูลทั้งหมด");
      }

      // Flatten custom_fields เพื่อให้ exporter อ่านได้เหมือนกับที่หน้าแสดง
      const allLicenses = (data.licenses || []).map((l) => ({
        ...l,
        ...(l.custom_fields || {}),
      }));

      if (allLicenses.length === 0) {
        Swal.close();
        showError("ไม่มีข้อมูลสำหรับส่งออก");
        return;
      }

      // 🏷️ Filter info ภาษาไทย
      const pdfFilters = {};
      if (debouncedSearch) pdfFilters["คำค้นหา"] = debouncedSearch;
      if (filterType) {
        const typeName = typeOptions.find((t) => String(t.value) === String(filterType))?.label;
        if (typeName) pdfFilters["ประเภทใบอนุญาต"] = typeName;
      }
      if (filterStatus) {
        const statusName = STATUS_OPTIONS.find((s) => String(s.value) === String(filterStatus))?.label;
        if (statusName) pdfFilters["สถานะ"] = statusName;
      }
      if (filterShop) {
        const shopName = shopOptions.find((s) => String(s.value) === String(filterShop))?.label;
        if (shopName) pdfFilters["ร้านค้า"] = shopName;
      }

      await exportLicensesToPDF(allLicenses, pdfFilters);

      Swal.close();
      showSuccess(`ส่งออก PDF ${allLicenses.length} รายการเรียบร้อยแล้ว`);
    } catch (err) {
      Swal.close();
      console.error("Export licenses failed:", err);
      showError(err.message || "Export PDF ล้มเหลว");
    }
  };

  // Handle creating new shop from licenses page
  const handleQuickAddShop = async (formData) => {
    const shopPayload = {
      shop_name: formData.shop_name,
      owner_name: formData.owner_name,
      phone: formData.phone,
      address: formData.address,
    };

    const res = await fetch(API_ENDPOINTS.SHOPS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(shopPayload),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "ไม่สามารถสร้างร้านค้าได้");
    }

    showSuccess("สร้างร้านค้าเรียบร้อย กรุณาเลือกร้านค้าใหม่จากรายการ");
    // Targeted cache invalidation for shop dropdown only
    mutate('/api/shops/dropdown');
  };

  // Handle creating new license via quick add modal
  const handleQuickAddLicense = async (formData) => {
    const payload = {
      shop_id: formData.shop_id,
      license_type_id: formData.license_type_id,
      license_number: formData.license_number,
      issue_date: formData.issue_date,
      expiry_date: formData.expiry_date,
      status: formData.status || "active",
      custom_fields: formData.custom_fields || {}, // Include custom fields
    };

    const res = await fetch(API_ENDPOINTS.LICENSES, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "ไม่สามารถสร้างใบอนุญาตได้");
    }

    showSuccess("สร้างใบอนุญาตเรียบร้อย");
    // Targeted cache invalidation
    mutate('/api/shops/dropdown');
    mutate('/api/license-types/dropdown');
    
    // Manually add to state to prevent flashing/disappearing due to pagination
    // 🛠 Bug fix: เดิม setLicenses(prev => [data.license, ...prev]) ไม่ flatten custom_fields
    //    → ถ้า license ใหม่มี custom_fields → cell ใน ExcelTable ว่าง
    //    (เพราะ ExcelTable อ่าน row[field_name] โดยตรง ไม่ใช่ row.custom_fields[field_name])
    if (data.license) {
      const flattenedLicense = {
        ...data.license,
        ...(data.license.custom_fields || {}),
      };
      setLicenses(prev => [flattenedLicense, ...prev]);
    } else {
       // Fallback if full object not returned
       fetchLicenses();
    }
  };

  return (
    <div className="card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 className="card-title" style={{ margin: 0 }}>
          <i className="fas fa-file-alt"></i> ใบอนุญาต
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
          <button type="button" className="btn btn-outline-primary btn-sm" onClick={fetchLicenses} title="รีเฟรชข้อมูล">
            <i className="fas fa-sync-alt"></i> รีเฟรช
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowQuickAddLicense(true)}>
            <i className="fas fa-plus"></i> เพิ่มใบอนุญาต
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="mb-4">
          {/* Filters */}
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="license-search" className="filter-label">ค้นหา</label>
            <SearchInput
              id="license-search"
              value={search}
              onChange={(val) => {
                setSearch(val);
                pagination.resetPage();
              }}
              placeholder="เลขที่ใบอนุญาต, ร้านค้า, ประเภท, สถานะ..."
            />
          </div>
          <div className="filter-group">
            <label htmlFor="license-type-filter" className="filter-label">ประเภทใบอนุญาต</label>
            <CustomSelect
              id="license-type-filter"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                pagination.resetPage();
              }}
              options={[{ value: "", label: "ทุกประเภท" }, ...typeOptions]}
            />
          </div>
          <div className="filter-group">
            <label htmlFor="license-status-filter" className="filter-label">สถานะ</label>
            <CustomSelect
              id="license-status-filter"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                pagination.resetPage();
              }}
              options={STATUS_FILTER_OPTIONS}
            />
          </div>
        </div>
        </div>

        {!loading ? (
          <div style={{ overflow: "auto", maxHeight: "600px" }}>
            <ExcelTable
              // 🛠 Bug fix: เดิม key ผูกกับ `licenses.length` + `loading` → ทุกครั้งที่ add/delete
              //   row หรือ loading toggle → table re-mount → undo stack + selection + scroll
              //   position หาย. ใช้ stable key แทน
              key="licenses-table"
              initialColumns={columns}
              initialRows={licenses}
              onRowUpdate={handleRowUpdate}
              onRowDelete={handleRowDelete}
              onRowAdd={handleRowAdd}
              onColumnAdd={handleColumnAdd}
              onColumnUpdate={handleColumnUpdate}
              onColumnDelete={handleColumnDelete}
              onExport={handleExport}
              exportLabel="Export PDF"
              exportIcon="fa-file-pdf"
              customContextMenuItems={customContextMenuItems}
            />
          </div>
        ) : (
          <div className="table-card">
            <div className="table-container">
              <table className="excel-table">
                <thead>
                  <tr>
                    {columns.length > 0
                      ? columns.map((col) => (
                          <th
                            key={col.id}
                            style={{ width: col.width, minWidth: col.width, textAlign: "center" }}
                          >
                            <div className="th-content" style={{ justifyContent: "center" }}>{col.name}</div>
                          </th>
                        ))
                      : [
                          "ร้านค้า",
                          "ประเภทใบอนุญาต",
                          "สถานที่จำหน่าย",
                          "จำนวนเงิน",
                          "เลขที่ใบอนุญาต",
                          "วันที่ออก",
                          "วันหมดอายุ",
                          "พื้นที่ (ตารางเมตร)",
                          "พื้นที่ (แรงม้า)",
                          "สถานะ",
                        ].map((header, i) => (
                          <th key={i} style={{ minWidth: "120px", textAlign: "center" }}>
                            <div className="th-content" style={{ justifyContent: "center" }}>{header}</div>
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  <TableSkeleton
                    rows={10}
                    columns={[
                      { width: "180px", center: true }, // Shop
                      { width: "150px", center: true }, // Type
                      { width: "150px", center: true }, // Location
                      { width: "100px", center: true }, // Amount
                      { width: "150px", center: true }, // License No
                      { width: "120px", center: true }, // Issue Date
                      { width: "120px", center: true }, // Expiry
                      { width: "100px", center: true }, // Area Sqm
                      { width: "100px", center: true }, // Area HP
                      { width: "120px", center: true, rounded: true } // Status
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

      {/* Quick Add Shop Modal */}
      <QuickAddModal
        isOpen={showQuickAddShop}
        onClose={() => setShowQuickAddShop(false)}
        type="shop"
        onSubmit={handleQuickAddShop}
      />

      {/* Quick Add License Modal */}
      <QuickAddModal
        isOpen={showQuickAddLicense}
        onClose={() => setShowQuickAddLicense(false)}
        type="license"
        onSubmit={handleQuickAddLicense}
      />
    </div>
  );
}

export default function LicensesPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
      <LicensesPageContent />
    </Suspense>
  );
}
