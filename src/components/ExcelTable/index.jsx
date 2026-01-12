"use client";

import { useRef, useEffect } from "react";

import { useExcelTable } from "./table/TableHooks";
import { TableToolbar } from "./table/TableToolbar";
import { TableHeader } from "./table/TableHeader";
import { TableRow } from "./table/TableRow";
import { TableContextMenu } from "./table/TableContextMenu";

/**
 * ExcelTable Component
 *
 * Supports external control via onRowUpdate, onRowAdd, onRowDelete, onRowDuplicate
 */
export default function ExcelTable({
  initialColumns,
  initialRows,
  onRowUpdate,
  onRowDelete,
  onRowAdd,
  onRowDuplicate,
}) {
  // Logic & State management extracted to custom hook
  const {
    columns,
    rows,
    editingCell,
    editingHeader,
    contextMenu,
    selectedRow,
    setEditingCell,
    setEditingHeader,
    setContextMenu,
    // Actions
    handleCellClick,
    updateCell,
    updateHeader,
    updateColumnWidth,
    addRow,
    deleteRow,
    duplicateRow,
    addColumn,
    deleteColumn,
    clearAll,
    resetTable,
    handleCellKeyDown,
  } = useExcelTable({ initialColumns, initialRows });

  // Refs for Focus Management (View Logic)
  const tableRef = useRef(null);
  const inputRef = useRef(null);

  // Focus input when editing cell changes
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Optional: select all text
    }
  }, [editingCell]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [setContextMenu]);

  // Wrappers to notify parent
  const handleCellChange = (rowId, colId, value) => {
    updateCell(rowId, colId, value);
    // NOTE: We probably don't want to call API on every keystroke, but on Blur.
    // However, we are updating local state here.
  };

  const handleCellBlur = (rowId, colId) => {
    setEditingCell(null);
    if (onRowUpdate) {
      // Find the updated row and notify parent
      const row = rows.find((r) => r.id === rowId);
      if (row) {
        onRowUpdate(row);
      }
    }
  };

  const handleAddRow = () => {
    const newRow = addRow();
    if (onRowAdd) onRowAdd(newRow);
  };

  const handleDeleteRow = (rowId) => {
    deleteRow(rowId);
    if (onRowDelete) onRowDelete(rowId);
  };

  const handleDuplicateRow = (rowId) => {
    duplicateRow(rowId);
    // This is trickier because we need the new row ID.
    // For now, let's just support basic add/update/delete
  };

  return (
    <div className="table-card">
      <TableToolbar
        onExport={() => {
          const data = {
            columns: columns.map((c) => ({
              id: c.id,
              name: c.name,
              width: c.width,
            })),
            rows: rows.map((r) => {
              const row = {};
              columns.forEach((c) => {
                row[c.name] = r[c.id];
              });
              return row;
            }),
          };
          const json = JSON.stringify(data, null, 2);
          const blob = new Blob([json], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "table-data.json";
          a.click();
          URL.revokeObjectURL(url);
        }}
        onClear={clearAll}
        onReset={resetTable}
      />

      <div className="table-container" ref={tableRef}>
        <table className="excel-table">
          <TableHeader
            columns={columns}
            editingHeader={editingHeader}
            onUpdateHeader={updateHeader}
            onEditHeader={setEditingHeader}
            onEditingBoxBlur={() => setEditingHeader(null)}
            onAddColumn={addColumn}
            onDeleteColumn={deleteColumn}
            onContextMenu={setContextMenu}
            onResizeColumn={updateColumnWidth}
          />

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 3}
                  style={{
                    textAlign: "center",
                    padding: "3rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ marginBottom: "1rem" }}>
                    ยังไม่มีข้อมูลในตาราง
                  </div>
                  <button
                    className="btn btn-outline-primary"
                    onClick={handleAddRow}
                    style={{ margin: "0 auto", padding: "0.5rem 1rem" }}
                  >
                    <Plus size={18} /> เพิ่มแถวแรก
                  </button>
                </td>
              </tr>
            )}
            {rows.map((row, rowIndex) => (
              <TableRow
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                columns={columns}
                selectedRow={selectedRow}
                editingCell={editingCell}
                inputRef={inputRef}
                onCellClick={handleCellClick}
                onCellChange={handleCellChange}
                onCellBlur={(rowId, colId) => handleCellBlur(rowId, colId)}
                onCellKeyDown={handleCellKeyDown}
                onDeleteRow={handleDeleteRow}
                onContextMenu={setContextMenu}
              />
            ))}
          </tbody>
        </table>
      </div>

      <TableContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddRow={(id) => {
          const newRow = addRow(id);
          if (onRowAdd) onRowAdd(newRow);
        }}
        onDuplicateRow={(rowId) => {
          duplicateRow(rowId);
          // TODO: Handle duplicate callback if needed
        }}
        onDeleteRow={handleDeleteRow}
        onEditHeader={setEditingHeader}
        onAddColumn={addColumn}
        onDeleteColumn={deleteColumn}
      />
    </div>
  );
}
