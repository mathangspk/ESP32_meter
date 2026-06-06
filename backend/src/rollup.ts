import { logger } from "./logger";
import { mongoService } from "./mongodb";

export async function runDailyRollup(): Promise<void> {
  const now = new Date();
  const todayMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const yesterdayMidnightUtc = new Date(todayMidnightUtc.getTime() - 24 * 60 * 60 * 1000);

  logger.info({ targetDate: yesterdayMidnightUtc.toISOString() }, "Starting daily telemetry rollup");

  const devices = await mongoService.getDeviceSerialNumbers();
  let totalHoursProcessed = 0;

  for (const device of devices) {
    try {
      const { hoursProcessed } = await mongoService.rollupTelemetryForDevice(
        device.serialNumber,
        device.deviceId,
        yesterdayMidnightUtc,
        todayMidnightUtc,
      );
      totalHoursProcessed += hoursProcessed;
    } catch (error) {
      logger.error({ err: error, serialNumber: device.serialNumber }, "Failed to roll up telemetry for device");
    }
  }

  logger.info({ totalHoursProcessed, deviceCount: devices.length }, "Daily telemetry rollup complete");
}

export async function runRollupCatchup(): Promise<void> {
  const now = new Date();
  const todayMidnightUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const cutoffStart = new Date(todayMidnightUtc.getTime() - 95 * 24 * 60 * 60 * 1000);

  logger.info({ cutoffStart: cutoffStart.toISOString() }, "Starting startup rollup catchup");

  const devices = await mongoService.getDeviceSerialNumbers();

  for (const device of devices) {
    try {
      const { hoursProcessed, hoursSkipped } = await mongoService.rollupTelemetryForDevice(
        device.serialNumber,
        device.deviceId,
        cutoffStart,
        todayMidnightUtc,
      );
      if (hoursProcessed > 0) {
        logger.info({ serialNumber: device.serialNumber, hoursProcessed, hoursSkipped }, "Rollup catchup for device");
      }
    } catch (error) {
      logger.error({ err: error, serialNumber: device.serialNumber }, "Failed catchup rollup for device");
    }
  }

  logger.info({ deviceCount: devices.length }, "Startup rollup catchup complete");
}

export function scheduleRollupJob(): void {
  const now = new Date();
  const next2amUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0, 0));
  if (next2amUtc <= now) {
    next2amUtc.setUTCDate(next2amUtc.getUTCDate() + 1);
  }

  const msUntil2am = next2amUtc.getTime() - now.getTime();
  logger.info({ next2amUtc: next2amUtc.toISOString() }, "Daily rollup scheduled");

  setTimeout(function tick() {
    void runDailyRollup();
    setTimeout(tick, 24 * 60 * 60 * 1000);
  }, msUntil2am);
}
