import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Device, type Stats } from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.stats().then(setStats).catch(console.error);
    api.devices().then(setDevices).catch(console.error);
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--accent)" }}>{stats?.totalDevices ?? "—"}</div>
          <div className="stat-label">Total Devices</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: "var(--success)" }}>{stats?.onlineDevices ?? "—"}</div>
          <div className="stat-label">Online Now</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalUsers ?? "—"}</div>
          <div className="stat-label">Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.totalTenants ?? "—"}</div>
          <div className="stat-label">Tenants</div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Devices</div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Serial</th>
              <th>Status</th>
              <th>Voltage</th>
              <th>Power</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.deviceId} style={{ cursor: "pointer" }} onClick={() => navigate("/devices")}>
                <td style={{ fontWeight: 500 }}>{d.displayName ?? d.serialNumber}</td>
                <td style={{ color: "var(--muted)", fontFamily: "monospace" }}>{d.serialNumber}</td>
                <td>
                  {d.state?.isOffline === false ? (
                    <span className="badge badge-green">● Online</span>
                  ) : (
                    <span className="badge badge-red">● Offline</span>
                  )}
                </td>
                <td>{d.state?.lastVoltage?.toFixed(1) ?? "—"} V</td>
                <td>{d.state?.lastPower?.toFixed(0) ?? "—"} W</td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>
                  {d.state?.lastSeenAt ? new Date(d.state.lastSeenAt).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
