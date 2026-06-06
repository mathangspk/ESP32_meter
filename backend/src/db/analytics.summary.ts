import { Collection } from "mongodb";
import { DEFAULT_SITE_TIMEZONE, getLocalDayBounds } from "./analytics";
import { DeviceListRecord, DeviceAnalyticsSummary, SiteRecord, TelemetryRecord } from "./types";

export async function getDeviceAnalyticsSummary(
  ctx: { telemetry: Collection<TelemetryRecord>; sites: Collection<SiteRecord> },
  device: DeviceListRecord,
): Promise<DeviceAnalyticsSummary | null> {
  const site = device.siteId ? await ctx.sites.findOne({ siteId: device.siteId }) : null;
  const siteTimezone = site?.timezone || DEFAULT_SITE_TIMEZONE;
  const { dayStart, dayEnd } = getLocalDayBounds(new Date(), siteTimezone);

  const [firstTelemetry, lastTelemetry, peakHourRows, sampleCount] = await Promise.all([
    ctx.telemetry.findOne(
      { serialNumber: device.serialNumber, timestamp: { $gte: dayStart, $lt: dayEnd } },
      { sort: { timestamp: 1 } },
    ),
    ctx.telemetry.findOne(
      { serialNumber: device.serialNumber, timestamp: { $gte: dayStart, $lt: dayEnd } },
      { sort: { timestamp: -1 } },
    ),
    ctx.telemetry
      .aggregate<{ hourStart: Date; averagePower: number }>([
        { $match: { serialNumber: device.serialNumber, timestamp: { $gte: dayStart, $lt: dayEnd } } },
        {
          $group: {
            _id: { $dateTrunc: { date: "$timestamp", unit: "hour", timezone: siteTimezone } },
            averagePower: { $avg: "$power" },
          },
        },
        { $project: { _id: 0, hourStart: "$_id", averagePower: 1 } },
        { $sort: { averagePower: -1, hourStart: 1 } },
        { $limit: 1 },
      ])
      .toArray(),
    ctx.telemetry.countDocuments({
      serialNumber: device.serialNumber,
      timestamp: { $gte: dayStart, $lt: dayEnd },
    }),
  ]);

  const messages: string[] = [];
  let todayEnergyKwh: number | undefined;
  let dataStatus: DeviceAnalyticsSummary["dataStatus"] = "ok";

  if (!firstTelemetry || !lastTelemetry || sampleCount < 2) {
    dataStatus = "insufficient_data";
    messages.push("Not enough telemetry samples are available for today yet.");
  } else {
    const delta = lastTelemetry.energy - firstTelemetry.energy;
    if (delta < 0) {
      dataStatus = "counter_reset_detected";
      messages.push("Energy counter appears to have reset during the selected day.");
    } else {
      todayEnergyKwh = Number(delta.toFixed(3));
    }
  }

  if (!site?.timezone) {
    messages.push(`Site timezone is missing, so analytics used the fallback timezone ${DEFAULT_SITE_TIMEZONE}.`);
  }

  const peakHour = peakHourRows[0];
  return {
    serialNumber: device.serialNumber,
    deviceId: device.deviceId,
    displayName: device.displayName,
    tenantId: device.tenantId,
    siteId: device.siteId,
    siteTimezone,
    dayStart,
    dayEnd,
    currentVoltage: device.state?.lastVoltage,
    currentCurrent: device.state?.lastCurrent,
    currentPower: device.state?.lastPower,
    currentSeenAt: device.state?.lastSeenAt,
    todayEnergyKwh,
    peakHourStart: peakHour?.hourStart,
    peakHourEnd: peakHour ? new Date(peakHour.hourStart.getTime() + 60 * 60 * 1000) : undefined,
    peakHourAveragePower: peakHour ? Number(peakHour.averagePower.toFixed(1)) : undefined,
    sampleCount,
    dataStatus,
    messages,
  };
}
