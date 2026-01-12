import { createPortal } from "react-dom";

export function TableContextMenu({
  contextMenu,
  onClose,
  onAddRow,
  onDuplicateRow,
  onDeleteRow,
  onEditHeader,
  onAddColumn,
  onDeleteColumn,
}) {
  if (!contextMenu) return null;

  // Use Portal to render menu at root level to prevent clipping/z-index issues
  return createPortal(
    <div
      className="context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {contextMenu.type === "row" && (
        <>
          <div
            className="context-menu-item"
            onClick={() => {
              onAddRow(contextMenu.rowId);
              onClose();
            }}
          >
            <i className="fas fa-plus"></i> เพิ่มแถวด้านล่าง
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onDuplicateRow(contextMenu.rowId);
              onClose();
            }}
          >
            <i className="fas fa-copy"></i> ทำซ้ำแถว
          </div>
          <div className="context-menu-divider" />
          <div
            className="context-menu-item danger"
            onClick={() => {
              onDeleteRow(contextMenu.rowId);
              onClose();
            }}
          >
            <i className="fas fa-trash"></i> ลบแถว
          </div>
        </>
      )}

      {contextMenu.type === "column" && (
        <>
          <div
            className="context-menu-item"
            onClick={() => {
              onEditHeader(contextMenu.colId);
              onClose();
            }}
          >
            <Pencil size={16} /> แก้ไขชื่อคอลัมน์
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onAddColumn(contextMenu.colId, "before");
              onClose();
            }}
          >
            <Plus size={16} /> เพิ่มคอลัมน์ด้านซ้าย
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onAddColumn(contextMenu.colId, "after");
              onClose();
            }}
          >
            <Plus size={16} /> เพิ่มคอลัมน์ด้านขวา
          </div>
          <div className="context-menu-divider" />
          <div
            className="context-menu-item danger"
            onClick={() => {
              onDeleteColumn(contextMenu.colId);
              onClose();
            }}
          >
            <Trash2 size={16} /> ลบคอลัมน์
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
