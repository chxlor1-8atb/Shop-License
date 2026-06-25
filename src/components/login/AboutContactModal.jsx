"use client";

import { useEffect, useRef, useState } from "react";
import { FaXmark, FaLine, FaInstagram, FaFacebookF } from "react-icons/fa6";

// ============================================================
//  Social links config — ข้อมูลผู้จัดทำ
// ============================================================
const PROFILE = {
  name: "Chaiwat Sangsanit",
  role: "ผู้พัฒนาระบบ",
  tagline: "หากมีปัญหาด้านการใช้งาน",
  image: "/image/profile.jpg",
  socials: [
    {
      key: "line",
      label: "LINE",
      handle: "Chxrtxxm",
      icon: <FaLine />,
      color: "#06C755",
      href: "https://line.me/ti/p/~Chxrtxxm",
    },
    {
      key: "ig",
      label: "Instagram",
      handle: "@bankiieyz",
      icon: <FaInstagram />,
      color: "#E1306C",
      href: "https://instagram.com/bankiieyz",
    },
    {
      key: "fb",
      label: "Facebook",
      handle: "Chaiwat B. Sangsanit",
      icon: <FaFacebookF />,
      color: "#1877F2",
      href: "https://www.facebook.com/chaiwat.b.sangsanit/",
    },
  ],
};

// ตำแหน่ง particle สุ่ม (fixed เพื่อ performance — ไม่ re-render)
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 2 + Math.random() * 3,
  delay: Math.random() * 6,
  duration: 6 + Math.random() * 8,
  depth: Math.random(), // ใช้สำหรับ parallax
}));

export const AboutContactModal = ({ open, onClose }) => {
  const [closing, setClosing] = useState(false);
  const cardRef = useRef(null);
  const innerRef = useRef(null); // เนื้อหาด้านในสำหรับ parallax

  // Parallax 3D depth — เนื้อหาขยับตามเมาส์เป็นชั้นๆ
  const handleCardMove = (e) => {
    const card = cardRef.current;
    const inner = innerRef.current;
    if (!card || !inner) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // การ์ดเอียงเล็กน้อย
    card.style.setProperty("--px", x.toFixed(3));
    card.style.setProperty("--py", y.toFixed(3));
    card.style.setProperty("--rx", `${(-y * 6).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${(x * 6).toFixed(2)}deg`);
  };

  const handleCardLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--px", "0");
    card.style.setProperty("--py", "0");
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  };

  // ปิดด้วย Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ล็อก scroll ตอนเปิด
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = () => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 380);
  };

  if (!open) return null;

  return (
    <div
      className={`about-overlay ${closing ? "about-overlay--closing" : ""}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="เกี่ยวกับผู้จัดทำ"
    >
      <div
        className={`about-card ${closing ? "about-card--closing" : ""}`}
        ref={cardRef}
        onMouseMove={handleCardMove}
        onMouseLeave={handleCardLeave}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated conic border glow */}
        <div className="about-card__border" aria-hidden="true" />
        {/* แสงเรืองหลังการ์ด */}
        <div className="about-card__glow" aria-hidden="true" />
        {/* Particle field — ดาวลอยในการ์ด */}
        <div className="about-particles" aria-hidden="true">
          {PARTICLES.map((p) => (
            <span
              key={p.id}
              className="about-particle"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                "--p-depth": p.depth,
              }}
            />
          ))}
        </div>

        {/* เนื้อหาด้านใน (parallax layer) */}
        <div className="about-card__inner" ref={innerRef}>
          {/* ปุ่มปิด */}
          <button
            type="button"
            className="about-close"
            onClick={handleClose}
            aria-label="ปิด"
          >
            <FaXmark />
          </button>

          {/* รูปโปรไฟล์ */}
          <div className="about-avatar" data-depth="0.9">
            <div className="about-avatar__pulse" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PROFILE.image}
              alt={PROFILE.name}
              className="about-avatar__img"
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml;utf8," +
                  encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="100%" height="100%" fill="#1f2937"/><circle cx="80" cy="60" r="28" fill="#48C78E" opacity="0.6"/><path d="M30 150 Q80 100 130 150 Z" fill="#48C78E" opacity="0.6"/></svg>'
                  );
              }}
            />
          </div>

          {/* ชื่อ + ตำแหน่ง */}
          <h3 className="about-name about-shine">{PROFILE.name}</h3>
          <p className="about-role">{PROFILE.role}</p>
          <p className="about-tagline">{PROFILE.tagline}</p>

          {/* เส้นแบ่ง */}
          <div className="about-divider" />

          {/* ปุ่ม social */}
          <div className="about-socials">
            {PROFILE.socials.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="about-social"
                style={{ "--social-color": s.color }}
              >
                {/* shimmer sweep layer */}
                <span className="about-social__shimmer" aria-hidden="true" />
                <span className="about-social__icon">{s.icon}</span>
                <span className="about-social__text">
                  <span className="about-social__label">{s.label}</span>
                  <span className="about-social__handle">{s.handle}</span>
                </span>
              </a>
            ))}
          </div>

          <p className="about-footer">ขอบคุณที่ใช้ระบบ 💚</p>
        </div>
      </div>
    </div>
  );
};

export default AboutContactModal;
