"use client";

import React, { useRef, useCallback } from "react";
import Image from "next/image";
import { FeatureTag } from "@/components/login/FeatureTag";
import { LoginForm } from "@/components/login/LoginForm";
import "../styles/login-base.css";
import "../styles/login-responsive.css";
import "../styles/login-slide.css";

// Checking Auth State Hook usage to prevent flash if needed?
// useAuthLogin handles checkingAuth but LoginForm is where it lives.
// If checkAuth is true (checking), we might want to show a loader instead of the form.
// But useAuthLogin is inside LoginForm.
// So LoginForm could return null or a loader if checkingAuth is true.

// Let's rely on LoginForm to handle that if implemented there,
// for now Page just structures the layout.

export default function LoginPage() {
  const cardRef = useRef(null);

  const handleLoginSuccess = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.classList.add("success-exit");
    }
  }, []);

  return (
    <main className="login-body">
        <BackgroundShapes />
        <Particles />

        <div className="login-container">
          <div className="login-card" ref={cardRef}>
            {/* Left Side: Brand & Info */}
            <div className="card-left">
              <div className="card-left__content">
                <BrandHeader />
                <HeroSection />
                <FeaturesList />
              </div>
            </div>

            {/* Right Side: Login Form */}
            <div className="card-right">
              <LoginForm onSuccess={handleLoginSuccess} />
            </div>
          </div>
        </div>
    </main>
  );
}

// Sub-components

const BackgroundShapes = () => (
  <div className="bg-shapes" suppressHydrationWarning />
);

const Particles = () => (
  <div className="particles">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="particle"></div>
    ))}
  </div>
);

const BrandHeader = () => (
  <div className="brand">
    <div className="brand__logo">
      <Image
        src="/image/shop-logo.png"
        alt="Shop License"
        width={52}
        height={52}
        className="brand__logo-img"
        priority
      />
    </div>
    <span className="brand__name">Shop License</span>
  </div>
);

const HeroSection = () => (
  <div className="hero-section text-content">
    <h1 className="hero__title">
      ระบบจัดการ
      <br />
      <span className="hero__title--highlight">ใบอนุญาตร้านค้า</span>
    </h1>
    <p className="hero__description">
      ยกระดับการจัดการร้านค้าของคุณด้วยระบบที่ใช้งานง่าย ออกแบบมาเพื่อ
      ความเรียบง่าย ปลอดภัย และรวดเร็ว
      ให้การจัดการใบอนุญาตเป็นเรื่องง่ายในทุกวัน
    </p>
  </div>
);

const FeaturesList = () => (
  <div className="features">
    <div className="features__label">คุณสมบัติเด่น</div>
    <div className="features__list">
      <FeatureTag color="purple" icon="check" text="จัดการร้านค้า" />
      <FeatureTag color="blue" icon="check" text="บันทึกใบอนุญาต" />
      <FeatureTag color="green" icon="check" text="แจ้งเตือนหมดอายุ" />
      <FeatureTag color="orange" icon="check" text="Export CSV/PDF" />
    </div>
  </div>
);
