"use client";

import { useRef, useEffect } from "react";
import "./ExcelTable.css";

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
  onColumnAdd,
  onColumnDelete,
  onColumnUpdate,
  onRowClick,
  onExport,
  exportLabel,
  exportIcon,
  allowClear = false,
  allowReset = false,
  defaultRowValues = {},
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
    updateColumnType,
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
      if (typeof inputRef.current.select === 'function') {
        inputRef.current.select(); // Optional: select all text
      }
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
    const newRow = addRow(null, defaultRowValues);
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

  // Column wrappers
  const handleAddColumn = (targetColId, position) => {
    const newCol = addColumn(targetColId, position);
    if (onColumnAdd) onColumnAdd(newCol);
  };

  const handleDeleteColumn = (colId) => {
    deleteColumn(colId);
    if (onColumnDelete) onColumnDelete(colId);
  };

  const handleUpdateHeader = (colId, name) => {
    updateHeader(colId, name);
    // Don't call onColumnUpdate here to avoid saving on every keystroke
  };

  const handleHeaderCommit = (colId, name) => {
    if (onColumnUpdate) onColumnUpdate({ id: colId, name });
  };

  const handleUpdateColumnType = (colId, type) => {
    updateColumnType(colId, type);
    if (onColumnUpdate) onColumnUpdate({ id: colId, type });
  };

  return (
    <div className="table-card">
      <TableToolbar
        onExport={
          onExport
            ? () => onExport(rows)
            : () => {
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
              }
        }
        exportLabel={exportLabel}
        exportIcon={exportIcon}
        onClear={allowClear ? clearAll : null}
        onReset={allowReset ? resetTable : null}
      />

      <div className="table-container" ref={tableRef}>
        <table className="excel-table">
          <TableHeader
            columns={columns}
            editingHeader={editingHeader}
            onUpdateHeader={handleUpdateHeader}
            onHeaderCommit={handleHeaderCommit}
            onEditHeader={setEditingHeader}
            onEditingBoxBlur={() => setEditingHeader(null)}
            onAddColumn={onColumnAdd ? handleAddColumn : undefined}
            onDeleteColumn={handleDeleteColumn}
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
                    padding: "4rem 2rem",
                    background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(249,250,251,0.5) 100%)"
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    gap: '1.5rem'
                  }}>
                    <div style={{
                      width: '80px', height: '80px',
                      background: 'linear-gradient(135deg, rgba(217, 119, 87, 0.1), rgba(217, 119, 87, 0.05))',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: '0.5rem',
                      boxShadow: 'inset 0 0 0 1px rgba(217, 119, 87, 0.1)'
                    }}>
                      <i className="fas fa-folder-open" style={{ fontSize: '2.5rem', color: 'var(--primary)', opacity: 0.8 }}></i>
                    </div>
                    
                    <div>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--gray-800)', fontSize: '1.1rem' }}>ยังไม่มีข้อมูลในตาราง</h4>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        เริ่มต้นด้วยการเพิ่มข้อมูลแถวแรก
                      </p>
                    </div>

                    <button
                      className="btn"
                      onClick={handleAddRow}
                      style={{ 
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(217, 119, 87, 0.3)',
                        border: 'none',
                        fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <i className="fas fa-plus"></i> 
                      <span>เพิ่มแถวแรก</span>
                    </button>
                  </div>
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
                onRowClick={onRowClick}
                onAddColumn={onColumnAdd} // Pass to conditionally render empty cell
              />
            ))}
          </tbody>
        </table>
      </div>

      <TableContextMenu
        contextMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddRow={(id) => {
          const newRow = addRow(id, defaultRowValues);
          if (onRowAdd) onRowAdd(newRow);
        }}
        onDuplicateRow={(rowId) => {
          duplicateRow(rowId);
        }}
        onDeleteRow={handleDeleteRow}
        onEditCell={(rowId, colId) => {
          setEditingCell({ rowId, colId });
        }}
        onEditHeader={setEditingHeader}
        onAddColumn={handleAddColumn}
        onDeleteColumn={handleDeleteColumn}
        onUpdateColumnType={handleUpdateColumnType}
      />
    </div>
  );
}
