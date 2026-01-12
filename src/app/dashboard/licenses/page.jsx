"use client";

import { useState, useEffect, useCallback } from "react";
import { usePagination, useDropdownData } from "@/hooks";
import { API_ENDPOINTS, STATUS_OPTIONS } from "@/constants";
import { showSuccess, showError } from "@/utils/alerts";
import ExcelTable from "@/components/ExcelTable";
import Pagination from "@/components/ui/Pagination";
import FilterRow, { SearchInput } from "@/components/ui/FilterRow";
import CustomSelect from "@/components/ui/CustomSelect"; // Re-use for filters

// Helper to format options for ExcelTable select columns
const formatOptions = (items, labelKey = "name", valueKey = "id") =>
  items.map((item) => ({ label: item[labelKey], value: item[valueKey] }));

export default function LicensesPage() {
  const pagination = usePagination(20);
  const { shopOptions, typeOptions } = useDropdownData(); // Use hook for dropdown data

  // Convert hook options to ExcelTable format {label, value}
  // shopOptions/typeOptions from hook are already {label, value} usually?
  // Let's verify hook usage in original file:
  // options={[{ value: '', label: '-- เลือกร้านค้า --' }, ...shopOptions]}
  // So they are compatible.

  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

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
        options: shopOptions,
      },
      {
        id: "license_type_id",
        name: "ประเภทใบอนุญาต",
        width: 200,
        type: "select",
        options: typeOptions,
      },
      { id: "license_number", name: "เลขที่ใบอนุญาต", width: 200 },
      {
        id: "issue_date",
        name: "วันที่ออก",
        width: 150,
        type: "date",
        align: "center",
      },
      {
        id: "expiry_date",
        name: "วันหมดอายุ",
        width: 150,
        type: "date",
        align: "center",
      },
      {
        id: "status",
        name: "สถานะ",
        width: 120,
        align: "center",
        type: "select",
        options: STATUS_OPTIONS,
      },
      { id: "notes", name: "หมายเหตุ", width: 200 },
    ];

    try {
      const res = await fetch(
        `/api/custom-fields?entity_type=licenses&t=${Date.now()}`
      );
      const data = await res.json();
      if (data.success) {
        const customCols = data.fields.map((f) => ({
          id: f.field_name,
          name: f.field_label,
          type: f.field_type || "text",
          width: 150,
          isCustom: true,
          db_id: f.id,
        }));

        // Merge with standard
        setColumns([...baseCols, ...customCols]);
      } else {
        setColumns(baseCols);
      }
    } catch (e) {
      console.error(e);
      setColumns(baseCols);
    }
  }, [shopOptions, typeOptions]);

  useEffect(() => {
    fetchCustomColumns();
  }, [fetchCustomColumns]);

  useEffect(() => {
    fetchLicenses();
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

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          <i className="fas fa-file-alt"></i> ใบอนุญาต
        </h3>
      </div>
      <div className="card-body">
        {/* Filters */}
        <FilterRow>
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              pagination.resetPage();
            }}
            placeholder="ค้นหา..."
          />
          <CustomSelect
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              pagination.resetPage();
            }}
            options={[{ value: "", label: "ทุกประเภท" }, ...typeOptions]}
            placeholder="ประเภทใบอนุญาต"
            style={{ minWidth: "200px", width: "auto" }}
          />
          <CustomSelect
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              pagination.resetPage();
            }}
            options={STATUS_OPTIONS}
            placeholder="สถานะ"
            style={{ minWidth: "180px", width: "auto" }}
          />
        </FilterRow>

        {!loading ? (
          <ExcelTable
            initialColumns={columns}
            initialRows={licenses}
            onRowUpdate={handleRowUpdate}
            onRowDelete={handleRowDelete}
            onRowAdd={handleRowAdd}
            onColumnAdd={handleColumnAdd}
            onColumnUpdate={handleColumnUpdate}
            onColumnDelete={handleColumnDelete}
          />
        ) : (
          <div className="text-center p-5">Loading...</div>
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
