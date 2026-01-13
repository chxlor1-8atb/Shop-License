export function TableToolbar({
  onExport,
  onClear,
  onReset,
  exportLabel = "Export JSON",
  exportIcon = "fa-file-code",
}) {
  return (
    <div className="table-toolbar">
      <div className="toolbar-group">
        {onClear && (
          <button className="btn btn-ghost" onClick={onClear}>
            <i className="fas fa-eraser"></i> ล้างข้อมูล
          </button>
        )}
        {onReset && (
          <button className="btn btn-ghost" onClick={onReset}>
            <i className="fas fa-redo"></i> รีเซ็ต
          </button>
        )}
      </div>

      <div
        className="toolbar-group"
        style={{
          color: "var(--text-muted)",
          fontSize: "0.875rem",
          marginLeft: "auto",
        }}
      >
        <i className="fas fa-lightbulb"></i> คลิก 2 ครั้งที่หัวตารางเพื่อแก้ไข |
        คลิกขวาเพื่อเปิดเมนู
      </div>
    </div>
  );
}
