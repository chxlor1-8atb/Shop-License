"use client";

import { useState } from "react";
import { FeatureTag } from "@/components/login/FeatureTag";
import LoginCard from "@/components/login/LoginCard";
import AboutContactModal from "@/components/login/AboutContactModal";
import CursorGlow from "@/components/login/CursorGlow";
import { FaCircleInfo } from "react-icons/fa6";
import "../styles/login-base.css";
import "../styles/login-responsive.css";
import "../styles/login-slide.css";
import "../styles/about-modal.css";
import "../styles/login-fx.css";

export default function LoginPage() {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <main className="login-body">
        {/* แสงวงกลมตามเมาส์ */}
        <CursorGlow />

        <div className="bg-shapes" />
        <div className="particles">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="particle"></div>
          ))}
        </div>

        {/* ปุ่มเกี่ยวกับฉัน — มุมขวาบน */}
        <button
          type="button"
          className="about-trigger fx-rise"
          onClick={() => setAboutOpen(true)}
          aria-label="เกี่ยวกับผู้จัดทำ"
        >
          <FaCircleInfo />
          <span>เกี่ยวกับฉัน</span>
        </button>

        <div className="login-container">
          <LoginCard>
            {/* Left Side: Brand & Info — Server-rendered for fast FCP */}
            <div className="card-left">
              <div className="card-left__content">
                <div className="org-banner fx-rise" style={{ "--fx-delay": "0.05s" }}>
                  <span className="org-banner__title">กองสาธารณสุขและสิ่งแวดล้อม</span>
                  <span className="org-banner__divider" />
                  <span className="org-banner__subtitle">Division of Public Health and Environment</span>
                </div>
                <span className="org-banner__system-name fx-shine">ระบบจัดการใบอนุญาต</span>
                <div className="hero-section text-content">
                  <p className="hero__description fx-rise" style={{ "--fx-delay": "0.2s" }}>
                    ยกระดับการจัดการร้านค้าของคุณด้วยระบบที่ใช้งานง่าย ออกแบบมาเพื่อ
                    ความเรียบง่าย ปลอดภัย และรวดเร็ว
                    ให้การจัดการใบอนุญาตเป็นเรื่องง่ายในทุกวัน
                  </p>
                </div>
                <div className="features">
                  <div className="features__label fx-rise" style={{ "--fx-delay": "0.3s" }}>คุณสมบัติเด่น</div>
                  <div className="features__list">
                    <FeatureTag color="indigo" icon="check" text="จัดการร้านค้า" />
                    <FeatureTag color="violet" icon="check" text="บันทึกใบอนุญาต" />
                    <FeatureTag color="rose" icon="check" text="แจ้งเตือนหมดอายุ" />
                    <FeatureTag color="amber" icon="check" text="Export CSV/PDF" />
                  </div>
                </div>
              </div>
            </div>
          </LoginCard>
        </div>

        {/* Modal เกี่ยวกับฉัน */}
        <AboutContactModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </main>
  );
}
