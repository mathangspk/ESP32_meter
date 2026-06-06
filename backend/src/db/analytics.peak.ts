import { Collection } from "mongodb";
import {
  DEFAULT_SITE_TIMEZONE,
  EnergyRangeOptions,
  buildRangeSegments,
  resolveEnergyPresetRange,
  resolveCustomDateRange,
  getLocalDayBounds,
  addLocalDays,
  getTimeZoneParts,
} from "./analytics";
import { DeviceListRecord, DevicePeakDaySummary, TelemetryRecord, TelemetryHourlyRecord } from "./types";
import { computeEnergyDeltaForSegment } from "./analytics.boundary";

export async function getPeakDayAnalytics(
  ctx: { telemetry: Collection<TelemetryRecord>; telemetryHourly: Collection<TelemetryHourlyRecord> },
  device: DeviceListRecord,
  timezone: string,
  options?: EnergyRangeOptions,
): Promise<DevicePeakDaySummary | null> {
  const now = new Date();
  let rangeStart: Date;
  let rangeEnd: Date;
  let dayCount: number;

  if (options) {
    const range = "preset" in options
      ? resolveEnergyPresetRange(options.preset, now, timezone)
      : resolveCustomDateRange(options.startDate, options.endDate, timezone);
    rangeStart = range.rangeStart;
    rangeEnd = range.rangeEnd;
    dayCount = range.dayCount;
  } else {
    const { dayStart: todayStart, dayEnd: todayEnd } = getLocalDayBounds(now, timezone);
    rangeStart = addLocalDays(todayStart, timezone, -6);
    rangeEnd = todayEnd;
    dayCount = 7;
  }

  if (dayCount > 90) throw new Error("Date range cannot exceed 90 days");

  const segments = buildRangeSegments(rangeStart, rangeEnd, timezone);
  const segmentResults = await Promise.all(
    segments.map((seg) => computeEnergyDeltaForSegment(ctx.telemetry, ctx.telemetryHourly, device.serialNumber, seg.start, seg.end)),
  );

  const messages: string[] = [];
  const dailyBreakdown: DevicePeakDaySummary["dailyBreakdown"] = [];
  let peakDate: string | undefined;
  let peakDayStart: Date | undefined;
  let peakDayEnd: Date | undefined;
  let peakDayEnergyKwh: number | undefined;
  let hasValidDays = false;

  for (const [i, result] of segmentResults.entries()) {
    const seg = segments[i];
    const parts = getTimeZoneParts(seg.start, timezone);
    const dateStr = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

    if (result.status === "ok") {
      hasValidDays = true;
      const energyKwh = Number(result.delta.toFixed(3));
      dailyBreakdown.push({ date: dateStr, energyKwh, dataStatus: "ok" });
      if (peakDayEnergyKwh === undefined || energyKwh > peakDayEnergyKwh) {
        peakDate = dateStr;
        peakDayStart = seg.start;
        peakDayEnd = seg.end;
        peakDayEnergyKwh = energyKwh;
      }
    } else {
      dailyBreakdown.push({ date: dateStr, dataStatus: result.status });
      messages.push(result.message);
    }
  }

  return {
    serialNumber: device.serialNumber,
    deviceId: device.deviceId,
    displayName: device.displayName,
    tenantId: device.tenantId,
    siteId: device.siteId,
    siteTimezone: timezone,
    rangeStart,
    rangeEnd,
    peakDate,
    peakDayStart,
    peakDayEnd,
    peakDayEnergyKwh,
    dailyBreakdown,
    dataStatus: !hasValidDays ? "no_valid_days" : peakDate ? "ok" : "insufficient_data",
    messages,
  };
}
