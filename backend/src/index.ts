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
import { scheduleRollupJob, runRollupCatchup } from "./rollup";

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
  await mongoService.setAdminCredentials(
    config.PLATFORM_ADMIN_USER_ID,
    config.DASHBOARD_ADMIN_USERNAME,
    passwordHash,
  );
  logger.info({ username: config.DASHBOARD_ADMIN_USERNAME }, "Bootstrapped platform admin credentials");
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

process.on("SIGINT", () => { void shutdown("SIGINT"); });
process.on("SIGTERM", () => { void shutdown("SIGTERM"); });

main().catch((error) => {
  logger.error({ err: error }, "Backend failed to start");
  process.exit(1);
});
