import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { type PeakDaySummary, type HourlyBreakdown } from "../../api";

export function DailyEnergyChart({ peakDay, rangeType, customStart, customEnd }: {
  peakDay: PeakDaySummary;
  rangeType: string;
  customStart: string;
  customEnd: string;
}) {
  const hasData = peakDay.dailyBreakdown.some(d => d.energyKwh !== undefined);
  const chartData = peakDay.dailyBreakdown.map(d => ({
    date: d.date.slice(5),
    kWh: +(d.energyKwh?.toFixed(3) ?? 0),
  }));

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
        {rangeType === "custom" 
          ? `Điện năng tiêu thụ — Từ ${customStart} đến ${customEnd} (kWh)` 
          : `Điện năng tiêu thụ — ${rangeType === "last_7_days" ? "7 ngày gần đây" : rangeType === "this_month" ? "Tháng này" : "Tháng trước"} (kWh)`}
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} unit=" kWh" width={60} />
            <Tooltip formatter={(v: number) => [`${v} kWh`, "Điện năng"]} />
            <Bar dataKey="kWh" fill="var(--accent)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ color: "var(--muted)", fontSize: 13, padding: "24px 0", textAlign: "center", border: "1px dashed var(--border)", borderRadius: 6 }}>
          Không đủ dữ liệu ({peakDay.dataStatus})
        </div>
      )}
    </div>
  );
}

export function HourlyPowerChart({ hourly, dateLabel }: {
  hourly: HourlyBreakdown;
  dateLabel: string;
}) {
  const chartData = hourly.hours.map(h => ({
    hour: `${h.localHour === 24 || h.localHour === 0 ? "00" : String(h.localHour).padStart(2, "0")}:00`,
    W: Math.round(h.avgPower),
  }));

  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
        Công suất theo giờ — {dateLabel} (W trung bình)
        {hourly.totalEnergyKwh !== undefined && (
          <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 8 }}>
            Tổng: {hourly.totalEnergyKwh.toFixed(3)} kWh
          </span>
        )}
      </div>
      {hourly.hours.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: 13, padding: "12px 0" }}>
          Không có dữ liệu cho ngày này.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--muted)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} unit=" W" width={52} />
            <Tooltip formatter={(v: number) => [`${v} W`, "Công suất"]} />
            <Line type="monotone" dataKey="W" stroke="var(--success)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
