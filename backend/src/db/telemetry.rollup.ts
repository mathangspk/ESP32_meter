import { Collection } from "mongodb";
import { TelemetryHourlyRecord, TelemetryRecord } from "./types";

export async function rollupTelemetryForDevice(
  ctx: { telemetry: Collection<TelemetryRecord>; telemetryHourly: Collection<TelemetryHourlyRecord> },
  serialNumber: string,
  deviceId: string,
  startHour: Date,
  endHour: Date,
): Promise<{ hoursProcessed: number; hoursSkipped: number }> {
  const HOUR_MS = 60 * 60 * 1000;
  const start = new Date(Math.floor(startHour.getTime() / HOUR_MS) * HOUR_MS);
  const end = new Date(Math.floor(endHour.getTime() / HOUR_MS) * HOUR_MS);
  const existing = await ctx.telemetryHourly
    .find({ serialNumber, hourStart: { $gte: start, $lt: end } }, { projection: { _id: 0, hourStart: 1 } })
    .toArray();
  const existingSet = new Set(existing.map((r) => r.hourStart.getTime()));
  let hoursProcessed = 0;
  let hoursSkipped = 0;
  let cursor = start;
  while (cursor < end) {
    if (existingSet.has(cursor.getTime())) {
      hoursSkipped++;
    } else {
      const processed = await rollupOneHour(ctx, serialNumber, deviceId, cursor);
      if (processed) hoursProcessed++;
    }
    cursor = new Date(cursor.getTime() + HOUR_MS);
  }
  return { hoursProcessed, hoursSkipped };
}

async function rollupOneHour(
  ctx: { telemetry: Collection<TelemetryRecord>; telemetryHourly: Collection<TelemetryHourlyRecord> },
  serialNumber: string,
  deviceId: string,
  hourStart: Date,
): Promise<boolean> {
  const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
  type HourAgg = {
    firstEnergy: number; lastEnergy: number; firstTimestamp: Date; lastTimestamp: Date;
    avgPower: number; maxPower: number; avgVoltage: number; minVoltage: number; maxVoltage: number;
    avgCurrent: number; sampleCount: number;
  };
  const [agg] = await ctx.telemetry
    .aggregate<HourAgg>([
      { $match: { serialNumber, timestamp: { $gte: hourStart, $lt: hourEnd } } },
      { $sort: { timestamp: 1 } },
      {
        $group: {
          _id: null,
          firstEnergy: { $first: "$energy" },
          lastEnergy: { $last: "$energy" },
          firstTimestamp: { $first: "$timestamp" },
          lastTimestamp: { $last: "$timestamp" },
          avgPower: { $avg: "$power" },
          maxPower: { $max: "$power" },
          avgVoltage: { $avg: "$voltage" },
          minVoltage: { $min: "$voltage" },
          maxVoltage: { $max: "$voltage" },
          avgCurrent: { $avg: "$current" },
          sampleCount: { $sum: 1 },
        },
      },
    ])
    .toArray();

  if (!agg || agg.sampleCount === 0) return false;
  const counterReset = agg.lastEnergy < agg.firstEnergy;
  const energyKwh = counterReset ? undefined : Number((agg.lastEnergy - agg.firstEnergy).toFixed(3));
  const now = new Date();
  await ctx.telemetryHourly.updateOne(
    { serialNumber, hourStart },
    {
      $set: {
        deviceId, firstEnergy: agg.firstEnergy, lastEnergy: agg.lastEnergy, energyKwh, counterReset,
        avgPower: Number(agg.avgPower.toFixed(2)), maxPower: Number(agg.maxPower.toFixed(2)),
        avgVoltage: Number(agg.avgVoltage.toFixed(2)), minVoltage: Number(agg.minVoltage.toFixed(2)),
        maxVoltage: Number(agg.maxVoltage.toFixed(2)), avgCurrent: Number(agg.avgCurrent.toFixed(3)),
        sampleCount: agg.sampleCount, firstTimestamp: agg.firstTimestamp, lastTimestamp: agg.lastTimestamp,
        aggregatedAt: now,
      },
      $setOnInsert: { serialNumber, hourStart },
    },
    { upsert: true },
  );
  return true;
}
export { rollupOneHour };
