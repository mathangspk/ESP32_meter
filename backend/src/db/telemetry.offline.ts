import { Collection } from "mongodb";
import { DeviceStateRecord, TelemetryRecord } from "./types";

export async function markRecovered(
  deviceStates: Collection<DeviceStateRecord>,
  deviceId: string,
  sentAt: Date,
): Promise<void> {
  await deviceStates.updateOne(
    { deviceId },
    {
      $set: { isOffline: false, lastRecoveredAlertAt: sentAt, updatedAt: sentAt },
      $unset: { offlineSince: "" },
    },
  );
}

export async function clearOfflinePending(
  deviceStates: Collection<DeviceStateRecord>,
  deviceId: string,
): Promise<void> {
  await deviceStates.updateOne(
    { deviceId },
    { $unset: { offlineSince: "" }, $set: { updatedAt: new Date() } },
  );
}

export async function markOfflinePending(
  deviceStates: Collection<DeviceStateRecord>,
  detectionCutoff: Date,
): Promise<void> {
  const now = new Date();
  await deviceStates.updateMany(
    { isOffline: false, offlineSince: { $exists: false }, lastSeenAt: { $lt: detectionCutoff } },
    { $set: { offlineSince: now, updatedAt: now } },
  );
}

export async function markOffline(
  deviceStates: Collection<DeviceStateRecord>,
  deviceId: string,
  sentAt: Date,
): Promise<void> {
  await deviceStates.updateOne(
    { deviceId },
    { $set: { isOffline: true, lastOfflineAlertAt: sentAt, updatedAt: sentAt } },
  );
}

export async function getDevicesToAlert(
  deviceStates: Collection<DeviceStateRecord>,
  alertCutoff: Date,
): Promise<DeviceStateRecord[]> {
  return deviceStates
    .find({ isOffline: false, offlineSince: { $exists: true, $lt: alertCutoff } })
    .toArray();
}

export async function getRecentTelemetry(
  telemetry: Collection<TelemetryRecord>,
  serialNumber: string,
  limit = 20,
): Promise<TelemetryRecord[]> {
  return telemetry.find({ serialNumber }, { sort: { timestamp: -1 }, limit }).toArray();
}
