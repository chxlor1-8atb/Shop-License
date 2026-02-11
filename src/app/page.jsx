import Image from "next/image";
import { FeatureTag } from "@/components/login/FeatureTag";
import LoginCard from "@/components/login/LoginCard";
import "../styles/login-base.css";
import "../styles/login-responsive.css";
import "../styles/login-slide.css";

export default function LoginPage() {
  return (
    <main className="login-body">
        <div className="bg-shapes" />
        <div className="particles">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="particle"></div>
          ))}
        </div>

        <div className="login-container">
          <LoginCard>
            {/* Left Side: Brand & Info — Server-rendered for fast FCP */}
            <div className="card-left">
              <div className="card-left__content">
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
                <div className="features">
                  <div className="features__label">คุณสมบัติเด่น</div>
                  <div className="features__list">
                    <FeatureTag color="purple" icon="check" text="จัดการร้านค้า" />
                    <FeatureTag color="blue" icon="check" text="บันทึกใบอนุญาต" />
                    <FeatureTag color="green" icon="check" text="แจ้งเตือนหมดอายุ" />
                    <FeatureTag color="orange" icon="check" text="Export CSV/PDF" />
                  </div>
                </div>
              </div>
            </div>
          </LoginCard>
        </div>
    </main>
  );
}
