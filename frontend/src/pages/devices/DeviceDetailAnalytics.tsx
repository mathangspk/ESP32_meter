import { useEffect, useState } from "react";
import { api, type Device, type PeakDaySummary, type HourlyBreakdown } from "../../api";
import { DailyEnergyChart, HourlyPowerChart } from "./DeviceDetailAnalyticsCharts";

export function DeviceDetailAnalytics({ device }: { device: Device }) {
  const getTodayStr = () => new Date().toISOString().slice(0, 10);
  const getPastDateStr = (days: number) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);

  const [rangeType, setRangeType] = useState<"last_7_days" | "this_month" | "last_month" | "custom">("last_7_days");
  const [customStart, setCustomStart] = useState(getPastDateStr(7));
  const [customEnd, setCustomEnd] = useState(getTodayStr());
  const [hourlyDate, setHourlyDate] = useState(getTodayStr());
  
  const [peakDay, setPeakDay] = useState<PeakDaySummary | null>(null);
  const [hourly, setHourly] = useState<HourlyBreakdown | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingHourly, setLoadingHourly] = useState(false);

  const fetchDaily = (type: string, start?: string, end?: string) => {
    setLoadingDaily(true);
    const opts = type === "custom" ? { startDate: start, endDate: end } : { preset: type };
    api.peakDay(device.serialNumber, opts)
      .then(setPeakDay)
      .catch(console.error)
      .finally(() => setLoadingDaily(false));
  };

  const fetchHourly = (dateStr: string) => {
    setLoadingHourly(true);
    const dateVal = dateStr === getTodayStr() ? "today" : dateStr;
    api.hourly(device.serialNumber, dateVal)
      .then(setHourly)
      .catch(console.error)
      .finally(() => setLoadingHourly(false));
  };

  useEffect(() => {
    fetchDaily(rangeType, customStart, customEnd);
  }, [device.serialNumber, rangeType]);

  useEffect(() => {
    fetchHourly(hourlyDate);
  }, [device.serialNumber, hourlyDate]);

  const dateLabel = hourlyDate === getTodayStr() ? "hôm nay" : hourlyDate;

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
            <button className="btn-primary" style={{ alignSelf: "flex-end", padding: "7px 16px", borderRadius: 6, fontSize: 13, border: "none", cursor: "pointer" }} onClick={() => fetchDaily("custom", customStart, customEnd)} disabled={loadingDaily}>Xem</button>
          </>
        )}
      </div>

      {loadingDaily ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Đang tải dữ liệu ngày...</div> : peakDay && (
        <DailyEnergyChart peakDay={peakDay} rangeType={rangeType} customStart={customStart} customEnd={customEnd} />
      )}

      <hr style={{ border: "0", borderTop: "1px solid var(--border)", margin: "24px 0" }} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 20, padding: 12, background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--border)", borderRadius: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Chọn ngày phân tích theo giờ</span>
          <input type="date" value={hourlyDate} onChange={(e) => setHourlyDate(e.target.value)} style={{ padding: "5px 10px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", outline: "none" }} />
        </div>
      </div>

      {loadingHourly ? <div style={{ color: "var(--muted)", textAlign: "center", padding: 24 }}>Đang tải dữ liệu giờ...</div> : hourly && (
        <HourlyPowerChart hourly={hourly} dateLabel={dateLabel} />
      )}
    </>
  );
}
