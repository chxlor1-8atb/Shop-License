import { Plus, Copy, Trash2, Pencil } from "lucide-react";

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

  return (
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
            <Plus size={16} /> เพิ่มแถวด้านล่าง
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onDuplicateRow(contextMenu.rowId);
              onClose();
            }}
          >
            <Copy size={16} /> ทำซ้ำแถว
          </div>
          <div className="context-menu-divider" />
          <div
            className="context-menu-item danger"
            onClick={() => {
              onDeleteRow(contextMenu.rowId);
              onClose();
            }}
          >
            <Trash2 size={16} /> ลบแถว
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
    </div>
  );
}
