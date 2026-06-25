"use client";

import { useEffect, useRef } from "react";

/**
 * CursorGlow - แสงวงกลมนุ่มๆ ตามเมาส์ทั่วทั้งหน้า
 * ทำให้หน้าดูมีชีวิต คล้าย spotlight ตามตัวสำรวจ
 * Optimized: rAF + lerp ให้ลื่นไหล + ปิดบน mobile
 */
export default function CursorGlow() {
  const ref = useRef(null);

  useEffect(() => {
    // ข้ามบน touch device
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const el = ref.current;
    if (!el) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX = mouseX;
    let curY = mouseY;
    let frame = null;

    const onMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const loop = () => {
      // lerp ให้เคลื่อนที่นุ่มนวล (ตามหลังเมาส์เล็กน้อย)
      curX += (mouseX - curX) * 0.15;
      curY += (mouseY - curY) * 0.15;
      el.style.transform = `translate3d(${curX - 250}px, ${curY - 250}px, 0)`;
      frame = requestAnimationFrame(loop);
    };

    window.addEventListener("pointermove", onMove);
    frame = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="cursor-glow" ref={ref} aria-hidden="true" />;
}
