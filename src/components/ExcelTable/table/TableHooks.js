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

export function useExcelTable({
  initialColumns = defaultColumns,
  initialRows = defaultRows,
} = {}) {
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState(initialRows);
  const [editingCell, setEditingCell] = useState(null); // { rowId, colId }
  const [editingHeader, setEditingHeader] = useState(null); // colId
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type, rowId?, colId? }
  const [selectedRow, setSelectedRow] = useState(null);

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

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  // Actions
  const handleCellClick = useCallback((rowId, colId) => {
    setEditingCell({ rowId, colId });
    setSelectedRow(rowId);
  }, []);

  const updateCell = useCallback((rowId, colId, value) => {
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
          }
        }
      } else if (e.key === "Escape") {
        setEditingCell(null);
      }
    },
    [rows, columns]
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

  const addRow = useCallback((afterRowId = null) => {
    const newRow = { id: generateId() };
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
      align: "left",
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
  };
}
