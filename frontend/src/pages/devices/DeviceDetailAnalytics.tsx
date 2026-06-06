import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api, type Device, type PeakDaySummary, type HourlyBreakdown } from "../../api";

export function DeviceDetailAnalytics({ device }: { device: Device }) {
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const getPastDateStr = (days: number) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);

  const [rangeType, setRangeType] = useState<"last_7_days" | "this_month" | "last_month" | "custom">("last_7_days");
  const [customStart, setCustomStart] = useState(getPastDateStr(7));
  const [customEnd, setCustomEnd] = useState(getTodayStr());
  const [peakDay, setPeakDay] = useState<PeakDaySummary | null>(null);
  const [hourly, setHourly] = useState<HourlyBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDaily = (type: string, start?: string, end?: string) => {
    setLoading(true);
    const opts = type === "custom" ? { startDate: start, endDate: end } : { preset: type };
    api.peakDay(device.serialNumber, opts).then(setPeakDay).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.peakDay(device.serialNumber, { preset: "last_7_days" }),
      api.hourly(device.serialNumber, "today"),
    ]).then(([pd, h]) => { setPeakDay(pd); setHourly(h); }).catch(console.error).finally(() => setLoading(false));
  }, [device.serialNumber]);

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 20, padding: 12, background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", borderRadius: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Khoảng thời gian</span>
          <select value={rangeType} onChange={(e) => { const t = e.target.value as any; setRangeType(t); if (t !== "custom") fetchDaily(t); }} style={{ width: 160, padding: "6px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none" }}>
            <option value="last_7_days">7 ngày gần đây</option>
            <option value="this_month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
            <option value="custom">Tùy chọn...</option>
          </select>
        </div>
        {rangeType === "custom" && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Từ ngày</span>
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ padding: "5px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Đến ngày</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ padding: "5px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none" }} />
            </div>
            <button className="btn-primary" style={{ alignSelf: "flex-end", padding: "7px 16px", borderRadius: 6, fontSize: 13, border: "none", cursor: "pointer" }} onClick={() => fetchDaily("custom", customStart, customEnd)} disabled={loading}>Xem</button>
          </>
        )}
      </div>

      {loading && <div style={{ color: "var(--muted)", textAlign: "center", padding: 32 }}>Đang tải dữ liệu…</div>}

      {!loading && peakDay && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
            {rangeType === "custom" ? `Điện năng tiêu thụ — Từ ${customStart} đến ${customEnd} (kWh)` : `Điện năng tiêu thụ — ${rangeType === "last_7_days" ? "7 ngày gần đây" : rangeType === "this_month" ? "Tháng này" : "Tháng trước"} (kWh)`}
          </div>
          {peakDay.dailyBreakdown.some(d => d.energyKwh !== undefined) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={peakDay.dailyBreakdown.map(d => ({ date: d.date.slice(5), kWh: +(d.energyKwh?.toFixed(3) ?? 0) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} unit=" kWh" width={60} />
                <Tooltip formatter={(v: number) => [`${v} kWh`, "Điện năng"]} />
                <Bar dataKey="kWh" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 6 }}>Không đủ dữ liệu ({peakDay.dataStatus})</div>}
        </div>
      )}

      {!loading && hourly && (
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
            Công suất theo giờ — hôm nay (W trung bình)
            {hourly.totalEnergyKwh !== undefined && <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 8 }}>Tổng hôm nay: {hourly.totalEnergyKwh.toFixed(3)} kWh</span>}
          </div>
          {hourly.hours.length === 0 ? <div style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>Không có dữ liệu cho hôm nay.</div> : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={hourly.hours.map(h => ({ hour: `${h.localHour === 24 || h.localHour === 0 ? "00" : String(h.localHour).padStart(2, "0")}:00`, W: Math.round(h.avgPower) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} unit=" W" width={52} />
                <Tooltip formatter={(v: number) => [`${v} W`, "Công suất"]} />
                <Line type="monotone" dataKey="W" stroke="var(--success)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </>
  );
}
