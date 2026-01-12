import { FileJson, Eraser, RotateCcw, Lightbulb } from "lucide-react";

export function TableToolbar({ onExport, onClear, onReset }) {
  return (
    <div className="table-toolbar">
      <div className="toolbar-group">
        <button className="btn btn-ghost" onClick={onExport}>
          <FileJson size={16} /> Export JSON
        </button>
        <button className="btn btn-ghost" onClick={onClear}>
          <Eraser size={16} /> ล้างข้อมูล
        </button>
        <button className="btn btn-ghost" onClick={onReset}>
          <RotateCcw size={16} /> รีเซ็ต
        </button>
      </div>

      <div
        className="toolbar-group"
        style={{
          color: "var(--text-muted)",
          fontSize: "0.875rem",
          marginLeft: "auto",
        }}
      >
        <Lightbulb size={16} /> คลิก 2 ครั้งที่หัวตารางเพื่อแก้ไข |
        คลิกขวาเพื่อเปิดเมนู
      </div>
    </div>
  );
}
