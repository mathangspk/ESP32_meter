import { Collection } from "mongodb";
import {
  getLocalDayBounds,
  addLocalDays,
  getTimeZoneParts,
  zonedDateTimeToUtc,
} from "./analytics";
import { DeviceListRecord, DeviceHourlyBreakdown, TelemetryHourlyRecord, TelemetryRecord } from "./types";
import { rollupTelemetryForDevice } from "./telemetry.rollup";

export async function getHourlyBreakdown(
  ctx: { telemetry: Collection<TelemetryRecord>; telemetryHourly: Collection<TelemetryHourlyRecord> },
  device: DeviceListRecord,
  timezone: string,
  date: string,
): Promise<DeviceHourlyBreakdown | null> {
  const now = new Date();
  let dayStart: Date;
  let dayEnd: Date;
  let resolvedDate: string;

  if (date === "today") {
    const bounds = getLocalDayBounds(now, timezone);
    dayStart = bounds.dayStart;
    dayEnd = bounds.dayEnd;
    const parts = getTimeZoneParts(now, timezone);
    resolvedDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  } else if (date === "yesterday") {
    const { dayStart: todayStart } = getLocalDayBounds(now, timezone);
    dayStart = addLocalDays(todayStart, timezone, -1);
    dayEnd = todayStart;
    const parts = getTimeZoneParts(dayStart, timezone);
    resolvedDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
  } else {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error("date must be YYYY-MM-DD, today, or yesterday");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    dayStart = zonedDateTimeToUtc({ year, month, day }, timezone);
    dayEnd = addLocalDays(dayStart, timezone, 1);
    resolvedDate = date;
  }

  const rollupEnd = new Date(Math.min(dayEnd.getTime(), Date.now()));
  if (dayStart < rollupEnd) {
    await rollupTelemetryForDevice(ctx, device.serialNumber, device.deviceId, dayStart, rollupEnd);
  }

  const hourlyRows = await ctx.telemetryHourly
    .find({ serialNumber: device.serialNumber, hourStart: { $gte: dayStart, $lt: dayEnd } })
    .sort({ hourStart: 1 })
    .toArray();

  const hours = hourlyRows.map((row) => ({
    hourStart: row.hourStart,
    localHour: getTimeZoneParts(row.hourStart, timezone).hour,
    energyKwh: row.energyKwh,
    avgPower: row.avgPower,
    maxPower: row.maxPower,
    sampleCount: row.sampleCount,
    counterReset: row.counterReset,
  }));

  const hasCounterReset = hours.some((h) => h.counterReset);
  let totalEnergyKwh: number | undefined;
  if (!hasCounterReset) {
    const sum = hours.reduce((acc, h) => acc + (h.energyKwh ?? 0), 0);
    totalEnergyKwh = Number(sum.toFixed(3));
  }

  return {
    serialNumber: device.serialNumber,
    deviceId: device.deviceId,
    displayName: device.displayName,
    tenantId: device.tenantId,
    siteId: device.siteId,
    siteTimezone: timezone,
    date: resolvedDate,
    dayStart,
    dayEnd,
    hours,
    totalEnergyKwh,
    dataStatus: hours.length === 0 ? "no_data" : hasCounterReset ? "partial_data" : "ok",
    messages: [],
  };
}
