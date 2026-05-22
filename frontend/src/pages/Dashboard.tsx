import { useEffect, useState } from "react";
import { api, type Device, type Stats, type User } from "../api";
import { DeviceDetail } from "./Devices";

export default function Dashboard({ user }: { user?: User }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<Device | null>(null);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  useEffect(() => {
    api.stats().then(setStats).catch(console.error);
    api.devices().then(setDevices).catch(console.error);
  }, []);

  // Live Fleet telemetry aggregate calculations
  const onlineDevices = devices.filter((d) => d.state?.isOffline === false);
  const totalPower = onlineDevices.reduce((sum, d) => sum + (d.state?.lastPower ?? 0), 0);
  const totalCurrent = onlineDevices.reduce((sum, d) => sum + (d.state?.lastCurrent ?? 0), 0);
  const avgVoltage = onlineDevices.length > 0
    ? onlineDevices.reduce((sum, d) => sum + (d.state?.lastVoltage ?? 0), 0) / onlineDevices.length
    : 0;

  const totalCount = devices.length;
  const onlineCount = onlineDevices.length;
  const offlineCount = totalCount - onlineCount;
  const onlineRatio = totalCount > 0 ? (onlineCount / totalCount) * 100 : 0;

  const filteredDevices = devices.filter((d) => {
    const name = (d.displayName ?? "").toLowerCase();
    const serial = (d.serialNumber ?? "").toLowerCase();
    const query = search.toLowerCase();
    const matchesSearch = name.includes(query) || serial.includes(query);

    const isOffline = d.state?.isOffline !== false;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "online" && !isOffline) ||
      (statusFilter === "offline" && isOffline);

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            Tổng quan thời gian thực về thiết bị và chỉ số hoạt động hệ thống
          </span>
        </div>
      </div>

      {/* Primary fleet statistics */}
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

      {/* Advanced Fleet Aggregates Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
        {/* Live Aggregates summary card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--success)", animation: "pulse 2s infinite" }}>●</span> Chỉ số Live Fleet (Các thiết bị online)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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

        {/* Live Ratio & Distribution card */}
        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
            Phân bố Trạng thái Trực tuyến (Online Ratio)
          </div>
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

      {/* Fleet Filter & Search tool */}
      <div className="filters-bar">
        <div className="search-input-wrapper">
          <input
            type="text"
            placeholder="Tìm kiếm nhanh theo tên hoặc số serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ width: "160px" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="online">Chỉ thiết bị Online</option>
            <option value="offline">Chỉ thiết bị Offline</option>
          </select>
        </div>
      </div>

      {/* Fleet table list */}
      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Danh sách Thiết bị giám sát</div>
        <table>
          <thead>
            <tr>
              <th>Tên thiết bị</th>
              <th>Số Serial</th>
              <th>Trạng thái</th>
              <th>Điện áp</th>
              <th>Dòng điện</th>
              <th>Công suất</th>
              <th>Lần cuối thấy</th>
            </tr>
          </thead>
          <tbody>
            {filteredDevices.map((d) => (
              <tr key={d.deviceId} style={{ cursor: "pointer" }} onClick={() => setSelected(d)}>
                <td style={{ fontWeight: 500 }}>{d.displayName ?? d.serialNumber}</td>
                <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>{d.serialNumber}</td>
                <td>
                  {d.state?.isOffline === false ? (
                    <span className="badge badge-green">● Online</span>
                  ) : (
                    <span className="badge badge-red">● Offline</span>
                  )}
                </td>
                <td>{d.state?.lastVoltage ? `${d.state.lastVoltage.toFixed(1)} V` : "— V"}</td>
                <td>{d.state?.lastCurrent ? `${d.state.lastCurrent.toFixed(3)} A` : "— A"}</td>
                <td>{d.state?.lastPower ? `${d.state.lastPower.toFixed(0)} W` : "— W"}</td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>
                  {d.state?.lastSeenAt ? new Date(d.state.lastSeenAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
            {filteredDevices.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>
                  Không tìm thấy thiết bị nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <DeviceDetail device={selected} user={user} onClose={() => setSelected(null)} />}
    </>
  );
}
