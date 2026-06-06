import { useState } from "react";
import { type Device } from "../../api";

export function DashboardDeviceTable({ devices, onSelectDevice }: { devices: Device[]; onSelectDevice: (device: Device) => void }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "offline">("all");

  const filtered = devices.filter((d) => {
    const name = (d.displayName ?? "").toLowerCase();
    const serial = (d.serialNumber ?? "").toLowerCase();
    const q = search.toLowerCase();
    if (!name.includes(q) && !serial.includes(q)) return false;
    const isOff = d.state?.isOffline !== false;
    return statusFilter === "all" || (statusFilter === "online" && !isOff) || (statusFilter === "offline" && isOff);
  });

  return (
    <>
      <div className="filters-bar">
        <div className="search-input-wrapper">
          <input type="text" placeholder="Tìm kiếm nhanh theo tên hoặc số serial..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ width: "160px" }}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="online">Chỉ thiết bị Online</option>
            <option value="offline">Chỉ thiết bị Offline</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Danh sách Thiết bị giám sát</div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Tên thiết bị</th>
                <th>Số Serial</th>
                <th>Địa chỉ IP</th>
                <th>Trạng thái</th>
                <th>Điện áp</th>
                <th>Dòng điện</th>
                <th>Công suất</th>
                <th>Lần cuối thấy</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.deviceId} style={{ cursor: "pointer" }} onClick={() => onSelectDevice(d)}>
                  <td style={{ fontWeight: 500 }}>{d.displayName ?? d.serialNumber}</td>
                  <td style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 12 }}>{d.serialNumber}</td>
                  <td>
                    {d.ipAddress ? (
                      <a href={`http://${d.ipAddress}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: "var(--accent)", textDecoration: "underline" }}>{d.ipAddress}</a>
                    ) : "—"}
                  </td>
                  <td>
                    <span className={`badge badge-${d.state?.isOffline === false ? "green" : "red"}`}>
                      ● {d.state?.isOffline === false ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td>{d.state?.lastVoltage ? `${d.state.lastVoltage.toFixed(1)} V` : "— V"}</td>
                  <td>{d.state?.lastCurrent ? `${d.state.lastCurrent.toFixed(3)} A` : "— A"}</td>
                  <td>{d.state?.lastPower ? `${d.state.lastPower.toFixed(0)} W` : "— W"}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{d.state?.lastSeenAt ? new Date(d.state.lastSeenAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)", padding: 24 }}>Không tìm thấy thiết bị nào phù hợp với bộ lọc hiện tại.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
