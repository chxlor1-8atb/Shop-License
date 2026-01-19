import CustomSelect from "../../ui/CustomSelect";
import DatePicker from "../../ui/DatePicker";

export function TableRow({
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
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

        return (
          <td
            key={col.id}
            className={`data-cell ${isEditing ? "editing" : ""}`}
            style={{ width: col.width }}
            data-type={col.type}
            onContextMenu={(e) => onContextMenu(e, "cell", row.id, col.id)}
            onDoubleClick={() => onCellClick(row.id, col.id)}
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
                  onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                  onBlur={() =>
                    onCellBlur(row.id, col.id)
                  } /* Pass identifiers */
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
                  {col.type === "date" && row[col.id]
                    ? new Date(row[col.id]).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                  : col.type === "select" && col.options ? (
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
                    row[col.id] || ""
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
}
