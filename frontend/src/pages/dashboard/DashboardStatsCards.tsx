import { type Stats } from "../../api";

export function DashboardStatsCards({
  totalCount,
  onlineCount,
  stats,
  totalPower,
  totalCurrent,
  avgVoltage,
  onlineRatio,
}: {
  totalCount: number;
  onlineCount: number;
  stats: Stats | null;
  totalPower: number;
  totalCurrent: number;
  avgVoltage: number;
  onlineRatio: number;
}) {
  const offlineCount = totalCount - onlineCount;

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--accent)" }}>{totalCount}</div>
          <div className="stat-label">Tổng thiết bị (Total Devices)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{onlineCount}</div>
          <div className="stat-label">Đang hoạt động (Online)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalUsers ?? "—"}</div>
          <div className="stat-label">Người dùng (Users)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalTenants ?? "—"}</div>
          <div className="stat-label">Đơn vị (Tenants)</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--success)", animation: "pulse 2s infinite" }}>●</span> Chỉ số Live Fleet (Các thiết bị online)
          </div>
          <div className="live-fleet-grid">
            <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em" }}>Tổng Công Suất</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
                {totalPower.toFixed(0)} <span style={{ fontSize: 12, fontWeight: 500 }}>W</span>
              </div>
            </div>
            <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em" }}>Tổng Dòng Điện</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--success)" }}>
                {totalCurrent.toFixed(3)} <span style={{ fontSize: 12, fontWeight: 500 }}>A</span>
              </div>
            </div>
            <div style={{ padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid var(--border)" }}>
              <div style={{ color: "var(--muted)", fontSize: 10, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.05em" }}>Điện Áp Tb</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
                {avgVoltage.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 500 }}>V</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Phân bố Trạng thái Trực tuyến (Online Ratio)</div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
              <span style={{ color: "var(--success)", fontWeight: 600 }}>Hoạt động: {onlineCount}</span>
              <span style={{ color: "var(--danger)", fontWeight: 600 }}>Ngoại tuyến: {offlineCount}</span>
            </div>
            <div style={{ height: 8, width: "100%", background: "rgba(239, 68, 68, 0.15)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${onlineRatio}%`,
                background: "linear-gradient(90deg, var(--success), #34d399)",
                boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)",
                borderRadius: 4,
                transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
              }} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 12 }}>
            Tỷ lệ phủ sóng: <span style={{ color: "var(--text)", fontWeight: 600 }}>{onlineRatio.toFixed(1)}%</span> thiết bị đang truyền tải dữ liệu ổn định.
          </div>
        </div>
      </div>
    </>
  );
}
