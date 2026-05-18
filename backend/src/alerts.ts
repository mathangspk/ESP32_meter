import { config } from "./config";
import { logger } from "./logger";
import { AlertEventRecord, DeviceStateRecord, mongoService } from "./mongodb";
import { TelemetryPayload } from "./types";

const OFFLINE_ALERT_DELAY_MS = 2 * 60 * 1000;

function formatOfflineMessage(device: DeviceStateRecord): string {
  return [
    "[ALERT] Device offline",
    `Device: ${device.serialNumber}`,
    `Device ID: ${device.deviceId}`,
    `Last seen: ${device.lastSeenAt.toISOString()}`,
    `Last voltage: ${device.lastVoltage.toFixed(1)} V`,
    "Status: Thiet bi offline, co the mat dien hoac mat mang",
  ].join("\n");
}

function formatRecoveredMessage(payload: TelemetryPayload): string {
  return [
    "[RECOVERED] Device online again",
    `Device: ${payload.serial_number}`,
    `Device ID: ${payload.device_id}`,
    `Recovered at: ${new Date().toISOString()}`,
    `Voltage: ${payload.voltage.toFixed(1)} V`,
    `Power: ${payload.power.toFixed(1)} W`,
  ].join("\n");
}

async function persistAlert(event: AlertEventRecord): Promise<void> {
  await mongoService.recordAlert(event);
}

export async function handleTelemetryAlertTransitions(
  payload: TelemetryPayload,
  previousState: DeviceStateRecord | null,
): Promise<void> {
  // Device came back after alert was sent → send RECOVERED
  if (previousState?.isOffline) {
    const sentAt = new Date();
    const message = formatRecoveredMessage(payload);

    try {
      await mongoService.enqueueTelegramNotification("device.recovered", message, {
        deviceId: payload.device_id,
        serialNumber: payload.serial_number,
        event: "recovered",
      });
      await mongoService.markRecovered(payload.device_id, sentAt);
      await persistAlert({
        deviceId: payload.device_id,
        serialNumber: payload.serial_number,
        type: "recovered",
        message,
        sentAt,
        status: "queued",
      });
    } catch (error) {
      logger.error({ err: error, deviceId: payload.device_id }, "Failed to queue recovered alert");
      await mongoService.markRecovered(payload.device_id, sentAt);
      await persistAlert({
        deviceId: payload.device_id,
        serialNumber: payload.serial_number,
        type: "recovered",
        message,
        sentAt,
        status: "failed",
      });
    }
    return;
  }

  // Device came back before 2-min alert window → clear pending state silently
  if (previousState?.offlineSince) {
    logger.info(
      { deviceId: payload.device_id, offlineSince: previousState.offlineSince },
      "Device recovered before offline alert threshold — no notification sent",
    );
    await mongoService.clearOfflinePending(payload.device_id);
  }
}

export async function checkOfflineDevices(): Promise<void> {
  const detectionCutoff = new Date(Date.now() - config.OFFLINE_TIMEOUT_SECONDS * 1000);
  const alertCutoff = new Date(Date.now() - config.OFFLINE_TIMEOUT_SECONDS * 1000 - OFFLINE_ALERT_DELAY_MS);

  // Phase 1: stamp newly-silent devices with offlineSince (no alert yet)
  await mongoService.markOfflinePending(detectionCutoff);

  // Phase 2: alert devices that have been pending for 2+ minutes
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
