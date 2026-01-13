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
}) {
  return (
    <tr
      className={selectedRow === row.id ? "selected-row" : ""}
      onContextMenu={(e) => onContextMenu(e, "row", row.id)}
    >
      {/* ลำดับแถว */}
      <td className="row-number">{rowIndex + 1}</td>

      {/* เซลล์ข้อมูล */}
      {columns.map((col) => {
        const isEditing =
          editingCell?.rowId === row.id && editingCell?.colId === col.id;

        return (
          <td
            key={col.id}
            className={`data-cell ${isEditing ? "editing" : ""}`}
            style={{ width: col.width }}
            onClick={() => onCellClick(row.id, col.id)}
          >
            {isEditing && !col.readOnly ? (
              col.type === "select" ? (
                <select
                  ref={inputRef}
                  className="cell-input"
                  value={row[col.id] || ""}
                  onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                  onBlur={() => onCellBlur(row.id, col.id)}
                  onKeyDown={(e) => onCellKeyDown(e, row.id, col.id)}
                  style={{ textAlign: col.align || "left" }}
                >
                  <option value="">-- เลือก --</option>
                  {col.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  ref={inputRef}
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

      {/* เซลล์ว่างสำหรับปุ่มเพิ่มคอลัมน์ */}
      <td className="add-column-cell" />

      {/* การจัดการแถว */}
      <td className="row-actions">
        <button
          className="row-action-btn"
          onClick={() => onDeleteRow(row.id)}
          title="ลบแถว"
        >
          <i className="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  );
}
