import {
  AnalyticsIntent,
  AnalyticsSummary,
  EnergyAnalyticsSummary,
  PeakDaySummary,
  HourlyBreakdown,
} from "./groq.types";
import { formatTimeRange, formatDateRangeLabel } from "./groq.helpers";

export function buildAnalyticsFacts(
  intent: AnalyticsIntent["intent"],
  summary: AnalyticsSummary | EnergyAnalyticsSummary | PeakDaySummary | HourlyBreakdown
): string {
  const label = summary.displayName ?? summary.serialNumber;
  switch (intent) {
    case "get_today_energy":
    case "get_yesterday_energy":
    case "get_this_week_energy":
    case "get_this_month_energy":
    case "get_last_7_days_energy":
    case "get_last_week_energy":
    case "get_last_month_energy":
    case "get_date_range_energy": {
      const energySummary = summary as EnergyAnalyticsSummary;
      const labelRange = formatDateRangeLabel(energySummary);
      if (energySummary.energyKwh === undefined) {
        return `${label}: chua du du lieu tin cay de tinh dien nang cho ${labelRange}. Mui gio ${energySummary.siteTimezone}.`;
      }

      const withAverage =
        energySummary.preset === "last_7_days" ||
        energySummary.preset === "last_week" ||
        energySummary.preset === "last_month" ||
        (!energySummary.preset && energySummary.averageDailyKwh !== undefined);

      return withAverage && energySummary.averageDailyKwh !== undefined
        ? `${label}: ${labelRange} da dung ${energySummary.energyKwh.toFixed(3)} kWh, trung binh ${energySummary.averageDailyKwh.toFixed(3)} kWh/ngay. Mui gio ${energySummary.siteTimezone}.`
        : `${label}: ${labelRange} da dung ${energySummary.energyKwh.toFixed(3)} kWh. Mui gio ${energySummary.siteTimezone}.`;
    }
    case "get_peak_hour": {
      const analyticsSummary = summary as AnalyticsSummary;
      if (!analyticsSummary.peakHourStart || !analyticsSummary.peakHourEnd || analyticsSummary.peakHourAveragePower === undefined) {
        return `${label}: chưa đủ dữ liệu để xác định khung giờ có công suất trung bình cao nhất hôm nay theo múi giờ ${analyticsSummary.siteTimezone}. ${analyticsSummary.messages.join(" ")}`.trim();
      }
      return `${label}: hôm nay khung giờ có công suất trung bình cao nhất là ${formatTimeRange(analyticsSummary.peakHourStart, analyticsSummary.peakHourEnd, analyticsSummary.siteTimezone)} theo múi giờ ${analyticsSummary.siteTimezone}, với công suất trung bình ${analyticsSummary.peakHourAveragePower.toFixed(1)} W.`;
    }
    case "get_current_voltage": {
      const analyticsSummary = summary as AnalyticsSummary;
      return `${label}: điện áp hiện tại là ${analyticsSummary.currentVoltage?.toFixed(1) ?? "không rõ"} V.`;
    }
    case "get_current_current": {
      const analyticsSummary = summary as AnalyticsSummary;
      return `${label}: dòng điện hiện tại là ${analyticsSummary.currentCurrent?.toFixed(3) ?? "không rõ"} A.`;
    }
    case "get_current_power": {
      const analyticsSummary = summary as AnalyticsSummary;
      return `${label}: công suất hiện tại là ${analyticsSummary.currentPower?.toFixed(1) ?? "không rõ"} W.`;
    }
    case "get_current_summary": {
      const analyticsSummary = summary as AnalyticsSummary;
      return `${label}: điện áp hiện tại là ${analyticsSummary.currentVoltage?.toFixed(1) ?? "không rõ"} V, dòng điện hiện tại là ${analyticsSummary.currentCurrent?.toFixed(3) ?? "không rõ"} A và công suất hiện tại là ${analyticsSummary.currentPower?.toFixed(1) ?? "không rõ"} W.`;
    }
    case "get_peak_day": {
      const s = summary as PeakDaySummary;
      if (!s.peakDate || s.peakDayEnergyKwh === undefined) {
        return `${label}: chua du du lieu de xac dinh ngay dung nhieu nhat trong 7 ngay qua. Mui gio ${s.siteTimezone}.`;
      }
      const [y, m, d] = s.peakDate.split("-");
      return `${label}: trong 7 ngay qua, ngay dung dien nhieu nhat la ${d}/${m}/${y} voi ${s.peakDayEnergyKwh.toFixed(3)} kWh. Mui gio ${s.siteTimezone}.`;
    }
    case "get_hourly_breakdown": {
      const s = summary as HourlyBreakdown;
      if (s.dataStatus === "no_data" || s.hours.length === 0) {
        return `${label}: khong co du lieu theo gio cho ngay ${s.date}. Mui gio ${s.siteTimezone}.`;
      }
      const lines = s.hours
        .filter((h) => !h.counterReset)
        .map((h) => `${String(h.localHour).padStart(2, "0")}:00: ${h.energyKwh !== undefined ? h.energyKwh.toFixed(3) + " kWh" : "N/A"}, ${h.avgPower.toFixed(1)} W`);
      const total = s.totalEnergyKwh !== undefined ? `Tong: ${s.totalEnergyKwh.toFixed(3)} kWh` : "";
      return [`${label} - bang dien theo gio ngay ${s.date} (${s.siteTimezone}):`, ...lines, total].filter(Boolean).join("\n");
    }
    default:
      return `${label}: ${summary.messages.join(" ")}`.trim();
  }
}

export async function renderAnalyticsAnswer(
  question: string,
  intent: AnalyticsIntent["intent"],
  summary: unknown
): Promise<string | null> {
  return buildAnalyticsFacts(intent, summary as AnalyticsSummary | EnergyAnalyticsSummary | PeakDaySummary | HourlyBreakdown);
}
