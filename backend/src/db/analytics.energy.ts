import { Collection } from "mongodb";
import { EnergyRangeOptions, TimeRange, buildRangeSegments, resolveEnergyPresetRange, resolveCustomDateRange } from "./analytics";
import { DeviceListRecord, DeviceEnergyAnalyticsSummary, TelemetryRecord, TelemetryHourlyRecord } from "./types";
import { computeEnergyDeltaForSegment } from "./analytics.boundary";

export async function getDeviceEnergyAnalytics(
  ctx: { telemetry: Collection<TelemetryRecord>; telemetryHourly: Collection<TelemetryHourlyRecord> },
  device: DeviceListRecord,
  timezone: string,
  options: EnergyRangeOptions,
): Promise<DeviceEnergyAnalyticsSummary | null> {
  const now = new Date();
  const range = "preset" in options
    ? resolveEnergyPresetRange(options.preset, now, timezone)
    : resolveCustomDateRange(options.startDate, options.endDate, timezone);

  const [sampleCount, computed] = await Promise.all([
    ctx.telemetry.countDocuments({ serialNumber: device.serialNumber, timestamp: { $gte: range.rangeStart, $lt: range.rangeEnd } }),
    computeEnergyForRange(ctx, device.serialNumber, range, timezone),
  ]);

  return {
    serialNumber: device.serialNumber,
    deviceId: device.deviceId,
    displayName: device.displayName,
    tenantId: device.tenantId,
    siteId: device.siteId,
    siteTimezone: timezone,
    rangeStart: range.rangeStart,
    rangeEnd: range.rangeEnd,
    preset: "preset" in options ? options.preset : undefined,
    requestedStartDate: "startDate" in options ? options.startDate : undefined,
    requestedEndDate: "endDate" in options ? options.endDate : undefined,
    dayCount: range.dayCount,
    energyKwh: computed.energyKwh,
    averageDailyKwh: computed.averageDailyKwh,
    sampleCount,
    dataStatus: computed.dataStatus,
    messages: computed.messages,
  };
}

export async function computeEnergyForRange(
  ctx: { telemetry: Collection<TelemetryRecord>; telemetryHourly: Collection<TelemetryHourlyRecord> },
  serialNumber: string,
  range: TimeRange,
  timeZone: string,
) {
  const segments = buildRangeSegments(range.rangeStart, range.rangeEnd, timeZone);
  if (segments.length === 0) {
    return {
      dataStatus: "insufficient_data" as const,
      messages: ["Selected range does not contain any time segment."],
      energyKwh: undefined,
      averageDailyKwh: undefined,
    };
  }

  let total = 0;
  const messages: string[] = [];
  const segmentResults = await Promise.all(
    segments.map((segment) => computeEnergyDeltaForSegment(ctx.telemetry, ctx.telemetryHourly, serialNumber, segment.start, segment.end)),
  );

  for (const [i, result] of segmentResults.entries()) {
    const segment = segments[i];
    if (result.status === "insufficient_data") {
      messages.push(result.message);
      return { dataStatus: "insufficient_data" as const, messages, energyKwh: undefined, averageDailyKwh: undefined };
    }
    if (result.status === "counter_reset_detected") {
      messages.push(result.message);
      return { dataStatus: "counter_reset_detected" as const, messages, energyKwh: undefined, averageDailyKwh: undefined };
    }

    total += result.delta;
    if (result.startMode === "after_fallback" || result.endMode === "after_fallback") {
      messages.push(`Used after-boundary fallback for segment ${segment.start.toISOString()} -> ${segment.end.toISOString()}.`);
    }
    if (result.startMode === "hourly_fallback" || result.endMode === "hourly_fallback") {
      messages.push(`Used hourly aggregate boundary for segment ${segment.start.toISOString()} -> ${segment.end.toISOString()}.`);
    }
  }

  const energyKwh = Number(total.toFixed(3));
  return {
    dataStatus: "ok" as const,
    messages,
    energyKwh,
    averageDailyKwh: Number((energyKwh / range.dayCount).toFixed(3)),
  };
}
