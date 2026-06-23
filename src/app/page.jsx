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
          {[...Array(4)].map((_, i) => (
            <div key={i} className="particle"></div>
          ))}
        </div>

        <div className="login-container">
          <LoginCard>
            {/* Left Side: Brand & Info — Server-rendered for fast FCP */}
            <div className="card-left">
              <div className="card-left__content">
                <div className="org-banner">
                  <span className="org-banner__title">กองสาธารณสุข</span>
                  <span className="org-banner__divider" />
                  <span className="org-banner__subtitle">Division of Public Health</span>
                </div>
                <span className="org-banner__system-name">ระบบจัดการใบอนุญาต</span>
                <div className="hero-section text-content">
                  <p className="hero__description">
                    ยกระดับการจัดการร้านค้าของคุณด้วยระบบที่ใช้งานง่าย ออกแบบมาเพื่อ
                    ความเรียบง่าย ปลอดภัย และรวดเร็ว
                    ให้การจัดการใบอนุญาตเป็นเรื่องง่ายในทุกวัน
                  </p>
                </div>
                <div className="features">
                  <div className="features__label">คุณสมบัติเด่น</div>
                  <div className="features__list">
                    <FeatureTag color="green" icon="check" text="จัดการร้านค้า" />
                    <FeatureTag color="teal" icon="check" text="บันทึกใบอนุญาต" />
                    <FeatureTag color="cyan" icon="check" text="แจ้งเตือนหมดอายุ" />
                    <FeatureTag color="emerald" icon="check" text="Export CSV/PDF" />
                  </div>
                </div>
              </div>
            </div>
          </LoginCard>
        </div>
    </main>
  );
}
