import { useRef } from "react";
import { Plus, X } from "lucide-react";

export function TableHeader({
  columns,
  editingHeader,
  onUpdateHeader,
  onEditHeader,
  onEditingBoxBlur,
  onAddColumn,
  onDeleteColumn,
  onContextMenu,
  onResizeColumn,
}) {
  const headerInputRef = useRef(null);

  // Resize Logic (View Logic)
  const handleResizeStart = (e, colId) => {
    e.preventDefault();
    const startX = e.clientX;
    const column = columns.find((c) => c.id === colId);
    const startWidth = column.width;

    const handleMouseMove = (e) => {
      const diff = e.clientX - startX;
      const newWidth = Math.max(80, startWidth + diff);
      onResizeColumn(colId, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <thead>
      <tr>
        <th className="row-number row-number-header">#</th>
        {columns.map((col) => (
          <th
            key={col.id}
            className="header-cell"
            style={{ width: col.width }}
            onContextMenu={(e) => onContextMenu(e, "column", null, col.id)}
          >
            <div className="header-content">
              {editingHeader === col.id ? (
                <input
                  ref={(el) => {
                    headerInputRef.current = el;
                    if (el) {
                      el.focus();
                      // Prevent aggressive selection reset if re-rendering?
                      // Better handled by useEffect in parent or autoFocus here
                    }
                  }}
                  autoFocus // Use autoFocus for simplicity
                  type="text"
                  className="header-input"
                  value={col.name}
                  onChange={(e) => onUpdateHeader(col.id, e.target.value)}
                  onBlur={onEditingBoxBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      onEditingBoxBlur();
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                />
              ) : (
                <span
                  className="header-text"
                  style={{ textAlign: col.align || "center" }}
                  onDoubleClick={() => onEditHeader(col.id)}
                >
                  {col.name}
                </span>
              )}

              <div className="header-actions">
                <button
                  className="header-btn"
                  onClick={() => onAddColumn(col.id)}
                  title="เพิ่มคอลัมน์"
                >
                  <Plus size={12} />
                </button>
                <button
                  className="header-btn danger"
                  onClick={(e) => {
                    e.stopPropagation(); // Stop propagation to prevent context menu or other things
                    onDeleteColumn(col.id);
                  }}
                  title="ลบคอลัมน์"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            <div
              className="resize-handle"
              onMouseDown={(e) => handleResizeStart(e, col.id)}
            />
          </th>
        ))}
        <th className="add-column-cell">
          <button
            className="add-column-btn"
            onClick={() => onAddColumn()}
            title="เพิ่มคอลัมน์"
          >
            <Plus size={20} />
          </button>
        </th>
        <th className="row-actions row-actions-header"></th>
      </tr>
    </thead>
  );
}
