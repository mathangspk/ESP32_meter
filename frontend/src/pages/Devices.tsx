import { useEffect, useState } from "react";
import { api, type Device, type TelemetryRow } from "../api";

function DeviceDetail({ device, onClose }: { device: Device; onClose: () => void }) {
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([]);

  useEffect(() => {
    api.telemetry(device.serialNumber).then(setTelemetry).catch(console.error);
  }, [device.serialNumber]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 640 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="modal-title" style={{ margin: 0 }}>{device.displayName ?? device.serialNumber}</div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            ["Serial", device.serialNumber],
            ["Status", device.state?.isOffline === false ? "Online" : "Offline"],
            ["Firmware", device.lastFirmwareVersion ?? "—"],
            ["Voltage", device.state?.lastVoltage?.toFixed(1) + " V"],
            ["Current", device.state?.lastCurrent?.toFixed(3) + " A"],
            ["Power", device.state?.lastPower?.toFixed(0) + " W"],
          ].map(([k, v]) => (
            <div key={k} className="card" style={{ padding: "12px 16px" }}>
              <div style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{k}</div>
              <div style={{ fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Recent Telemetry</div>
        <div style={{ maxHeight: 240, overflowY: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Voltage</th>
                <th>Current</th>
                <th>Power</th>
                <th>Energy</th>
              </tr>
            </thead>
            <tbody>
              {telemetry.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(row.timestamp).toLocaleString()}</td>
                  <td>{row.voltage?.toFixed(1)} V</td>
                  <td>{row.current?.toFixed(3)} A</td>
                  <td>{row.power?.toFixed(0)} W</td>
                  <td>{row.energy?.toFixed(3)} kWh</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selected, setSelected] = useState<Device | null>(null);

  useEffect(() => {
    api.devices().then(setDevices).catch(console.error);
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Devices</h1>
        <span style={{ color: "var(--muted)", fontSize: 13 }}>{devices.length} device{devices.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Serial</th>
              <th>Status</th>
              <th>Firmware</th>
              <th>Voltage</th>
              <th>Power</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
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
                <td style={{ color: "var(--muted)" }}>{d.lastFirmwareVersion ?? "—"}</td>
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

      {selected && <DeviceDetail device={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
