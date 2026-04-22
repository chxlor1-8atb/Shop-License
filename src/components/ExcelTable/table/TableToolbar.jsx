export function TableToolbar({
  onClear,
  onReset,
}) {
  // Hide toolbar if no actions available
  if (!onClear && !onReset) {
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
    </div>
  );
}
