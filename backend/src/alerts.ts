import { config } from "./config";
import { logger } from "./logger";
import { mongoService } from "./mongodb";
import { formatOfflineMessage, persistAlert } from "./alerts.helpers";

const OFFLINE_ALERT_DELAY_MS = 2 * 60 * 1000;

export { handleTelemetryAlertTransitions } from "./alerts.helpers";

export async function checkOfflineDevices(): Promise<void> {
  const detectionCutoff = new Date(Date.now() - config.OFFLINE_TIMEOUT_SECONDS * 1000);
  const alertCutoff = new Date(Date.now() - config.OFFLINE_TIMEOUT_SECONDS * 1000 - OFFLINE_ALERT_DELAY_MS);

  await mongoService.markOfflinePending(detectionCutoff);

  const devices = await mongoService.getDevicesToAlert(alertCutoff);

  for (const device of devices) {
    const sentAt = new Date();
    const message = formatOfflineMessage(device);

    try {
      await mongoService.enqueueTelegramNotification("device.offline", message, {
        deviceId: device.deviceId,
        serialNumber: device.serialNumber,
        event: "offline",
      });
      await mongoService.markOffline(device.deviceId, sentAt);
      await persistAlert({
        deviceId: device.deviceId,
        serialNumber: device.serialNumber,
        type: "offline",
        message,
        sentAt,
        status: "queued",
      });
    } catch (error) {
      logger.error({ err: error, deviceId: device.deviceId }, "Failed to queue offline alert");
      await mongoService.markOffline(device.deviceId, sentAt);
      await persistAlert({
        deviceId: device.deviceId,
        serialNumber: device.serialNumber,
        type: "offline",
        message,
        sentAt,
        status: "failed",
      });
    }
  }
}
