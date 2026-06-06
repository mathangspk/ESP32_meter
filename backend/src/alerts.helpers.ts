import { config } from "./config";
import { logger } from "./logger";
import { AlertEventRecord, DeviceStateRecord, mongoService } from "./mongodb";
import { TelemetryPayload } from "./types";

export function formatOfflineMessage(device: DeviceStateRecord): string {
  return [
    "[ALERT] Device offline",
    `Device: ${device.serialNumber}`,
    `Device ID: ${device.deviceId}`,
    `Last seen: ${device.lastSeenAt.toISOString()}`,
    `Last voltage: ${device.lastVoltage.toFixed(1)} V`,
    "Status: Thiet bi offline, co the mat dien hoac mat mang",
  ].join("\n");
}

export function formatRecoveredMessage(payload: TelemetryPayload): string {
  return [
    "[RECOVERED] Device online again",
    `Device: ${payload.serial_number}`,
    `Device ID: ${payload.device_id}`,
    `Recovered at: ${new Date().toISOString()}`,
    `Voltage: ${payload.voltage.toFixed(1)} V`,
    `Power: ${payload.power.toFixed(1)} W`,
  ].join("\n");
}

export async function persistAlert(event: AlertEventRecord): Promise<void> {
  await mongoService.recordAlert(event);
}

export async function handleTelemetryAlertTransitions(
  payload: TelemetryPayload,
  previousState: DeviceStateRecord | null,
): Promise<void> {
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

  if (previousState?.offlineSince) {
    logger.info(
      { deviceId: payload.device_id, offlineSince: previousState.offlineSince },
      "Device recovered before offline alert threshold — no notification sent",
    );
    await mongoService.clearOfflinePending(payload.device_id);
  }
}
