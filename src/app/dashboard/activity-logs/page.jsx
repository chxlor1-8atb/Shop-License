"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";
import { showSuccess, showError, confirmDelete } from "@/utils/alerts";
import Pagination from "@/components/ui/Pagination";
import "./activity-logs.css";

const ACTION_LABELS = {
  LOGIN: { label: "เข้าสู่ระบบ", icon: "fa-sign-in-alt", color: "#2196F3" },
  LOGOUT: { label: "ออกจากระบบ", icon: "fa-sign-out-alt", color: "#607D8B" },
  CREATE: { label: "สร้าง", icon: "fa-plus-circle", color: "#4CAF50" },
  UPDATE: { label: "แก้ไข", icon: "fa-edit", color: "#FF9800" },
  DELETE: { label: "ลบ", icon: "fa-trash-alt", color: "#F44336" },
  VIEW: { label: "ดู", icon: "fa-eye", color: "#9C27B0" },
  EXPORT: { label: "ส่งออก", icon: "fa-file-export", color: "#00BCD4" },
};

const ENTITY_LABELS = {
  AUTH: "การเข้าสู่ระบบ",
  USER: "ผู้ใช้",
  SHOP: "ร้านค้า",
  LICENSE: "ใบอนุญาต",
  LICENSE_TYPE: "ประเภทใบอนุญาต",
  CUSTOM_FIELD: "ฟิลด์กำหนดเอง",
  ENTITY: "เอนทิตี้",
};

/**
 * ActivityLogsPage Component
 * Admin-only page - redirects non-admin users
 */
export default function ActivityLogsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState("logs");

  // Stats state
  const [stats, setStats] = useState(null);
  const [recentIPs, setRecentIPs] = useState([]);
  const [actionBreakdown, setActionBreakdown] = useState([]);
  const [entityBreakdown, setEntityBreakdown] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Logs state
  const [activities, setActivities] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });


  const checkAdminAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth?action=check", { credentials: "include" });
      const data = await res.json();

      if (!data.success || data.user?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setIsAuthorized(true);
    } catch (error) {
      console.error("Auth check failed:", error);
      router.push("/dashboard");
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAdminAuth();
  }, [checkAdminAuth]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const response = await fetch("/api/activity-logs?action=stats", { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setRecentIPs(data.recentIPs || []);
        setActionBreakdown(data.actionBreakdown || []);
        setEntityBreakdown(data.entityBreakdown || []);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch activity logs
  const fetchLogs = useCallback(async (page = 1, customLimit = null) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ action: "list", page, limit: customLimit || itemsPerPage });
      const response = await fetch(`/api/activity-logs?${params}`, { credentials: "include" });
      const data = await response.json();
      if (data.success) {
        setActivities(data.activities || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLogsLoading(false);
    }
  }, [itemsPerPage]);

  // Load data when authorized
  useEffect(() => {
    if (isAuthorized) {
      fetchStats();
      fetchLogs(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized]);

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
        fetchLogs(1);
      } else {
        showError(data.message || "เกิดข้อผิดพลาดในการล้างข้อมูล");
      }
    } catch (error) {
      console.error("Failed to clear logs:", error);
      showError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handlePageChange = (page) => {
    fetchLogs(page);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    });
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
    <div className="secure-content">
      {/* Stats Cards */}
      {statsLoading ? (
        <Loading />
      ) : stats ? (
        <div className="al-stats-grid">
          <div className="al-stat-card">
            <div className="al-stat-icon" style={{ background: "#EBF5FB" }}>
              <i className="fas fa-list-alt" style={{ color: "#2196F3" }}></i>
            </div>
            <div className="al-stat-info">
              <div className="al-stat-value">{parseInt(stats.today_activities).toLocaleString()}</div>
              <div className="al-stat-label">กิจกรรมวันนี้</div>
            </div>
          </div>
          <div className="al-stat-card">
            <div className="al-stat-icon" style={{ background: "#E8F5E9" }}>
              <i className="fas fa-calendar-week" style={{ color: "#4CAF50" }}></i>
            </div>
            <div className="al-stat-info">
              <div className="al-stat-value">{parseInt(stats.week_activities).toLocaleString()}</div>
              <div className="al-stat-label">7 วันล่าสุด</div>
            </div>
          </div>
          <div className="al-stat-card">
            <div className="al-stat-icon" style={{ background: "#FFF3E0" }}>
              <i className="fas fa-users" style={{ color: "#FF9800" }}></i>
            </div>
            <div className="al-stat-info">
              <div className="al-stat-value">{parseInt(stats.today_active_users).toLocaleString()}</div>
              <div className="al-stat-label">ผู้ใช้วันนี้</div>
            </div>
          </div>
          <div className="al-stat-card">
            <div className="al-stat-icon" style={{ background: "#F3E5F5" }}>
              <i className="fas fa-sign-in-alt" style={{ color: "#9C27B0" }}></i>
            </div>
            <div className="al-stat-info">
              <div className="al-stat-value">{parseInt(stats.today_logins).toLocaleString()}</div>
              <div className="al-stat-label">ล็อกอินวันนี้</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="al-tabs">
        <button
          className={`al-tab ${activeTab === "logs" ? "al-tab-active" : ""}`}
          onClick={() => setActiveTab("logs")}
        >
          <i className="fas fa-list"></i> รายการกิจกรรม
        </button>
        <button
          className={`al-tab ${activeTab === "breakdown" ? "al-tab-active" : ""}`}
          onClick={() => setActiveTab("breakdown")}
        >
          <i className="fas fa-chart-bar"></i> สรุปภาพรวม
        </button>
        <button
          className={`al-tab ${activeTab === "ips" ? "al-tab-active" : ""}`}
          onClick={() => setActiveTab("ips")}
        >
          <i className="fas fa-globe"></i> IP Address
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "logs" && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <i className="fas fa-history"></i> ประวัติกิจกรรม
              <span className="al-total-badge" style={{ marginLeft: "0.5rem" }}>
                {stats ? `${parseInt(stats.total_activities).toLocaleString()} รายการ` : "..."}
              </span>
            </h3>
            <button className="btn btn-danger btn-sm" onClick={handleClearLogs}>
              <i className="fas fa-trash-alt"></i> ล้างข้อมูล
            </button>
          </div>
          <div className="card-body">
            {/* Activity Table */}
            <div className="activity-table-container">
              {logsLoading ? (
                <div style={{ padding: "2rem" }}>
                  <Loading />
                </div>
              ) : activities.length === 0 ? (
                <div className="al-empty">
                  <i className="fas fa-inbox"></i>
                  <p>ไม่พบข้อมูลกิจกรรม</p>
                </div>
              ) : (
                <table className="al-table">
                  <thead>
                    <tr>
                      <th>เวลา</th>
                      <th>ผู้ใช้</th>
                      <th>การกระทำ</th>
                      <th>ประเภท</th>
                      <th>รายละเอียด</th>
                      <th>IP / อุปกรณ์</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((activity) => {
                      const actionInfo = ACTION_LABELS[activity.action] || {
                        label: activity.action,
                        icon: "fa-circle",
                        color: "#999",
                      };
                      return (
                        <tr key={activity.id}>
                          <td className="activity-date">{formatDateTime(activity.created_at)}</td>
                          <td>
                            <div className="al-user-cell">
                              <span className="al-user-name">{activity.user_name}</span>
                              <span className="al-user-handle">@{activity.username}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="al-action-badge"
                              style={{ background: actionInfo.color + "18", color: actionInfo.color }}
                            >
                              <i className={`fas ${actionInfo.icon}`}></i>
                              {actionInfo.label}
                            </span>
                          </td>
                          <td className="entity-type">
                            {ENTITY_LABELS[activity.entity_type] || activity.entity_type || "-"}
                          </td>
                          <td className="activity-details" title={activity.details || ""}>
                            {activity.details || "-"}
                          </td>
                          <td>
                            <div className="al-device-cell">
                              <span className="ip-address">{activity.ip_address || "-"}</span>
                              {activity.device_info && (
                                <span className="al-device-tag">
                                  <i className={`fas ${activity.device_info.device === "Mobile" ? "fa-mobile-alt" : "fa-desktop"}`}></i>
                                  {activity.device_info.browser}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                fetchLogs(1, val);
              }}
              showItemsPerPage
              showPageJump
              showTotalInfo
            />
          </div>
        </div>
      )}

      {activeTab === "breakdown" && (
        <div className="breakdowns-grid">
          {/* Action Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title mb-0">
                <i className="fas fa-bolt"></i> แยกตามการกระทำ
              </h3>
            </div>
            <div className="card-body">
              {statsLoading ? (
                <Loading />
              ) : actionBreakdown.length === 0 ? (
                <div className="al-empty-sm">ไม่พบข้อมูล</div>
              ) : (
                actionBreakdown.map((item, i) => {
                  const info = ACTION_LABELS[item.action] || { label: item.action, icon: "fa-circle", color: "#999" };
                  return (
                    <div key={i} className="breakdown-row">
                      <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <i className={`fas ${info.icon}`} style={{ color: info.color }}></i>
                        {info.label}
                      </span>
                      <span className="breakdown-count">{parseInt(item.count).toLocaleString()}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Entity Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title mb-0">
                <i className="fas fa-database"></i> แยกตามประเภทข้อมูล
              </h3>
            </div>
            <div className="card-body">
              {statsLoading ? (
                <Loading />
              ) : entityBreakdown.length === 0 ? (
                <div className="al-empty-sm">ไม่พบข้อมูล</div>
              ) : (
                entityBreakdown.map((item, i) => (
                  <div key={i} className="breakdown-row">
                    <span>{ENTITY_LABELS[item.entity_type] || item.entity_type}</span>
                    <span className="breakdown-count">{parseInt(item.count).toLocaleString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ips" && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title mb-0">
              <i className="fas fa-globe"></i> IP ที่เข้าใช้งานบ่อย (7 วัน)
            </h3>
          </div>
          <div className="card-body">
            {statsLoading ? (
              <Loading />
            ) : recentIPs.length === 0 ? (
              <div className="al-empty-sm">ไม่พบข้อมูล</div>
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
      )}
    </div>
  );
}
