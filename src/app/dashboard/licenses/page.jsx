"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { usePagination, useDropdownData } from "@/hooks";
import { API_ENDPOINTS, STATUS_OPTIONS } from "@/constants";
import { showSuccess, showError } from "@/utils/alerts";
import Pagination from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/FilterRow";
import CustomSelect from "@/components/ui/CustomSelect";
import TableSkeleton from "@/components/ui/TableSkeleton";
import QuickAddModal from "@/components/ui/QuickAddModal";
import { mutate } from "swr"; // Import mutate

// Lazy load PDF export to reduce initial bundle size
const exportLicensesToPDF = async (...args) => {
  const { exportLicensesToPDF: exportFn } = await import("@/lib/pdfExport");
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
              {["ร้านค้า", "ประเภทใบอนุญาต", "สถานที่จำหน่าย", "จำนวนเงิน", "เลขที่ใบอนุญาต", "วันที่ออก", "วันหมดอายุ", "พื้นที่ (ตารางเมตร)", "พื้นที่ (แรงม้า)"].map((h, i) => (
                <th key={i} style={{ minWidth: "120px" }}><div className="th-content">{h}</div></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableSkeleton rows={10} columns={[
              { width: "180px" }, // Shop
              { width: "150px" }, // Type
              { width: "150px" }, // Location
              { width: "100px" }, // Amount
              { width: "150px" }, // License No
              { width: "120px", center: true }, // Issue Date
              { width: "120px", center: true }, // Expiry
              { width: "100px" }, // Area Sqm
              { width: "100px" }, // Area HP
            ]} />
          </tbody>
        </table>
      </div>
    </div>
  ),
});

// Helper to format options for ExcelTable select columns
const formatOptions = (items, labelKey = "name", valueKey = "id") =>
  items.map((item) => ({ label: item[labelKey], value: item[valueKey] }));

// Special value for "create new shop" option
const CREATE_NEW_SHOP_VALUE = "__CREATE_NEW__";

export default function LicensesPage() {
  const pagination = usePagination(10);
  const { shopOptions, typeOptions, shops } = useDropdownData(); // Use hook for dropdown data

  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  // Modal for creating new shop
  const [showQuickAddShop, setShowQuickAddShop] = useState(false);
  // Modal for quick adding license
  const [showQuickAddLicense, setShowQuickAddLicense] = useState(false);

  // Enhanced shop options with "Create New" option
  const enhancedShopOptions = useMemo(() => [
    { value: CREATE_NEW_SHOP_VALUE, label: "➕ สร้างร้านค้าใหม่..." },
    ...shopOptions,
  ], [shopOptions]);

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
      },
      {
        id: "license_type_id",
        name: "ประเภทใบอนุญาต",
        width: 200,
        type: "select",
        options: typeOptions,
        display_order: 2,
      },
      { 
        id: "license_number", 
        name: "เลขที่ใบอนุญาต", 
        width: 200,
        display_order: 5,
      },
      {
        id: "issue_date",
        name: "วันที่ออก",
        width: 150,
        type: "date",
        align: "center",
        display_order: 6,
      },
      {
        id: "expiry_date",
        name: "วันหมดอายุ",
        width: 150,
        type: "date",
        align: "center",
        display_order: 7,
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
      },
      { 
        id: "notes", 
        name: "หมายเหตุ", 
        width: 200,
        display_order: 100, 
      },
    ];

    try {
      const res = await fetch(
        `/api/custom-fields?entity_type=licenses&t=${Date.now()}`
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
          .map((f) => ({
            id: f.field_name,
            name: f.field_label,
            type: f.field_type || "text",
            width: 150,
            isCustom: true,
            db_id: f.id,
            display_order: f.display_order !== undefined && f.display_order !== null 
              ? Number(f.display_order) 
              : 99,
          }));

        // Combine and sort all columns by display_order
        const allColumns = [...updatedBaseCols, ...pureCustomCols];
        const sortedColumns = allColumns.sort((a, b) => {
          const orderA = a.display_order !== undefined ? a.display_order : 999;
          const orderB = b.display_order !== undefined ? b.display_order : 999;
          return orderA - orderB;
        });

        console.log("Columns sorted:", sortedColumns.map(c => `${c.name} (${c.display_order})`));
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

  // Initial license data fetch
  useEffect(() => {
    fetchLicenses();
  }, []);

  // Refetch licenses when filters change
  useEffect(() => {
    if (columns.length > 0) {
      fetchLicenses();
    }
  }, [pagination.page, pagination.limit, search, filterType, filterStatus]);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search,
        license_type: filterType,
        status: filterStatus,
      });

      const response = await fetch(`${API_ENDPOINTS.LICENSES}?${params}`);
      const data = await response.json();

      if (data.success) {
        // Flatten custom fields
        const formattedLicenses = data.licenses.map((l) => ({
          ...l,
          ...(l.custom_fields || {}),
        }));
        setLicenses(formattedLicenses);
        pagination.updateFromResponse(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch licenses:", error);
      showError("โหลดข้อมูลใบอนุญาตล้มเหลว");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterType, filterStatus]);

  // --- Row Handlers ---

  const handleRowUpdate = async (updatedRow) => {
    // Check if user selected "Create New Shop" option
    if (updatedRow.shop_id === CREATE_NEW_SHOP_VALUE) {
      setShowQuickAddShop(true);
      // Reset the shop_id so it doesn't show the special value
      return;
    }

    const isNew = updatedRow.id.toString().startsWith("id_");

    const standardData = {
      shop_id: updatedRow.shop_id,
      license_type_id: updatedRow.license_type_id,
      license_number: updatedRow.license_number,
      issue_date: updatedRow.issue_date,
      expiry_date: updatedRow.expiry_date,
      status: updatedRow.status,
      notes: updatedRow.notes,
    };

    // Extract custom fields
    // Simplistic check
    const knownKeys = [
      "id",
      "shop_id",
      "license_type_id",
      "license_number",
      "issue_date",
      "expiry_date",
      "status",
      "notes",
      "custom_fields",
      "created_at",
      "updated_at",
      "shop_name",
      "type_name",
    ];
    const customValues = {};
    Object.keys(updatedRow).forEach((key) => {
      if (!knownKeys.includes(key) && !key.startsWith("custom_")) {
        customValues[key] = updatedRow[key];
      }
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

        const res = await fetch(API_ENDPOINTS.LICENSES, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          showSuccess("สร้างใบอนุญาตเรียบร้อย");
          fetchLicenses();
        } else {
          showError(data.message);
        }
      } else {
        const payload = {
          id: updatedRow.id,
          ...standardData,
          custom_fields: customValues,
        };

        const res = await fetch(API_ENDPOINTS.LICENSES, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();

        if (data.success) {
          setLicenses((prev) =>
            prev.map((l) => (l.id === updatedRow.id ? updatedRow : l))
          );
        } else {
          showError(data.message);
          fetchLicenses();
        }
      }
    } catch (error) {
      showError(error.message);
      fetchLicenses();
    }
  };

  const handleRowDelete = async (rowId) => {
    try {
      const res = await fetch(`${API_ENDPOINTS.LICENSES}?id=${rowId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("ลบใบอนุญาตเรียบร้อย");
        setLicenses((prev) => prev.filter((l) => l.id !== rowId));
      } else {
        showError(data.message);
        fetchLicenses();
      }
    } catch (error) {
      showError(error.message);
      fetchLicenses();
    }
  };

  const handleRowAdd = (newRow) => {
    // UI only
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

  const handleExport = async () => {
    try {
      await exportLicensesToPDF(licenses, {
        search,
        type: typeOptions.find((t) => t.value == filterType)?.label,
        status: STATUS_OPTIONS.find((s) => s.value == filterStatus)?.label,
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
      body: JSON.stringify(shopPayload),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "ไม่สามารถสร้างร้านค้าได้");
    }

    showSuccess("สร้างร้านค้าเรียบร้อย กรุณาเลือกร้านค้าใหม่จากรายการ");
    // Reload the page or refetch shop options
    mutate('/api/shops?limit=1000'); // Update dropdown cache
    // window.location.reload(); // No longer needed
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
    };

    const res = await fetch(API_ENDPOINTS.LICENSES, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || "ไม่สามารถสร้างใบอนุญาตได้");
    }

    showSuccess("สร้างใบอนุญาตเรียบร้อย");
    fetchLicenses();
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
              placeholder="เลขที่ใบอนุญาต, ร้านค้า..."
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
              options={STATUS_OPTIONS}
            />
          </div>
        </div>
        </div>

        {!loading ? (
          <div style={{ overflow: "auto", maxHeight: "600px" }}>
            <ExcelTable
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
                            style={{ width: col.width, minWidth: col.width }}
                          >
                            <div className="th-content">{col.name}</div>
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
                          <th key={i} style={{ minWidth: "120px" }}>
                            <div className="th-content">{header}</div>
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody>
                  <TableSkeleton
                    rows={10}
                    columns={[
                      { width: "180px" }, // Shop
                      { width: "150px" }, // Type
                      { width: "150px" }, // Location
                      { width: "100px" }, // Amount
                      { width: "150px" }, // License No
                      { width: "120px", center: true }, // Issue Date
                      { width: "120px", center: true }, // Expiry
                      { width: "100px" }, // Area Sqm
                      { width: "100px" }, // Area HP
                      { width: "120px", center: true, rounded: true }, // Status
                      { width: "200px" }, // Notes
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
        typeOptions={typeOptions}
        onSubmit={handleQuickAddShop}
      />

      {/* Quick Add License Modal */}
      <QuickAddModal
        isOpen={showQuickAddLicense}
        onClose={() => setShowQuickAddLicense(false)}
        type="license"
        shopOptions={shopOptions}
        typeOptions={typeOptions}
        onSubmit={handleQuickAddLicense}
      />
    </div>
  );
}
