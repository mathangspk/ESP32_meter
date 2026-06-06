import { useEffect, useState } from "react";
import { api, type Device, type User } from "../../api";
import { ClaimDeviceModal } from "./ClaimDeviceModal";
import { DeviceDetailModal } from "./DeviceDetailModal";

export function DevicesPage({ user }: { user?: User }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<Device | null>(null);
  const [showClaim, setShowClaim] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  useEffect(() => { api.devices().then(setDevices).catch(console.error); }, []);

  const filtered = devices.filter((d) => {
    const name = (d.displayName ?? "").toLowerCase(), serial = (d.serialNumber ?? "").toLowerCase(), q = search.toLowerCase();
    if (!name.includes(q) && !serial.includes(q)) return false;
    const isOff = d.state?.isOffline !== false;
    return statusFilter === "all" || (statusFilter === "online" && !isOff) || (statusFilter === "offline" && isOff);
  });

  return (
    <>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Thiết bị</h1>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>Tìm thấy {filtered.length} thiết bị ({devices.length} tổng số)</span>
        </div>
        <button className="btn-primary" onClick={() => setShowClaim(true)}>🔌 Claim Thiết bị</button>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrapper">
          <input type="text" placeholder="Tìm kiếm theo tên hoặc số serial..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ width: "160px" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table>
            <thead>
              <tr><th>Tên thiết bị</th><th>Số Serial</th><th>Địa chỉ IP</th><th>Trạng thái</th><th>Firmware</th><th>Điện áp</th><th>Công suất</th><th>Lần cuối thấy</th></tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.deviceId} style={{ cursor: "pointer" }} onClick={() => setSelected(d)}>
                  <td style={{ fontWeight: 500 }}>{d.displayName ?? d.serialNumber}</td>
                  <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>{d.serialNumber}</td>
                  <td>{d.ipAddress ? <a href={`http://${d.ipAddress}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent)", textDecoration: "underline" }}>{d.ipAddress}</a> : "—"}</td>
                  <td><span className={`badge badge-${d.state?.isOffline === false ? "green" : "red"}`}>● {d.state?.isOffline === false ? "Online" : "Offline"}</span></td>
                  <td style={{ color: "var(--muted)" }}>{d.lastFirmwareVersion ?? "—"}</td>
                  <td>{d.state?.lastVoltage ? `${d.state.lastVoltage.toFixed(1)} V` : "— V"}</td>
                  <td>{d.state?.lastPower ? `${d.state.lastPower.toFixed(0)} W` : "— W"}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{d.state?.lastSeenAt ? new Date(d.state.lastSeenAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <DeviceDetailModal device={selected} user={user} onClose={() => setSelected(null)} onDeviceUpdated={(updated) => {
          setSelected((prev) => prev ? { ...prev, displayName: updated.displayName } : null);
          setDevices((prev) => prev.map((d) => d.deviceId === updated.deviceId ? { ...d, displayName: updated.displayName } : d));
        }} />
      )}

      {showClaim && (
        <ClaimDeviceModal user={user} onClose={() => setShowClaim(false)} onDeviceClaimed={(newDevice) => {
          setDevices((prev) => [newDevice, ...prev]);
          setShowClaim(false);
        }} />
      )}
    </>
  );
}
