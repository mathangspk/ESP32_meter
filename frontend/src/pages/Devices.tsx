import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api, type Device, type TelemetryRow, type PeakDaySummary, type HourlyBreakdown } from "../api";

function DeviceDetail({ device, onClose }: { device: Device; onClose: () => void }) {
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([]);
  const [tab, setTab] = useState<"info" | "analytics">("info");
  const [peakDay, setPeakDay] = useState<PeakDaySummary | null>(null);
  const [hourly, setHourly] = useState<HourlyBreakdown | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    api.telemetry(device.serialNumber).then(setTelemetry).catch(console.error);
  }, [device.serialNumber]);

  const loadAnalytics = () => {
    if (peakDay) return;
    setAnalyticsLoading(true);
    Promise.all([
      api.peakDay(device.serialNumber),
      api.hourly(device.serialNumber, "today"),
    ])
      .then(([pd, h]) => { setPeakDay(pd); setHourly(h); })
      .catch(console.error)
      .finally(() => setAnalyticsLoading(false));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 780 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="modal-title" style={{ margin: 0 }}>{device.displayName ?? device.serialNumber}</div>
          <button className="btn-ghost" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
          {(["info", "analytics"] as const).map((t) => (
            <button
              key={t}
              className="btn-ghost"
              style={{
                fontWeight: tab === t ? 600 : 400,
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                borderRadius: 0,
                paddingBottom: 8,
                color: tab === t ? "var(--accent)" : "var(--muted)",
                textTransform: "capitalize",
              }}
              onClick={() => { setTab(t); if (t === "analytics") loadAnalytics(); }}
            >
              {t === "info" ? "Info" : "Analytics"}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <>
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
          </>
        )}

        {tab === "analytics" && (
          <>
            {analyticsLoading && <div style={{ color: "var(--muted)", textAlign: "center", padding: 32 }}>Loading…</div>}

            {!analyticsLoading && peakDay && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>Energy — last 7 days (kWh)</div>
                {peakDay.dataStatus === "ok" || peakDay.dailyBreakdown.some(d => d.energyKwh !== undefined) ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={peakDay.dailyBreakdown.map(d => ({ date: d.date.slice(5), kWh: +(d.energyKwh?.toFixed(3) ?? 0) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} unit=" kWh" width={60} />
                      <Tooltip formatter={(v: number) => [`${v} kWh`, "Energy"]} />
                      <Bar dataKey="kWh" fill="var(--accent)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>
                    Insufficient data ({peakDay.dataStatus})
                  </div>
                )}
                {peakDay.peakDate && (
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
                    Peak day: {peakDay.peakDate} — {peakDay.peakDayEnergyKwh?.toFixed(3)} kWh
                  </div>
                )}
              </div>
            )}

            {!analyticsLoading && hourly && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
                  Hourly power — today (W avg)
                  {hourly.totalEnergyKwh !== undefined && (
                    <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 8 }}>
                      total {hourly.totalEnergyKwh.toFixed(3)} kWh
                    </span>
                  )}
                </div>
                {hourly.dataStatus === "no_data" || hourly.hours.length === 0 ? (
                  <div style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>No data for today yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={hourly.hours.map(h => ({ hour: `${h.localHour}:00`, W: Math.round(h.avgPower) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--muted)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} unit=" W" width={52} />
                      <Tooltip formatter={(v: number) => [`${v} W`, "Avg power"]} />
                      <Line type="monotone" dataKey="W" stroke="var(--success)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </>
        )}
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
