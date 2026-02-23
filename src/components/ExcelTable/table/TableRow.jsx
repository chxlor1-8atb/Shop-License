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

        // Debug logging สำหรับการแสดงผลคอลัมน์
        if (row.id === 'row1' || row.id?.toString().startsWith('id_')) {
          console.log(`🔍 Cell Debug - Row: ${row.id}, Col: ${col.id} (${col.name}), Value:`, row[col.id]);
        }

        // Debug logging สำหรับการแสดงผลคอลัมน์
        if (col.id === 'cf_selling_location' || col.id === 'cf_amount' || col.id === 'issue_date' || col.id === 'expiry_date') {
          console.log(`🔍 Cell Display Debug - Row: ${row.id}, Col: ${col.id} (${col.name}), Value:`, row[col.id], 'Type:', col.type);
          console.log(`🔍 Row Keys:`, Object.keys(row));
          console.log(`🔍 Row Data:`, row);
          console.log(`🔍 Column Properties:`, {
            id: col.id,
            name: col.name,
            type: col.type,
            readOnly: col.readOnly,
            isCustom: col.isCustom
          });
          
          // เพิ่การตรวจสอบค่าในฟิลด์ที่แก้ไปลีกอยู่มีค่า
          if (col.id.startsWith('cf_')) {
            console.log(`🔍 Custom Field Value Check:`, {
              rowId: row.id,
              columnId: col.id,
              columnName: col.name,
              currentValue: row[col.id],
              currentValueIsEmpty: row[col.id] === '' || row[col.id] === null || row[col.id] === undefined,
              currentValueString: JSON.stringify(row[col.id]),
              hasValue: row[col.id] !== undefined && row[col.id] !== null && row[col.id] !== ''
            });
          }
        }

        // Debug logging สำหรับตรวจสอบว่า custom field สามารถแก้ไขได้หรือไม่
        if (col.id.startsWith('cf_')) {
          console.log(`🔍 Custom Field Editable Check:`, {
            rowId: row.id,
            columnId: col.id,
            columnName: col.name,
            currentValue: row[col.id],
            isEditing: isEditing,
            isReadOnly: col.readOnly,
            canEdit: !col.readOnly,
            fieldType: col.type,
            hasValue: row[col.id] !== undefined && row[col.id] !== null && row[col.id] !== ''
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
          // Debug logging สำหรับการดับเบิลคลิก
          if (col.id.startsWith('cf_') || col.id === 'notes') {
            console.log(`🔍 Field Double Click:`, {
              rowId: row.id,
              columnId: col.id,
              columnName: col.name,
              currentValue: row[col.id],
              isEditable: !col.readOnly,
              willStartEditing: !col.readOnly,
              allRowKeys: Object.keys(row),
              hasShopId: 'shop_id' in row,
              hasLicenseTypeId: 'license_type_id' in row,
              hasLicenseNumber: 'license_number' in row,
              hasNotes: 'notes' in row,
              isNotesField: col.id === 'notes'
            });
          }
          onCellClick(row.id, col.id);
        }}
          >
            {isEditing && !col.readOnly ? (
              col.type === "select" ? (
                <CustomSelect
                  value={row[col.id] || ""}
                  onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                  options={[{ value: "", label: "-- เลือก --" }, ...(col.options || [])]}
                  autoFocus={true}
                  onBlur={() => onCellBlur(row.id, col.id)}
                  className="cell-input-custom"
                />
              ) : col.type === "date" ? (
                <DatePicker
                  value={row[col.id] || ""}
                  onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                  autoFocus={true}
                  onBlur={() => onCellBlur(row.id, col.id)}
                  className="cell-input-custom"
                />
              ) : (
                <input
                  ref={inputRef}
                  id={`cell-input-${row.id}-${col.id}`}
                  name={`cell-input-${row.id}-${col.id}`}
                  aria-label={`แก้ไข ${col.name}`}
                  type={col.type || "text"}
                  className="cell-input"
                  value={row[col.id] || ""}
                  onChange={(e) => {
                    // Debug logging สำหรับการแก้ไข fields
                    if (col.id.startsWith('cf_') || col.id === 'notes') {
                      console.log(`🔧 Field Input Change:`, {
                        rowId: row.id,
                        columnId: col.id,
                        columnName: col.name,
                        oldValue: row[col.id],
                        newValue: e.target.value,
                        fieldType: col.type,
                        allRowKeys: Object.keys(row),
                        hasShopId: 'shop_id' in row,
                        hasLicenseTypeId: 'license_type_id' in row,
                        hasLicenseNumber: 'license_number' in row,
                        hasNotes: 'notes' in row,
                        isEditing: true,
                        isNotesField: col.id === 'notes',
                        isCustomField: col.id.startsWith('cf_')
                      });
                    }
                    onCellChange(row.id, col.id, e.target.value);
                  }}
                  onBlur={() => {
                    // Debug logging สำหรับการ blur custom fields
                    if (col.id.startsWith('cf_')) {
                      console.log(`🔧 Custom Field Input Blur:`, {
                        rowId: row.id,
                        columnId: col.id,
                        columnName: col.name,
                        currentValue: row[col.id]
                      });
                    }
                    onCellBlur(row.id, col.id);
                  }}
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
                    col.render(row[col.id], row)
                  ) : col.type === "date" && row[col.id] ? (
                    formatThaiDate(row[col.id])
                  ) : col.type === "date" && !row[col.id] ? (
                    "-"
                  ) : col.type === "select" && col.options ? (
                    col.isBadge ? (
                      <span
                        className={`badge badge-${row[col.id]}`}
                        style={{ width: "fit-content" }}
                      >
                        {col.options.find((o) => o.value == row[col.id])?.label ||
                          row[col.id] ||
                          ""}
                      </span>
                    ) : (
                      col.options.find((o) => o.value == row[col.id])?.label ||
                      row[col.id] ||
                      ""
                    )
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
