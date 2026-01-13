"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import "./activity-logs.css";

// Constants
const ACTION_TYPES = [
  { value: "", label: "ทุกประเภท" },
  { value: "LOGIN", label: "เข้าสู่ระบบ" },
  { value: "LOGOUT", label: "ออกจากระบบ" },
  { value: "CREATE", label: "สร้าง" },
  { value: "UPDATE", label: "แก้ไข" },
  { value: "DELETE", label: "ลบ" },
  { value: "EXPORT", label: "ส่งออก" },
  { value: "VIEW", label: "ดู" },
];

const ENTITY_TYPES = [
  { value: "", label: "ทุกหมวด" },
  { value: "การเข้าสู่ระบบ", label: "การเข้าสู่ระบบ" },
  { value: "ผู้ใช้", label: "ผู้ใช้" },
  { value: "ร้านค้า", label: "ร้านค้า" },
  { value: "ใบอนุญาต", label: "ใบอนุญาต" },
  { value: "ประเภทใบอนุญาต", label: "ประเภทใบอนุญาต" },
  { value: "การตั้งค่า", label: "การตั้งค่า" },
];

const ACTION_BADGE_MAP = {
  LOGIN: {
    class: "badge-success",
    icon: "fa-sign-in-alt",
    label: "เข้าสู่ระบบ",
  },
  LOGOUT: {
    class: "badge-secondary",
    icon: "fa-sign-out-alt",
    label: "ออกจากระบบ",
  },
  CREATE: { class: "badge-info", icon: "fa-plus", label: "สร้าง" },
  UPDATE: { class: "badge-warning", icon: "fa-edit", label: "แก้ไข" },
  DELETE: { class: "badge-danger", icon: "fa-trash", label: "ลบ" },
  EXPORT: { class: "badge-primary", icon: "fa-file-export", label: "ส่งออก" },
  VIEW: { class: "badge-light", icon: "fa-eye", label: "ดู" },
};

const DEVICE_ICONS = {
  Desktop: "fa-desktop",
  Mobile: "fa-mobile-alt",
  Tablet: "fa-tablet-alt",
};

/**
 * ActivityLogsPage Component
 * Admin-only page - redirects non-admin users
 */
export default function ActivityLogsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [recentIPs, setRecentIPs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check admin authorization on mount
  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const res = await fetch("/api/auth?action=check");
      const data = await res.json();

      if (!data.success || data.user?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setIsAuthorized(true);
      fetchStats();
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/dashboard");
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/activity-logs?action=stats");
      const data = await response.json();
      if (data.success && data.recentIPs) {
        setRecentIPs(data.recentIPs);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <Loading message="กำลังตรวจสอบสิทธิ์..." />
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="secure-content" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            <i className="fas fa-globe"></i> IP ที่เข้าใช้งานบ่อย (7 วัน)
          </h3>
        </div>
        <div className="card-body">
          {loading ? (
            <Loading />
          ) : recentIPs.length === 0 ? (
            <div className="text-center p-4 text-muted">ไม่พบข้อมูล</div>
          ) : (
            recentIPs.map((ip, i) => (
              <div key={i} className="breakdown-row">
                <span className="ip-address">{ip.ip_address || "-"}</span>
                <span className="breakdown-count">
                  {parseInt(ip.access_count).toLocaleString()} ครั้ง
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

