import { Collection } from "mongodb";
import { MIN_VALID_VOLTAGE, BOUNDARY_MAX_GAP_MS } from "./analytics";
import { TelemetryRecord, TelemetryHourlyRecord } from "./types";

export type BoundaryTelemetrySnapshot = Pick<TelemetryRecord, "timestamp" | "energy" | "voltage" | "current" | "power">;
export type BoundaryResolution =
  | { status: "ok"; sample: BoundaryTelemetrySnapshot; mode: "at_or_before" | "after_fallback" | "hourly_fallback" }
  | { status: "missing"; reason: string };

export async function getValidTelemetryAtOrBefore(telemetry: Collection<TelemetryRecord>, serialNumber: string, boundary: Date) {
  return telemetry.findOne(
    { serialNumber, timestamp: { $lte: boundary }, voltage: { $gt: MIN_VALID_VOLTAGE } },
    { sort: { timestamp: -1 }, projection: { _id: 0, timestamp: 1, energy: 1, voltage: 1, current: 1, power: 1 } },
  );
}

export async function getValidTelemetryAfter(telemetry: Collection<TelemetryRecord>, serialNumber: string, boundary: Date) {
  return telemetry.findOne(
    { serialNumber, timestamp: { $gt: boundary, $lte: new Date(boundary.getTime() + BOUNDARY_MAX_GAP_MS) }, voltage: { $gt: MIN_VALID_VOLTAGE } },
    { sort: { timestamp: 1 }, projection: { _id: 0, timestamp: 1, energy: 1, voltage: 1, current: 1, power: 1 } },
  );
}

export async function resolveBoundaryTelemetry(
  telemetry: Collection<TelemetryRecord>,
  telemetryHourly: Collection<TelemetryHourlyRecord>,
  serialNumber: string,
  boundary: Date,
): Promise<BoundaryResolution> {
  const before = await getValidTelemetryAtOrBefore(telemetry, serialNumber, boundary);
  if (before && boundary.getTime() - before.timestamp.getTime() <= BOUNDARY_MAX_GAP_MS) {
    return { status: "ok", sample: before, mode: "at_or_before" };
  }
  const after = await getValidTelemetryAfter(telemetry, serialNumber, boundary);
  if (after) return { status: "ok", sample: after, mode: "after_fallback" };
  const hourly = await getHourlyBoundary(telemetryHourly, serialNumber, boundary);
  if (hourly) return { status: "ok", sample: hourly, mode: "hourly_fallback" };
  return { status: "missing", reason: `Missing telemetry within ${Math.floor(BOUNDARY_MAX_GAP_MS / 60000)}m of boundary ${boundary.toISOString()}.` };
}

export async function computeEnergyDeltaForSegment(
  telemetry: Collection<TelemetryRecord>,
  telemetryHourly: Collection<TelemetryHourlyRecord>,
  serialNumber: string,
  start: Date,
  end: Date,
) {
  const [startB, endB] = await Promise.all([
    resolveBoundaryTelemetry(telemetry, telemetryHourly, serialNumber, start),
    resolveBoundaryTelemetry(telemetry, telemetryHourly, serialNumber, end),
  ]);
  if (startB.status === "missing") return { status: "insufficient_data" as const, message: `Missing start boundary: ${startB.reason}` };
  if (endB.status === "missing") return { status: "insufficient_data" as const, message: `Missing end boundary: ${endB.reason}` };
  const delta = endB.sample.energy - startB.sample.energy;
  if (delta < 0) return { status: "counter_reset_detected" as const, message: `Counter reset detected.` };
  return { status: "ok" as const, delta, startMode: startB.mode, endMode: endB.mode };
}

export async function getHourlyBoundary(
  telemetryHourly: Collection<TelemetryHourlyRecord>,
  serialNumber: string,
  boundary: Date,
): Promise<BoundaryTelemetrySnapshot | null> {
  const MAX_GAP = 2 * 60 * 60 * 1000;
  const before = await telemetryHourly.findOne({ serialNumber, hourStart: { $lte: boundary }, counterReset: false }, { sort: { hourStart: -1 } });
  if (before && (boundary.getTime() - before.lastTimestamp.getTime()) <= MAX_GAP) {
    return { timestamp: before.lastTimestamp, energy: before.lastEnergy, voltage: before.avgVoltage, current: before.avgCurrent, power: before.avgPower };
  }
  const after = await telemetryHourly.findOne({ serialNumber, hourStart: { $gt: boundary }, counterReset: false }, { sort: { hourStart: 1 } });
  if (after && (after.firstTimestamp.getTime() - boundary.getTime()) <= MAX_GAP) {
    return { timestamp: after.firstTimestamp, energy: after.firstEnergy, voltage: after.avgVoltage, current: after.avgCurrent, power: after.avgPower };
  }
  return null;
}
