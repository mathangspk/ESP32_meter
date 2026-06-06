import { backendClient, DevicePeakDaySummary, DeviceHourlyBreakdown } from "../backend-client";

export function formatAnalyticsFallback(summary: Awaited<ReturnType<typeof backendClient.getDeviceAnalyticsSummary>>): string {
  const label = summary.displayName ?? summary.serialNumber;
  const parts = [
    `${label} dang dung mui gio ${summary.siteTimezone}.`,
    summary.currentVoltage !== undefined ? `Dien ap hien tai khoang ${summary.currentVoltage.toFixed(1)} V.` : undefined,
    summary.currentPower !== undefined ? `Cong suat hien tai khoang ${summary.currentPower.toFixed(1)} W.` : undefined,
    summary.todayEnergyKwh !== undefined ? `Hom nay da dung khoang ${summary.todayEnergyKwh.toFixed(3)} kWh.` : undefined,
    summary.peakHourStart && summary.peakHourEnd && summary.peakHourAveragePower !== undefined
      ? `Khung gio dung dien nhieu nhat hom nay la ${new Date(summary.peakHourStart).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: summary.siteTimezone })}-${new Date(summary.peakHourEnd).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: summary.siteTimezone })}, cong suat trung binh khoang ${summary.peakHourAveragePower.toFixed(1)} W.`
      : undefined,
    ...summary.messages,
  ];
  return parts.filter(Boolean).join(" ");
}

export function formatEnergyAnalyticsFallback(summary: Awaited<ReturnType<typeof backendClient.getDeviceEnergyAnalytics>>): string {
  const label = summary.displayName ?? summary.serialNumber;
  const labelRange = summary.requestedStartDate && summary.requestedEndDate
    ? `Tu ${summary.requestedStartDate} den ${summary.requestedEndDate}`
    : summary.preset === "today" ? "Hom nay tu 00:00 den hien tai"
    : summary.preset === "yesterday" ? "Hom qua"
    : summary.preset === "last_7_days" ? "7 ngay qua"
    : summary.preset === "this_week" ? "Tuan nay"
    : summary.preset === "last_week" ? "Tuan truoc"
    : summary.preset === "this_month" ? "Thang nay"
    : summary.preset === "last_month" ? "Thang truoc"
    : "Khoang da chon";

  if (summary.energyKwh === undefined) {
    return `${label}: chua du du lieu tin cay de tinh dien nang cho ${labelRange.toLowerCase()}. Mui gio ${summary.siteTimezone}.`;
  }

  const withAverage = ["last_7_days", "last_week", "last_month"].includes(summary.preset ?? "") || (!summary.preset && summary.averageDailyKwh !== undefined);
  return withAverage && summary.averageDailyKwh !== undefined
    ? `${label}: ${labelRange.toLowerCase()} da dung ${summary.energyKwh.toFixed(3)} kWh, trung binh ${summary.averageDailyKwh.toFixed(3)} kWh/ngay. Mui gio ${summary.siteTimezone}.`
    : `${label}: ${labelRange.toLowerCase()} da dung ${summary.energyKwh.toFixed(3)} kWh. Mui gio ${summary.siteTimezone}.`;
}

export function formatPeakDayFallback(summary: DevicePeakDaySummary): string {
  const label = summary.displayName ?? summary.serialNumber;
  if (!summary.peakDate || summary.peakDayEnergyKwh === undefined) {
    return `${label}: chua du du lieu de xac dinh ngay dung nhieu nhat trong 7 ngay qua. Mui gio ${summary.siteTimezone}.`;
  }
  const [y, m, d] = summary.peakDate.split("-");
  return `${label}: trong 7 ngay qua, ngay dung dien nhieu nhat la ${d}/${m}/${y} voi ${summary.peakDayEnergyKwh.toFixed(3)} kWh. Mui gio ${summary.siteTimezone}.`;
}

export function formatHourlyBreakdownFallback(summary: DeviceHourlyBreakdown): string {
  const label = summary.displayName ?? summary.serialNumber;
  if (summary.dataStatus === "no_data" || summary.hours.length === 0) {
    return `${label}: khong co du lieu theo gio cho ngay ${summary.date}. Mui gio ${summary.siteTimezone}.`;
  }
  const lines = summary.hours
    .filter((h) => !h.counterReset)
    .map((h) => `${String(h.localHour).padStart(2, "0")}:00: ${h.energyKwh !== undefined ? h.energyKwh.toFixed(3) + " kWh" : "N/A"}, ${h.avgPower.toFixed(1)} W`);
  const total = summary.totalEnergyKwh !== undefined ? `Tong: ${summary.totalEnergyKwh.toFixed(3)} kWh` : "";
  return [`${label} - bang dien theo gio ngay ${summary.date} (${summary.siteTimezone}):`, ...lines, total]
    .filter(Boolean)
    .join("\n");
}
