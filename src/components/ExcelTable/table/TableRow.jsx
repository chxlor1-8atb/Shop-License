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
              <input
                ref={inputRef}
                type={col.type || "text"}
                className="cell-input"
                value={row[col.id] || ""}
                onChange={(e) => onCellChange(row.id, col.id, e.target.value)}
                onBlur={() => onCellBlur(row.id, col.id)} /* Pass identifiers */
                onKeyDown={(e) => onCellKeyDown(e, row.id, col.id)}
                style={{ textAlign: col.align || "left" }}
              />
            ) : (
              <div className="cell-content">
                <span
                  className="cell-text"
                  style={{ textAlign: col.align || "left" }}
                >
                  {col.type === "date" && row[col.id]
                    ? new Date(row[col.id]).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : row[col.id] || ""}
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
