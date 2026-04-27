"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * ExportColumnsModal — เลือกคอลัมน์ที่จะ export
 *
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {Array<{ key: string, label: string }>} columns - คอลัมน์ทั้งหมดที่ export ได้
 * @param {(selectedKeys: string[]) => void | Promise<void>} onConfirm
 * @param {string} title
 */
export default function ExportColumnsModal({
  isOpen,
  onClose,
  columns = [],
  onConfirm,
  title = "เลือกคอลัมน์ที่จะ Export",
}) {
  const [selected, setSelected] = useState(() => new Set(columns.map((c) => c.key)));
  const [submitting, setSubmitting] = useState(false);

  // Reset เมื่อเปิด modal ใหม่
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set(columns.map((c) => c.key)));
    }
  }, [isOpen, columns]);

  if (!isOpen) return null;

  const toggle = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(columns.map((c) => c.key)));
  const clearAll = () => setSelected(new Set());

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(Array.from(selected));
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay show" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>
            <i className="fas fa-file-pdf" style={{ marginRight: 8, color: "#16a34a" }}></i>
            {title}
          </h3>
          <button className="modal-close" onClick={onClose} disabled={submitting}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
              เลือกแล้ว <strong>{selected.size}</strong> / {columns.length} คอลัมน์
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={selectAll} disabled={submitting}>
                เลือกทั้งหมด
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearAll} disabled={submitting}>
                ล้าง
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.5rem",
              maxHeight: 360,
              overflowY: "auto",
              padding: "0.5rem",
              border: "1px solid var(--border-color)",
              borderRadius: 8,
            }}
          >
            {columns.map((col) => {
              const checked = selected.has(col.key);
              return (
                <label
                  key={col.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.75rem",
                    borderRadius: 6,
                    background: checked ? "var(--primary-bg, #eff6ff)" : "transparent",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(col.key)}
                    disabled={submitting}
                  />
                  <span>{col.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="btn btn-success"
            onClick={handleConfirm}
            disabled={selected.size === 0 || submitting}
          >
            {submitting ? (
              <><i className="fas fa-spinner fa-spin"></i> กำลังส่งออก...</>
            ) : (
              <><i className="fas fa-file-pdf"></i> Export PDF</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
