import { memo } from "react";
import CustomSelect from "../../ui/CustomSelect";
import DatePicker from "../../ui/DatePicker";
import { formatThaiDate } from "@/utils/formatters";

/**
 * Performance: React.memo prevents re-rendering rows that haven't changed.
 * Custom comparison ensures only relevant prop changes trigger re-render.
 */
export const TableRow = memo(function TableRow({
  row,
  rowIndex,
  columns,
  selectedRow,
  editingCell,
  inputRef, // Passed from parent for focus management
  onCellClick,
  onCellChange,
  onCellBlur,
  onCellKeyDown,
  onDeleteRow,
  onContextMenu,
  onRowClick,
  onAddColumn, // Control rendering of add column cell
}) {
  return (
    <tr
      className={selectedRow === row.id ? "selected-row" : ""}
      onContextMenu={(e) => onContextMenu(e, "row", row.id)}
    >
      {/* ลำดับแถว - คลิกเพื่อดูรายละเอียด */}
      <td 
        className="row-number" 
        onClick={() => onRowClick && onRowClick(row)}
        style={{ cursor: onRowClick ? 'pointer' : 'default' }}
        title={onRowClick ? "คลิกเพื่อดูรายละเอียด" : undefined}
      >
        {onRowClick ? (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            {rowIndex + 1}
            <i className="fas fa-external-link-alt" style={{ fontSize: '0.65rem', opacity: 0.5 }}></i>
          </span>
        ) : (
          rowIndex + 1
        )}
      </td>

      {/* เซลล์ข้อมูล */}
      {columns.map((col) => {
        const isEditing =
          editingCell?.rowId === row.id && editingCell?.colId === col.id;

        // Debug logging สำหรับการแสดงผลคอลัมน์ (เฉพาะแถวแรกและแถวใหม่)
        if (row.id === 'row1' && (col.id === 'license_type_id' || col.id === 'license_number' || col.id === 'notes')) {
          console.log(`🔍 Cell Debug - Row: ${row.id}, Col: ${col.id} (${col.name}), Value:`, row[col.id]);
        }

        // Debug logging พิเศษสำหรับฟิลด์ที่มีปัญหา (เฉพาะแถวแรก)
        if (row.id === 'row1' && (col.id === 'license_type_id' || col.id === 'license_number' || col.id === 'notes')) {
          console.log(`🚨 Problem Field Check:`, {
            isEditing,
            isReadOnly: col.readOnly,
            canEdit: !col.readOnly,
            columnType: col.type,
            currentValue: row[col.id],
            willShowInput: isEditing && !col.readOnly
          });
        }

        return (
          <td
            key={col.id}
            className={`data-cell ${isEditing ? "editing" : ""}`}
            style={{ width: col.width }}
            data-type={col.type}
            onContextMenu={(e) => {
          // Debug logging สำหรับการคลิกขวา
          if (col.id.startsWith('cf_')) {
            console.log(`🔍 Custom Field Right Click:`, {
              rowId: row.id,
              columnId: col.id,
              columnName: col.name,
              currentValue: row[col.id],
              isEditable: !col.readOnly
            });
          }
          onContextMenu(e, "cell", row.id, col.id);
        }}
        onDoubleClick={() => {
          // Debug logging สำหรับการดับเบิลคลิก (เฉพาะฟิลด์ที่มีปัญหาและแถวแรก)
          if (row.id === 'row1' && (col.id === 'license_type_id' || col.id === 'license_number' || col.id === 'notes')) {
            console.log(`🚨 Problem Field Double Click:`, {
              rowId: row.id,
              columnId: col.id,
              columnName: col.name,
              currentValue: row[col.id],
              isEditable: !col.readOnly,
              willStartEditing: !col.readOnly,
              columnType: col.type,
              columnOptions: col.options
            });
          }
          onCellClick(row.id, col.id);
        }}
          >
            {(!col.readOnly && !col.render) ? (
              col.type === "select" ? (
                <CustomSelect
                  value={row[col.id] || ""}
                  onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                  options={[{ value: "", label: "-- เลือก --" }, ...(col.options || [])]}
                  autoFocus={isEditing}
                  onFocus={() => !isEditing && onCellClick(row.id, col.id)}
                  onBlur={() => onCellBlur(row.id, col.id)}
                  className="cell-input-custom"
                />
              ) : col.type === "date" ? (
                <DatePicker
                  value={row[col.id] || ""}
                  onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                  autoFocus={isEditing}
                  onFocus={() => !isEditing && onCellClick(row.id, col.id)}
                  onBlur={() => onCellBlur(row.id, col.id)}
                  className="cell-input-custom"
                />
              ) : (
                <input
                  ref={isEditing ? inputRef : null}
                  id={`cell-input-${row.id}-${col.id}`}
                  name={`cell-input-${row.id}-${col.id}`}
                  aria-label={`แก้ไข ${col.name}`}
                  type={col.type || "text"}
                  className="cell-input"
                  value={row[col.id] || ""}
                  onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                  onFocus={() => !isEditing && onCellClick(row.id, col.id)}
                  onBlur={() => onCellBlur(row.id, col.id)}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, col.id)}
                  style={{ textAlign: col.align || "left" }}
                />
              )
            ) : (
              <div
                className="cell-content"
                style={{
                  justifyContent:
                    col.align === "center"
                      ? "center"
                      : col.align === "right"
                      ? "flex-end"
                      : "flex-start",
                  textAlign: col.align || "left",
                }}
              >
                <span className="cell-text" style={{ flex: "0 1 auto" }}>
                  {col.render ? (
                    col.render(row[col.id], row, isEditing)
                  ) : col.type === "date" && row[col.id] ? (
                    formatThaiDate(row[col.id])
                  ) : (
                    row[col.id] !== undefined && row[col.id] !== null && row[col.id] !== "" ? row[col.id] : ""
                  )}
                </span>
              </div>
            )}
          </td>
        );
      })}

      {/* เซลล์ว่างสำหรับปุ่มเพิ่มคอลัมน์ - Only if feature enabled */}
      {onAddColumn && <td className="add-column-cell" />}

      {/* การจัดการแถว */}
      <td className="row-actions">
        <button
          className="row-action-btn"
          onClick={() => onDeleteRow(row.id)}
          title="ลบแถว"
          aria-label="ลบแถว"
        >
          <i className="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  );
}, function areEqual(prevProps, nextProps) {
  // Only re-render if this specific row's data or editing state changed
  if (prevProps.row !== nextProps.row) return false;
  if (prevProps.rowIndex !== nextProps.rowIndex) return false;
  if (prevProps.selectedRow !== nextProps.selectedRow) return false;
  if (prevProps.columns !== nextProps.columns) return false;
  
  // Check if editing state changed for THIS row
  const prevEditing = prevProps.editingCell;
  const nextEditing = nextProps.editingCell;
  const rowId = prevProps.row.id;
  
  const prevIsEditingThisRow = prevEditing?.rowId === rowId;
  const nextIsEditingThisRow = nextEditing?.rowId === rowId;
  
  if (prevIsEditingThisRow !== nextIsEditingThisRow) return false;
  if (prevIsEditingThisRow && nextIsEditingThisRow && prevEditing?.colId !== nextEditing?.colId) return false;
  
  return true;
});
