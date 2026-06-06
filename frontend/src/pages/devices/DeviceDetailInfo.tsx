import { useEffect, useState } from "react";
import { api, type Device, type TelemetryRow } from "../../api";

export function DeviceDetailInfo({ device }: { device: Device }) {
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([]);

  useEffect(() => {
    api.telemetry(device.serialNumber).then(setTelemetry).catch(console.error);
  }, [device.serialNumber]);

  const stats = [
    ["Serial", device.serialNumber],
    ["Trạng thái", device.state?.isOffline === false ? "Online" : "Offline"],
    ["Firmware", device.lastFirmwareVersion ?? "—"],
    ["Địa chỉ IP", device.ipAddress ? (
      <a href={`http://${device.ipAddress}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
        {device.ipAddress}
      </a>
    ) : "—"],
    ["Điện áp", device.state?.lastVoltage ? `${device.state.lastVoltage.toFixed(1)} V` : "— V"],
    ["Dòng điện", device.state?.lastCurrent ? `${device.state.lastCurrent.toFixed(3)} A` : "— A"],
    ["Công suất", device.state?.lastPower ? `${device.state.lastPower.toFixed(0)} W` : "— W"],
  ];

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
        {stats.map(([k, v]) => (
          <div key={k as string} className="card" style={{ padding: "12px 16px" }}>
            <div style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{k as string}</div>
            <div style={{ fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Dữ liệu Telemetry gần đây</div>
      <div style={{ maxHeight: 240, overflowY: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Điện áp</th>
              <th>Dòng điện</th>
              <th>Công suất</th>
              <th>Điện năng</th>
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
    </>
  );
}
