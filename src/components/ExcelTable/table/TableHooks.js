import { useState, useRef, useEffect, useCallback } from "react";

// ข้อมูลตัวอย่างเริ่มต้น (Fallback)
export const defaultColumns = [
  { id: "col1", name: "ชื่อสินค้า", width: 180, align: "left" },
  { id: "col2", name: "หมวดหมู่", width: 140, align: "left" },
  { id: "col3", name: "จำนวน", width: 100, align: "center" },
  { id: "col4", name: "ราคา (บาท)", width: 120, align: "right" },
  { id: "col5", name: "สถานะ", width: 120, align: "center" },
  { id: "col6", name: "วันที่", width: 130, align: "center", type: "date" },
];

export const defaultRows = [
  {
    id: "row1",
    col1: 'MacBook Pro 14"',
    col2: "อิเล็กทรอนิกส์",
    col3: "15",
    col4: "69,900",
    col5: "พร้อมขาย",
    col6: "2024-01-15",
  },
];

const generateId = () =>
  `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper function for deep comparison of rows
const areRowsEqual = (prevRows, newRows) => {
  if (!prevRows || !newRows) return prevRows === newRows;
  if (prevRows.length !== newRows.length) return false;

  // Compare by serializing - handles nested objects too
  try {
    return JSON.stringify(prevRows) === JSON.stringify(newRows);
  } catch {
    return false;
  }
};

// Helper to check if rows have meaningful data changes (ignoring temp IDs)
const hasRealDataChanges = (localRows, newRows) => {
  if (!localRows || !newRows) return true;

  // If lengths differ significantly, it's a real change
  if (Math.abs(localRows.length - newRows.length) > 1) return true;

  // Check if newRows contains actual DB IDs we don't have locally
  const localRealIds = new Set(
    localRows
      .filter(r => !r.id.toString().startsWith('id_'))
      .map(r => r.id)
  );
  const newRealIds = new Set(newRows.map(r => r.id));

  // If there are new IDs from the server, accept the update
  for (const id of newRealIds) {
    if (!localRealIds.has(id)) return true;
  }

  return false;
};

export function useExcelTable({
  initialColumns = defaultColumns,
  initialRows = defaultRows,
  preserveTempRows = true,
  onCellBlur,
} = {}) {
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState(initialRows);
  const [editingCell, setEditingCell] = useState(null); // { rowId, colId }
  const [editingHeader, setEditingHeader] = useState(null); // colId
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type, rowId?, colId? }
  const [selectedRow, setSelectedRow] = useState(null);

  // Track if user is currently editing to prevent override
  const isEditingRef = useRef(false);
  // Track previous initialRows to detect actual data changes
  const prevInitialRowsRef = useRef(initialRows);
  // Track if there's a pending save operation
  const pendingSaveRef = useRef(false);
  // Store initialRows that arrived while pending save was true
  const pendingInitialRowsRef = useRef(null);
  // Debounce timer for sync
  const syncTimerRef = useRef(null);
  // Track rows that were recently modified locally
  const recentlyModifiedRef = useRef(new Set());

  // Update editing ref when editingCell changes
  useEffect(() => {
    isEditingRef.current = editingCell !== null;
  }, [editingCell]);

  // Update effect if props change (optional, depends on if we want full sync)
  // Use JSON.stringify to compare arrays to prevent unnecessary updates
  useEffect(() => {
    setColumns((prev) => {
      const prevStr = JSON.stringify(prev);
      const newStr = JSON.stringify(initialColumns);
      if (prevStr !== newStr) {
        return initialColumns;
      }
      return prev;
    });
  }, [initialColumns]);

  // Helper function to perform the actual sync
  const performSync = useCallback((newRows) => {
    setRows(currentRows => {
      // Double-check we're not in edit mode
      if (isEditingRef.current) {
        return currentRows;
      }

      const currentRowsCount = currentRows.length;
      const newRowsCount = newRows.length;

      // If new data is empty, keep current data (avoid clearing table during loading)
      if (newRowsCount === 0) {
        return currentRows;
      }

      // Clear recently modified refs since we're doing a full sync after save
      recentlyModifiedRef.current.clear();

      // For rows that exist in both places, prefer server data
      // But keep temp rows that haven't been saved yet (ONLY if strict sync is disabled)
      let tempRows = [];
      if (preserveTempRows) {
        tempRows = currentRows.filter(r =>
          r.id.toString().startsWith('id_') &&
          !newRows.find(ir => ir.id === r.id)
        );
      }

      // Check if we have unsaved temp rows
      if (tempRows.length > 0) {
        return [...newRows, ...tempRows];
      }

      return newRows;
    });
  }, [preserveTempRows]);

  // Sync rows from parent with improved protection
  useEffect(() => {
    // Clear any pending sync timer
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    // Skip if user is currently editing
    if (isEditingRef.current) {
      prevInitialRowsRef.current = initialRows;
      return;
    }

    // If there's a pending save, store the data for later sync
    if (pendingSaveRef.current) {
      pendingInitialRowsRef.current = initialRows;
      return;
    }

    // Check if initialRows actually changed from previous props
    const hasChanged = !areRowsEqual(prevInitialRowsRef.current, initialRows);

    if (!hasChanged) {
      return;
    }

    // ปิดการ sync ชั่วคราวเพื่อแก้ไขปัญหา custom fields หายถาวร
    // ใช้วิธีง่ายๆ: ถ้ามีการเปลี่ยนแปลงให้ใช้ initialRows ทันที

    // ตรวจสอบว่าเป็นการอัปเดตจริงหรือไม่
    if (!hasChanged || initialRows.length === 0) {
      return;
    }

    // ใช้ initialRows โดยตรงเพื่อรักษาข้อมูลทั้งหมด
    setRows(initialRows);
    prevInitialRowsRef.current = initialRows;
    return;

    // Debounce the sync to prevent rapid updates
    syncTimerRef.current = setTimeout(() => {
      performSync(initialRows);
      prevInitialRowsRef.current = initialRows;
    }, 100);

    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, [initialRows, performSync]);

  // Helper to mark a row as recently modified
  const markRowModified = (rowId) => {
    recentlyModifiedRef.current.add(rowId);
    // Clear the mark after 2 seconds
    setTimeout(() => {
      recentlyModifiedRef.current.delete(rowId);
    }, 2000);
  };

  // Helper to set pending save status
  // When setting to false, check if there's pending data to sync
  const setPendingSave = (value) => {
    pendingSaveRef.current = value;

    // When save is complete, sync any pending data
    if (!value && pendingInitialRowsRef.current) {
      const pendingData = pendingInitialRowsRef.current;
      pendingInitialRowsRef.current = null;

      // Small delay to ensure state is stable
      setTimeout(() => {
        if (!isEditingRef.current && !pendingSaveRef.current) {
          performSync(pendingData);
          prevInitialRowsRef.current = pendingData;
        }
      }, 50);
    }
  };

  // Actions
  const handleCellClick = useCallback((rowId, colId) => {
    setEditingCell({ rowId, colId });
    setSelectedRow(rowId);
  }, []);

  const updateCell = useCallback((rowId, colId, value) => {
    // Mark row as modified to prevent sync override
    markRowModified(rowId);
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [colId]: value } : row))
    );
  }, []);

  const handleCellKeyDown = useCallback(
    (e, rowId, colId) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // ย้ายไปแถวถัดไป
        const rowIndex = rows.findIndex((r) => r.id === rowId);
        if (rowIndex < rows.length - 1) {
          setEditingCell({ rowId: rows[rowIndex + 1].id, colId });
        } else {
          setEditingCell(null);
          // เรียก onCellBlur เพื่อบันทึกข้อมูลเมื่อไปถึงแถวสุดท้าย
          if (onCellBlur) {
            onCellBlur(rowId, colId);
          }
        }
      } else if (e.key === "Tab") {
        e.preventDefault();
        // ย้ายไปคอลัมน์ถัดไป
        const colIndex = columns.findIndex((c) => c.id === colId);
        if (e.shiftKey) {
          if (colIndex > 0) {
            setEditingCell({ rowId, colId: columns[colIndex - 1].id });
          }
        } else {
          if (colIndex < columns.length - 1) {
            setEditingCell({ rowId, colId: columns[colIndex + 1].id });
          } else {
            // ถ้าเป็นคอลัมน์สุดท้าย ให้ไปแถวถัดไป
            const rowIndex = rows.findIndex((r) => r.id === rowId);
            if (rowIndex < rows.length - 1) {
              setEditingCell({ rowId: rows[rowIndex + 1].id, colId: columns[0].id });
            } else {
              setEditingCell(null);
              // เรียก onCellBlur เพื่อบันทึกข้อมูลเมื่อไปถึงท้ายสุด
              if (onCellBlur) {
                onCellBlur(rowId, colId);
              }
            }
          }
        }
      } else if (e.key === "Escape") {
        setEditingCell(null);
        // ไม่เรียก onCellBlur เมื่อกด Escape (ยกเลิกการแก้ไข)
      }
    },
    [rows, columns, onCellBlur]
  );

  const updateHeader = useCallback((colId, value) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === colId ? { ...col, name: value } : col))
    );
  }, []);

  const updateColumnType = useCallback((colId, newType) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === colId ? { ...col, type: newType } : col))
    );
  }, []);

  const updateColumnWidth = useCallback((colId, newWidth) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === colId ? { ...col, width: newWidth } : col))
    );
  }, []);

  const addRow = useCallback((afterRowId = null, initialData = {}) => {
    const newRow = { id: generateId(), ...initialData };
    setRows((prevRows) => {
      if (afterRowId) {
        const index = prevRows.findIndex((r) => r.id === afterRowId);
        return [
          ...prevRows.slice(0, index + 1),
          newRow,
          ...prevRows.slice(index + 1),
        ];
      }
      return [...prevRows, newRow];
    });
    return newRow; // Return the new row for external use
  }, []);

  const deleteRow = useCallback((rowId) => {
    setRows((prev) => prev.filter((row) => row.id !== rowId));
    setSelectedRow((prev) => (prev === rowId ? null : prev));
  }, []);

  const duplicateRow = useCallback((rowId) => {
    setRows((prev) => {
      const rowToDuplicate = prev.find((r) => r.id === rowId);
      if (!rowToDuplicate) return prev;

      const newRow = { ...rowToDuplicate, id: generateId() };
      const index = prev.findIndex((r) => r.id === rowId);
      const newRows = [...prev];
      newRows.splice(index + 1, 0, newRow);
      return newRows;
    });
  }, []);

  const addColumn = useCallback((targetColId = null, position = "after") => {
    const newColId = generateId();
    const newColumn = {
      id: newColId,
      name: "คอลัมน์ใหม่",
      width: 140,
      align: "center",
    };

    setColumns((prev) => {
      if (targetColId) {
        const index = prev.findIndex((c) => c.id === targetColId);
        const newCols = [...prev];
        const insertIndex = position === "after" ? index + 1 : index;
        newCols.splice(insertIndex, 0, newColumn);
        return newCols;
      }
      return [...prev, newColumn];
    });

    setRows((prev) => prev.map((row) => ({ ...row, [newColId]: "" })));
    return newColumn;
  }, []);

  const deleteColumn = useCallback((colId) => {
    setColumns((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((col) => col.id !== colId);
    });
    // Cleanup rows data
    setRows((prev) =>
      prev.map((row) => {
        const newRow = { ...row };
        delete newRow[colId];
        return newRow;
      })
    );
  }, []);

  const clearAll = useCallback(() => {
    if (confirm("คุณต้องการล้างข้อมูลทั้งหมดหรือไม่?")) {
      setRows((prev) =>
        prev.map((row) => {
          return { id: row.id };
        })
      );
    }
  }, []);

  const resetTable = useCallback(() => {
    if (confirm("คุณต้องการรีเซ็ตตารางกลับเป็นค่าเริ่มต้นหรือไม่?")) {
      setColumns(initialColumns);
      setRows(initialRows);
      setEditingCell(null);
      setEditingHeader(null);
      setSelectedRow(null);
    }
  }, [initialColumns, initialRows]);

  // Wrapper for setContextMenu to handle multiple arguments from TableRow/TableHeader
  const handleContextMenu = useCallback((e, type, rowId, colId) => {
    // If called with null (to close menu), pass through directly
    if (e === null) {
      setContextMenu(null);
      return;
    }
    // If called with event object and additional args (from TableRow/TableHeader)
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        type,
        rowId: rowId || null,
        colId: colId || null,
      });
    }
  }, []);

  // Helper to get current rows (for save operations)
  const getRows = useCallback(() => rows, [rows]);

  return {
    columns,
    rows,
    editingCell,
    editingHeader,
    contextMenu,
    selectedRow,
    setEditingCell,
    setEditingHeader,
    setContextMenu: handleContextMenu,
    setSelectedRow,
    // Actions
    handleCellClick,
    handleCellKeyDown, // Exporting this function
    updateCell,
    updateHeader,
    updateColumnType,
    updateColumnWidth,
    addRow,
    deleteRow,
    duplicateRow,
    addColumn,
    deleteColumn,
    clearAll,
    resetTable,
    setRows, // Exposed for special cases if needed
    // Helpers for save state management
    markRowModified,
    setPendingSave,
    getRows,
  };
}
