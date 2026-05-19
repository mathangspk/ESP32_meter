import { Server } from "node:http";
import { checkOfflineDevices } from "./alerts";
import { hashPassword } from "./auth";
import { config } from "./config";
import { createHttpApp } from "./http";
import { logger } from "./logger";
import { mongoService } from "./mongodb";
import { mqttService } from "./mqtt";
import { serviceState } from "./service-state";
import { HealthSnapshot } from "./types";

let server: Server | undefined;
let offlineCheckTimer: NodeJS.Timeout | undefined;
let offlineCheckRunning = false;

function getHealthSnapshot(): HealthSnapshot {
  const state = serviceState.snapshot();
  const status = state.mqttConnected && state.mongodbConnected ? "ok" : "degraded";

  return {
    status,
    uptimeSeconds: Math.floor(process.uptime()),
    mqttConnected: state.mqttConnected,
    mongodbConnected: state.mongodbConnected,
  };
}

async function runDailyRollup(): Promise<void> {
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

async function runRollupCatchup(): Promise<void> {
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

function scheduleRollupJob(): void {
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

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down backend");
  if (offlineCheckTimer) {
    clearInterval(offlineCheckTimer);
  }
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await mqttService.close();
  await mongoService.close();
  process.exit(0);
}

async function bootstrapAdminUser(): Promise<void> {
  if (await mongoService.hasPlatformAdmin()) return;
  const passwordHash = await hashPassword(config.DASHBOARD_ADMIN_PASSWORD);
  await mongoService.createWebUser({
    userId: config.PLATFORM_ADMIN_USER_ID,
    username: config.DASHBOARD_ADMIN_USERNAME,
    passwordHash,
    displayName: config.PLATFORM_ADMIN_DISPLAY_NAME,
    systemRole: "platform_admin",
  });
  logger.info({ username: config.DASHBOARD_ADMIN_USERNAME }, "Bootstrapped platform admin user");
}

async function main(): Promise<void> {
  await mongoService.connect();
  await mqttService.connect();

  const app = createHttpApp(getHealthSnapshot);
  server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "Backend HTTP server listening");
  });

  offlineCheckTimer = setInterval(() => {
    if (offlineCheckRunning) return;
    offlineCheckRunning = true;
    void checkOfflineDevices().finally(() => {
      offlineCheckRunning = false;
    });
  }, config.CHECK_INTERVAL_SECONDS * 1000);

  void bootstrapAdminUser();
  scheduleRollupJob();
  void runRollupCatchup();
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

main().catch((error) => {
  logger.error({ err: error }, "Backend failed to start");
  process.exit(1);
});
