export function TableToolbar({
  onExport,
  onClear,
  onReset,
  exportLabel = "Export JSON",
  exportIcon = "fa-file-code",
}) {
  // Hide toolbar if no actions available
  if (!onClear && !onReset && !onExport) {
    return null;
  }

  return (
    <div className="table-toolbar">
      <div className="toolbar-group">
        {onClear && (
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            <i className="fas fa-eraser"></i> ล้างข้อมูล
          </button>
        )}
        {onReset && (
          <button type="button" className="btn btn-ghost" onClick={onReset}>
            <i className="fas fa-redo"></i> รีเซ็ต
          </button>
        )}
      </div>

      <div
        className="toolbar-group"
        style={{
          marginLeft: "auto",
        }}
      >
        {onExport && (
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={onExport}
            title={exportLabel}
          >
            <i className={`fas ${exportIcon}`}></i> {exportLabel}
          </button>
        )}
      </div>
    </div>
  );
}
