import { createPortal } from "react-dom";

export function TableContextMenu({
  contextMenu,
  onClose,
  onAddRow,
  onDuplicateRow,
  onDeleteRow,
  onEditCell,
  onEditHeader,
  onAddColumn,
  onDeleteColumn,
  onUpdateColumnType,
}) {
  if (!contextMenu) return null;

  // Use Portal to render menu at root level to prevent clipping/z-index issues
  return createPortal(
    <div
      className="context-menu"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Cell Context Menu */}
      {contextMenu.type === "cell" && (
        <>
          <div
            className="context-menu-item"
            onClick={() => {
              if (onEditCell) onEditCell(contextMenu.rowId, contextMenu.colId);
              onClose();
            }}
          >
            <i className="fas fa-pencil-alt"></i> แก้ไขข้อมูล
          </div>
          <div className="context-menu-divider" />
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

      {/* Row Context Menu */}
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
            <i className="fas fa-pencil-alt"></i> แก้ไขชื่อคอลัมน์
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onAddColumn(contextMenu.colId, "before");
              onClose();
            }}
          >
            <i className="fas fa-plus"></i> เพิ่มคอลัมน์ด้านซ้าย
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onAddColumn(contextMenu.colId, "after");
              onClose();
            }}
          >
            <i className="fas fa-plus"></i> เพิ่มคอลัมน์ด้านขวา
          </div>

          <div className="context-menu-divider" />
          <div
            style={{
              padding: "4px 12px",
              fontSize: "11px",
              color: "#999",
              fontWeight: 600,
            }}
          >
            ชนิดข้อมูล
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onUpdateColumnType(contextMenu.colId, "text");
              onClose();
            }}
          >
            <i className="fas fa-font" style={{ width: "20px" }}></i> ข้อความ
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onUpdateColumnType(contextMenu.colId, "number");
              onClose();
            }}
          >
            <i className="fas fa-hashtag" style={{ width: "20px" }}></i> ตัวเลข
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              onUpdateColumnType(contextMenu.colId, "date");
              onClose();
            }}
          >
            <i className="fas fa-calendar" style={{ width: "20px" }}></i> วันที่
          </div>

          <div className="context-menu-divider" />
          <div
            className="context-menu-item danger"
            onClick={() => {
              onDeleteColumn(contextMenu.colId);
              onClose();
            }}
          >
            <i className="fas fa-trash"></i> ลบคอลัมน์
          </div>
        </>
      )}
    </div>,
    document.body
  );
}
