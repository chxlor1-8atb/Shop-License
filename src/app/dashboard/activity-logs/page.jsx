"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { showSuccess, showError, confirmDelete } from "@/utils/alerts";
import "./activity-logs.css";

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

  const checkAdminAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth?action=check", { credentials: "include" });
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
  }, [router]);

  // Check admin authorization on mount
  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/activity-logs?action=stats", { credentials: "include" });
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

  const handleClearLogs = async () => {
    const confirmed = await confirmDelete("บันทึกกิจกรรมทั้งหมด");
    if (!confirmed) return;

    try {
      const res = await fetch("/api/activity-logs", {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("ล้างข้อมูลเรียบร้อยแล้ว");
        fetchStats();
      } else {
        showError(data.message || "เกิดข้อผิดพลาดในการล้างข้อมูล");
      }
    } catch (error) {
      console.error("Failed to clear logs:", error);
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
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
        <div className="card-header d-flex justify-content-between align-items-center">
          <h3 className="card-title mb-0">
            <i className="fas fa-globe"></i> IP ที่เข้าใช้งานบ่อย (7 วัน)
          </h3>
          <button 
            className="btn btn-danger btn-sm" 
            onClick={handleClearLogs}
            style={{ fontSize: '14px', padding: '5px 15px' }}
          >
            <i className="fas fa-trash-alt mr-2"></i> ล้างข้อมูล
          </button>
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

