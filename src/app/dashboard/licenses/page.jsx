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
  const { shopOptions, typeOptions, shops, error: dropdownError } = useDropdownData(); // Use hook for dropdown data
  
  // Debug logging สำหรับตรวจสอบปัญหา
  console.log('🔧 LicensesPageContent Initialized:', {
    shopOptionsCount: shopOptions?.length || 0,
    typeOptionsCount: typeOptions?.length || 0,
    shopsCount: shops?.length || 0,
    hasDropdownError: !!dropdownError,
    searchParams: Object.fromEntries(searchParams)
  });
  
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
  const enhancedShopOptions = useMemo(() => [
    { value: CREATE_NEW_SHOP_VALUE, label: "➕ สร้างร้านค้าใหม่..." },
    ...shopOptions,
  ], [shopOptions]);

  // Define Standard Columns with dependencies
  // We need to recreate columns when options change
  const [columns, setColumns] = useState([]);

  const fetchCustomColumns = useCallback(async () => {
    // Debug logging สำหรับตรวจสอบ options ก่อนสร้างคอลัมน์
    console.log('🔧 Column Options Debug:', {
      typeOptions: typeOptions,
      typeOptionsCount: typeOptions?.length || 0,
      shopOptions: enhancedShopOptions,
      shopOptionsCount: enhancedShopOptions?.length || 0,
      hasTypeOptions: !!(typeOptions && typeOptions.length > 0),
      hasShopOptions: !!(enhancedShopOptions && enhancedShopOptions.length > 0),
      sampleTypeOption: typeOptions?.[0],
      sampleShopOption: enhancedShopOptions?.[0]
    });

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
          
          const shopName = enhancedShopOptions.find((o) => o.value == value)?.label || row.shop_name || value;
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
      { 
        id: "notes", 
        name: "หมายเหตุ", 
        width: 200,
        display_order: 100, 
        align: "center",
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
            
            // Debug logging สำหรับการสร้างคอลัมน์ custom fields
            console.log(`🔧 Creating Custom Column:`, {
              field_name: f.field_name,
              field_label: f.field_label,
              field_type: f.field_type,
              display_order: f.display_order,
              is_active: f.is_active,
              columnProps: customCol
            });
            
            return customCol;
          });

        // Combine and sort all columns by display_order
        const allColumns = [...updatedBaseCols, ...pureCustomCols];
        const sortedColumns = allColumns.sort((a, b) => {
          const orderA = a.display_order !== undefined ? a.display_order : 999;
          const orderB = b.display_order !== undefined ? b.display_order : 999;
          return orderA - orderB;
        });

        // Debug logging คอลัมน์ทั้งหมด
        console.log('📊 Column Management Debug:', {
          baseColsCount: baseCols.length,
          customColsCount: pureCustomCols.length,
          totalColsCount: sortedColumns.length,
          baseCols: baseCols.map(c => ({ id: c.id, name: c.name, order: c.display_order })),
          customCols: pureCustomCols.map(c => ({ id: c.id, name: c.name, order: c.display_order })),
          finalCols: sortedColumns.map(c => ({ id: c.id, name: c.name, order: c.display_order })),
          // ตรวจสอบคอลัมน์ที่เราสนใจโดยเฉพาะ
          hasLocation: sortedColumns.some(c => c.id === 'cf_selling_location'),
          hasAmount: sortedColumns.some(c => c.id === 'cf_amount'),
          locationCol: sortedColumns.find(c => c.id === 'cf_selling_location'),
          amountCol: sortedColumns.find(c => c.id === 'cf_amount'),
          // ตรวจสอบว่าคอลัมน์มี properties ครบถ้วน
          locationColProps: sortedColumns.find(c => c.id === 'cf_selling_location') ? {
            id: sortedColumns.find(c => c.id === 'cf_selling_location').id,
            name: sortedColumns.find(c => c.id === 'cf_selling_location').name,
            type: sortedColumns.find(c => c.id === 'cf_selling_location').type,
            isCustom: sortedColumns.find(c => c.id === 'cf_selling_location').isCustom
          } : null,
          amountColProps: sortedColumns.find(c => c.id === 'cf_amount') ? {
            id: sortedColumns.find(c => c.id === 'cf_amount').id,
            name: sortedColumns.find(c => c.id === 'cf_amount').name,
            type: sortedColumns.find(c => c.id === 'cf_amount').type,
            isCustom: sortedColumns.find(c => c.id === 'cf_amount').isCustom
          } : null
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
    
    // Debug logging
    console.log('🔄 fetchLicenses called:', {
      initialLoadDone: initialLoadDoneRef.current,
      page,
      limit,
      debouncedSearch,
      filterType,
      filterStatus,
      filterShop
    });
    
    try {
      const params = new URLSearchParams({
        page: page,
        limit: limit,
        search: debouncedSearch,
        license_type: filterType,
        status: filterStatus,
        shop_id: filterShop,
      });

      const response = await fetch(`${API_ENDPOINTS.LICENSES}?${params}`, { credentials: "include" });
      const data = await response.json();

      if (data.success) {
        // Flatten custom_fields
        let formattedLicenses = data.licenses.map((l, index) => {
          const flattened = {
            ...l,
            ...(l.custom_fields || {}),
          };
          
          // Debug การ flatten custom fields สำหรับ license แรก
          if (index === 0) {
            console.log('🔍 Custom Fields Flatten Debug:', {
              licenseId: l.id,
              originalCustomFields: l.custom_fields,
              flattenedFields: Object.keys(flattened).filter(key => 
                !['id', 'shop_id', 'license_type_id', 'license_number', 'issue_date', 'expiry_date', 'status', 'notes', 'shop_name', 'type_name', 'original_status', 'created_at', 'updated_at'].includes(key)
              ),
              hasLocation: 'cf_selling_location' in flattened,
              hasAmount: 'cf_amount' in flattened,
              locationValue: flattened.cf_selling_location,
              amountValue: flattened.cf_amount,
              allKeys: Object.keys(flattened),
              issueDate: flattened.issue_date,
              expiryDate: flattened.expiry_date
            });
          }
          
          return flattened;
        });
        
        // Filter out items that are currently being deleted locally
        formattedLicenses = formattedLicenses.filter(l => !deletedIdsRef.current.has(l.id));
        
        console.log('📊 fetchLicenses result:', {
          totalLicenses: formattedLicenses.length,
          deletedIds: Array.from(deletedIdsRef.current),
          sampleFormattedLicense: formattedLicenses[0],
          sampleFormattedKeys: formattedLicenses[0] ? Object.keys(formattedLicenses[0]) : [],
          sampleHasLocation: formattedLicenses[0] ? 'cf_selling_location' in formattedLicenses[0] : false,
          sampleHasAmount: formattedLicenses[0] ? 'cf_amount' in formattedLicenses[0] : false
        });
        
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
    // Debug logging สำหรับตรวจสอบว่ามีการเรียกใช handleRowUpdate
    console.log('🔧 handleRowUpdate Called:', {
      licenseId: updatedRow.id,
      isNew: updatedRow.id.toString().startsWith("id_"),
      allKeys: Object.keys(updatedRow),
      shopIdValue: updatedRow.shop_id,
      licenseTypeIdValue: updatedRow.license_type_id,
      licenseNumberValue: updatedRow.license_number,
      issueDateValue: updatedRow.issue_date,
      expiryDateValue: updatedRow.expiry_date,
      notesValue: updatedRow.notes,
      hasShopId: 'shop_id' in updatedRow,
      hasLicenseTypeId: 'license_type_id' in updatedRow,
      hasLicenseNumber: 'license_number' in updatedRow,
      hasIssueDate: 'issue_date' in updatedRow,
      hasExpiryDate: 'expiry_date' in updatedRow,
      hasNotes: 'notes' in updatedRow,
      // ตรวจจอบว่ามี custom fields
      hasCustomFields: Object.keys(updatedRow).some(key => key.startsWith('cf_')),
      customFieldKeys: Object.keys(updatedRow).filter(key => key.startsWith('cf_')),
      customFieldValues: Object.keys(updatedRow).filter(key => key.startsWith('cf_')).reduce((acc, key) => {
        acc[key] = updatedRow[key];
        return acc;
      }, {}),
      // ตรวจจอบว่ามีการเปลี่ยนแปลงในวันที่
      existingIssueDate: existingLicense?.issue_date ?? '',
      updatedIssueDate: updatedRow.issue_date ?? '',
      issueDateChanged: (updatedRow.issue_date ?? '') !== (existingLicense?.issue_date ?? ''),
      existingExpiryDate: existingLicense?.expiry_date ?? '',
      updatedExpiryDate: updatedRow.expiry_date ?? '',
      expiryDateChanged: (updatedRow.expiry_date ?? '') !== (existingLicense?.expiry_date ?? ''),
      // ตรวจจอบว่ามีการเปลี่ยนแปลงใน notes (รวมถึงค่าว่างและ undefined)
      existingNotes: existingLicense?.notes ?? '',
      updatedNotes: updatedRow.notes ?? '',
      notesChanged: (updatedRow.notes ?? '') !== (existingLicense?.notes ?? ''),
      oldNotesValue: existingLicense?.notes ?? '',
      newNotesValue: updatedRow.notes ?? ''
    });

    // Check if user selected "Create New Shop" option
    if (updatedRow.shop_id === CREATE_NEW_SHOP_VALUE) {
      console.log('🔧 Create New Shop selected, opening modal');
      setShowQuickAddShop(true);
      // Reset the shop_id so it doesn't show the special value
      return;
    }

    const isNew = updatedRow.id.toString().startsWith("id_");

    // Extract standard data - ดึงค่าเดิมจาก license ที่มีอยู่ก่อน แล้วอัปเดตเฉพาะที่เปลี่ยน
    const existingLicense = licenses.find(l => l.id === updatedRow.id);

    // Define standard columns (base columns that are not custom fields)
    const STANDARD_COLUMNS_IDS = [
      "shop_id",
      "license_type_id", 
      "license_number",
      "issue_date",
      "expiry_date",
      "status",
      "notes"
    ];

    // Debug logging สำหรับตรวจสอบว่ามีการเรียกใช handleRowUpdate
    console.log('🔧 handleRowUpdate Called:', {
      licenseId: updatedRow.id,
      isNew: updatedRow.id.toString().startsWith("id_"),
      allKeys: Object.keys(updatedRow),
      shopIdValue: updatedRow.shop_id,
      licenseTypeIdValue: updatedRow.license_type_id,
      licenseNumberValue: updatedRow.license_number,
      issueDateValue: updatedRow.issue_date,
      expiryDateValue: updatedRow.expiry_date,
      notesValue: updatedRow.notes,
      hasShopId: 'shop_id' in updatedRow,
      hasLicenseTypeId: 'license_type_id' in updatedRow,
      hasLicenseNumber: 'license_number' in updatedRow,
      hasIssueDate: 'issue_date' in updatedRow,
      hasExpiryDate: 'expiry_date' in updatedRow,
      hasNotes: 'notes' in updatedRow,
      // ตรวจจอบว่ามี custom fields
      hasCustomFields: Object.keys(updatedRow).some(key => key.startsWith('cf_')),
      customFieldKeys: Object.keys(updatedRow).filter(key => key.startsWith('cf_')),
      customFieldValues: Object.keys(updatedRow).filter(key => key.startsWith('cf_')).reduce((acc, key) => {
        acc[key] = updatedRow[key];
        return acc;
      }, {}),
      // ตรวจจอบว่ามีการเปลี่ยนแปลงในวันที่
      existingIssueDate: existingLicense?.issue_date ?? '',
      updatedIssueDate: updatedRow.issue_date ?? '',
      issueDateChanged: (updatedRow.issue_date ?? '') !== (existingLicense?.issue_date ?? ''),
      existingExpiryDate: existingLicense?.expiry_date ?? '',
      updatedExpiryDate: updatedRow.expiry_date ?? '',
      expiryDateChanged: (updatedRow.expiry_date ?? '') !== (existingLicense?.expiry_date ?? ''),
      // ตรวจจอบว่ามีการเปลี่ยนแปลงใน notes (รวมถึงค่าว่างและ undefined)
      existingNotes: existingLicense?.notes ?? '',
      updatedNotes: updatedRow.notes ?? '',
      notesChanged: (updatedRow.notes ?? '') !== (existingLicense?.notes ?? ''),
      oldNotesValue: existingLicense?.notes ?? '',
      newNotesValue: updatedRow.notes ?? ''
    });
    
    // สร้าง standard data โดยส่งเฉพาะฟิลด์ที่เปลี่ยนแปลงจริงๆ (รวมถึงค่าว่าง)
    const standardData = {};
    
    // ตรวจจอบและส่งเฉพาะฟิลด์ที่เปลี่ยนแปลง (รวมถึงค่าว่าง)
    if (updatedRow.shop_id !== existingLicense?.shop_id) {
      standardData.shop_id = updatedRow.shop_id;
    }
    if (updatedRow.license_type_id !== existingLicense?.license_type_id) {
      standardData.license_type_id = updatedRow.license_type_id;
    }
    if (updatedRow.license_number !== existingLicense?.license_number) {
      standardData.license_number = updatedRow.license_number;
    }
    
    // ตรวจสอบการเปลี่ยนแปลงของวันที่ (รองรับ null, undefined, ค่าว่าง)
    const existingIssueDate = existingLicense?.issue_date ?? '';
    const updatedIssueDate = updatedRow.issue_date ?? '';
    if (updatedIssueDate !== existingIssueDate) {
      standardData.issue_date = updatedRow.issue_date;
      console.log(`📅 Issue Date Changed: "${existingIssueDate}" → "${updatedIssueDate}"`);
    }
    
    const existingExpiryDate = existingLicense?.expiry_date ?? '';
    const updatedExpiryDate = updatedRow.expiry_date ?? '';
    if (updatedExpiryDate !== existingExpiryDate) {
      standardData.expiry_date = updatedRow.expiry_date;
      console.log(`📅 Expiry Date Changed: "${existingExpiryDate}" → "${updatedExpiryDate}"`);
    }
    
    if (updatedRow.status !== existingLicense?.status) {
      standardData.status = updatedRow.status;
    }
    // ตรวจสอบการเปลี่ยนแปลงของ notes (รวมถึงค่าว่างและ undefined)
    const existingNotes = existingLicense?.notes ?? '';
    const updatedNotes = updatedRow.notes ?? '';
    if (updatedNotes !== existingNotes) {
      standardData.notes = updatedRow.notes;
    }

    // Extract custom fields - ส่งเฉพาะที่เปลี่ยนแปลงจริงๆ (รวมถึงค่าว่าง)
    const customValues = {};
    Object.keys(updatedRow).forEach((key) => {
      if (
        !STANDARD_COLUMNS_IDS.includes(key) &&
        key !== "id" &&
        key !== "custom_fields" &&
        key !== "created_at" &&
        key !== "updated_at" &&
        key !== "shop_name" &&
        key !== "type_name" &&
        key !== "original_status"
      ) {
        // ส่งเฉพาะ custom fields ที่เปลี่ยนแปลง (รองรับ null, undefined, ค่าว่าง)
        const existingValue = existingLicense?.[key] ?? '';
        const updatedValue = updatedRow[key] ?? '';
        if (updatedValue !== existingValue) {
          customValues[key] = updatedRow[key];
          console.log(`🔧 Custom Field Changed [${key}]: "${existingValue}" → "${updatedValue}"`);
        }
      }
    });

    // ถ้ามีการแก้ไข custom fields ให้ส่งฟิลด์ที่จำเป็นต้องไปด้วย
    if (Object.keys(customValues).length > 0) {
      console.log('🔧 Custom fields changed, ensuring required fields are sent');
      
      // ถ้าไม่มีการเปลี่ยนแปลงในฟิลด์ที่จำเป็นต้อง ให้ส่งค่าเดิมไปด้วย
      if (Object.keys(standardData).length === 0) {
        console.log('🔧 No standard fields changed, sending required fields to prevent error');
        standardData.id = updatedRow.id;
        standardData.shop_id = existingLicense?.shop_id || updatedRow.shop_id;
        standardData.license_type_id = existingLicense?.license_type_id || updatedRow.license_type_id;
        standardData.license_number = existingLicense?.license_number || updatedRow.license_number;
      }
    }

    // Debug logging สำหรับตรวจสอบฟิลด์ที่จำเป็นต้อง
    console.log(' Preparing to send data:', {
      licenseId: updatedRow.id,
      hasValidId: updatedRow.id !== undefined && updatedRow.id !== null && updatedRow.id !== '',
      hasValidShopId: updatedRow.shop_id !== undefined && updatedRow.shop_id !== null && updatedRow.shop_id !== 0,
      hasValidLicenseTypeId: updatedRow.license_type_id !== undefined && updatedRow.license_type_id !== null && updatedRow.license_type_id !== 0,
      hasValidLicenseNumber: updatedRow.license_number !== undefined && updatedRow.license_number !== null && updatedRow.license_number !== '',
      shopIdValue: updatedRow.shop_id,
      licenseTypeIdValue: updatedRow.license_type_id,
      licenseNumberValue: updatedRow.license_number,
      issueDateValue: updatedRow.issue_date,
      expiryDateValue: updatedRow.expiry_date,
      allKeys: Object.keys(updatedRow),
      standardDataKeys: Object.keys(standardData),
      customValuesKeys: Object.keys(customValues),
      hasCustomFieldChanges: Object.keys(customValues).length > 0,
      hasStandardFieldChanges: Object.keys(standardData).length > 0,
      finalStandardData: standardData,
      finalCustomValues: customValues
    });

    // ตรวจสอบว่าฟิลด์ที่จำเป็นต้องมีค่าก่อนส่งข้อมูล
    const requiredFieldsValid = 
      updatedRow.id !== undefined && updatedRow.id !== null && updatedRow.id !== '' &&
      (standardData.shop_id !== undefined ? standardData.shop_id : (existingLicense?.shop_id || updatedRow.shop_id)) !== undefined &&
      (standardData.shop_id !== undefined ? standardData.shop_id : (existingLicense?.shop_id || updatedRow.shop_id)) !== null &&
      (standardData.shop_id !== undefined ? standardData.shop_id : (existingLicense?.shop_id || updatedRow.shop_id)) !== 0 &&
      (standardData.license_type_id !== undefined ? standardData.license_type_id : (existingLicense?.license_type_id || updatedRow.license_type_id)) !== undefined &&
      (standardData.license_type_id !== undefined ? standardData.license_type_id : (existingLicense?.license_type_id || updatedRow.license_type_id)) !== null &&
      (standardData.license_type_id !== undefined ? standardData.license_type_id : (existingLicense?.license_type_id || updatedRow.license_type_id)) !== 0 &&
      (standardData.license_number !== undefined ? standardData.license_number : (existingLicense?.license_number || updatedRow.license_number)) !== undefined &&
      (standardData.license_number !== undefined ? standardData.license_number : (existingLicense?.license_number || updatedRow.license_number)) !== null &&
      (standardData.license_number !== undefined ? standardData.license_number : (existingLicense?.license_number || updatedRow.license_number)) !== '';

    if (!requiredFieldsValid) {
      console.error('❌ Required fields validation failed:', {
        licenseId: updatedRow.id,
        shopId: standardData.shop_id || (existingLicense?.shop_id || updatedRow.shop_id),
        licenseTypeId: standardData.license_type_id || (existingLicense?.license_type_id || updatedRow.license_type_id),
        licenseNumber: standardData.license_number || (existingLicense?.license_number || updatedRow.license_number)
      });
      showError("กรุณากรอกข้อมูลที่จำเป็นต้อนให้ครบถ้วน");
      return;
    }

    // Debug logging สำหรับตรวจสอบ custom fields ที่เปลี่ยนแปลง
    console.log('🔍 Custom Fields Update Debug:', {
      licenseId: updatedRow.id,
      existingCustomFields: Object.keys(existingLicense || {}).filter(key => key.startsWith('cf_')),
      updatedCustomFields: Object.keys(updatedRow).filter(key => key.startsWith('cf_')),
      changedCustomFields: Object.keys(customValues),
      customValues,
      // ตรวจสอบค่าที่อาจเป็นว่าง
      locationValue: updatedRow.cf_selling_location,
      amountValue: updatedRow.cf_amount,
      existingLocationValue: existingLicense?.cf_selling_location,
      existingAmountValue: existingLicense?.cf_amount
    });

    // Debug logging
    console.log('🔍 License Update Debug:', {
      isNew,
      standardData,
      customValues,
      updatedRowKeys: Object.keys(updatedRow),
      columnsIds: columns.map(c => c.id),
      issueDateValue: updatedRow.issue_date,
      expiryDateValue: updatedRow.expiry_date,
      issueDateType: typeof updatedRow.issue_date,
      expiryDateType: typeof updatedRow.expiry_date,
      // ตรวจสอบค่าของ custom fields ที่น่าจะเป็น "สถานที่จำหน่าย" และ "จำนวนเงิน"
      locationValue: updatedRow['cf_selling_location'],
      amountValue: updatedRow['cf_amount'],
      allCustomFields: Object.keys(updatedRow).filter(key => 
        !STANDARD_COLUMNS_IDS.includes(key) && 
        key !== "id" && 
        key !== "custom_fields" && 
        key !== "created_at" && 
        key !== "updated_at" && 
        key !== "shop_name" && 
        key !== "type_name" && 
        key !== "original_status"
      )
    });

    try {
      if (isNew) {
        // Validation
        if (!updatedRow.shop_id || !updatedRow.license_type_id) {
          // Ideally UI handles this validation or we show error
          // return;
        }

        const payload = {
          ...standardData,
          custom_fields: customValues,
        };

        console.log('📤 Frontend Sending POST Payload:', {
          payload,
          customValuesKeys: Object.keys(customValues),
          customValuesData: customValues
        });

        const res = await fetch(API_ENDPOINTS.LICENSES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          showSuccess("สร้างใบอนุญาตเรียบร้อย");
          notifyDataChange("licenses-sync");
          
          // Optimistic update: Replace temp row with real data immediately
          const newLicenseId = data.license?.id || data.id || data.data?.id;
          
          if (newLicenseId) {
            // Update local state - replace temp ID with real ID
            setLicenses(prev => 
              prev.map(license => 
                license.id === updatedRow.id 
                  ? { ...license, ...standardData, ...customValues, id: newLicenseId }
                  : license
              )
            );
          } else {
            // Fallback: add new license from response
            if (data.license) {
              setLicenses(prev => [...prev, data.license]);
            }
          }
          
          // Targeted cache invalidation for dropdowns only
          mutate('/api/shops/dropdown');
          mutate('/api/license-types/dropdown');
        } else {
          showError(data.message);
        }
      } else {
        const payload = {
          id: updatedRow.id,
          ...standardData,
          custom_fields: customValues,
        };

        console.log('📤 Frontend Sending PUT Payload (Complete):', {
          payload,
          customValuesKeys: Object.keys(customValues),
          customValuesData: customValues,
          updatedRowId: updatedRow.id,
          // ตรวจจอบว่ามีการเปลี่ยนแปลงจริงๆ
          hasChanges: Object.keys(standardData).length > 0 || Object.keys(customValues).length > 0,
          standardDataChanges: Object.keys(standardData),
          customFieldChanges: Object.keys(customValues),
          // ตรวจสอบค่าที่ส่งไป backend
          sentId: payload.id,
          sentShopId: payload.shop_id,
          sentLicenseTypeId: payload.license_type_id,
          sentLicenseNumber: payload.license_number,
          sentIssueDate: payload.issue_date,
          sentExpiryDate: payload.expiry_date,
          sentLocation: payload.custom_fields?.cf_selling_location,
          sentAmount: payload.custom_fields?.cf_amount,
          // ตรวจสอบว่าฟิลด์ที่จำเป็นต้องมีค่า
          hasRequiredFields: !!(payload.id && payload.shop_id && payload.license_type_id && payload.license_number),
          requiredFieldsValid: !!(payload.id && payload.shop_id > 0 && payload.license_type_id > 0 && payload.license_number),
          // ตรวจสอบว่าข้อมูลที่ส่งไป backend มีค่า
          payloadKeys: Object.keys(payload),
          payloadValues: Object.values(payload)
        });

        const res = await fetch(API_ENDPOINTS.LICENSES, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        console.log('📥 Backend PUT Response:', {
          success: data.success,
          license: data.license,
          message: data.message,
          licenseCustomFields: data.license?.custom_fields
        });

        if (data.success) {
          showSuccess("อัปเดตใบอนุญาตเรียบร้อย");
          notifyDataChange("licenses-sync");
          
          // ใช้ optimistic update แทนการรีเฟรชทันที
          console.log('🔧 Using optimistic update instead of refresh');
          
          if (data.license) {
            console.log('🔧 Backend Response License:', data.license);
            console.log('🔧 Backend Response has location:', 'cf_selling_location' in (data.license || {}));
            console.log('🔧 Backend Response location value:', data.license?.cf_selling_location || 'NOT_FOUND');
            setLicenses(prev => prev.map(l => l.id === updatedRow.id ? data.license : l));
          } else {
            // Fallback: สร้าง license ที่อัปเดตจากข้อมูลที่ส่งไป
            const updatedLicense = {
              ...existingLicense,
              ...standardData,
              ...customValues,
              // รักษา custom fields ทั้งหมดจาก updatedRow (รวมถึงค่าว่าง)
              ...Object.keys(updatedRow).filter(key => key.startsWith('cf_')).reduce((acc, key) => {
                acc[key] = updatedRow[key];
                return acc;
              }, {}),
              // รักษาฟิลด์อื่นๆ ที่ไม่ได้แก้ไขไว้
              ...Object.keys(existingLicense || {}).reduce((acc, key) => {
                if (!standardData[key] && !customValues[key]) {
                  acc[key] = existingLicense[key];
                }
                return acc;
              }, {})
            };
            console.log('🔧 Fallback Updated License:', updatedLicense);
            console.log('🔧 Fallback has location:', 'cf_selling_location' in (updatedLicense || {}));
            console.log('🔧 Fallback location value:', updatedLicense?.cf_selling_location || 'NOT_FOUND');
            setLicenses(prev => prev.map(l => l.id === updatedRow.id ? updatedLicense : l));
          }
          
          // รีเฟรชหลังจาก optimistic update เล็กน้อยเพื่อความถูกต้อง
          setTimeout(() => {
            console.log('🔧 Delayed refresh to ensure data consistency');
            fetchLicenses();
          }, 500);
        } else {
          showError(data.message);
          fetchLicenses(); // Revert on error
        }
      }
    } catch (error) {
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
    try {
      await exportLicensesToPDF(licenses, {
        search,
        type: typeOptions.find((t) => t.value == filterType)?.label,
        status: STATUS_OPTIONS.find((s) => s.value == filterStatus)?.label,
        shop: shopOptions.find((s) => s.value == filterShop)?.label,
      });
    } catch (err) {
      console.error(err);
      showError("Export PDF ล้มเหลว");
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
      notes: formData.notes,
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
    if (data.license) {
      setLicenses(prev => [data.license, ...prev]);
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
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowQuickAddLicense(true)}>
          <i className="fas fa-plus"></i> เพิ่มใบอนุญาต
        </button>
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

        {/* Debug logging ก่อนส่งข้อมูลไป ExcelTable (เฉพาะ development) */}
        {process.env.NODE_ENV === 'development' && (() => {
          console.log('📊 ExcelTable Input Debug:', {
            columnsCount: columns.length,
            licensesCount: licenses.length,
            sampleLicense: licenses[0],
            sampleLicenseKeys: licenses[0] ? Object.keys(licenses[0]) : [],
            sampleHasLocation: licenses[0] ? 'cf_selling_location' in licenses[0] : false,
            sampleHasAmount: licenses[0] ? 'cf_amount' in licenses[0] : false,
            sampleLocationValue: licenses[0] ? licenses[0].cf_selling_location : 'N/A',
            sampleAmountValue: licenses[0] ? licenses[0].cf_amount : 'N/A'
          });
          return null;
        })()}

        {!loading ? (
          <div style={{ overflow: "auto", maxHeight: "600px" }}>
            <ExcelTable
              key={`licenses-${licenses.length}-${loading}`}
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
                          "หมายเหตุ",
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
                      { width: "120px", center: true, rounded: true }, // Status
                      { width: "200px", center: true }, // Notes
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
