import { Collection } from "mongodb";
import { OtaJobRecord, OtaStatusEventRecord, DeviceStateRecord, DeviceRecord } from "./types";
import { OtaStatusPayload } from "../types";

export async function createOtaJob(
  otaJobs: Collection<OtaJobRecord>,
  job: Omit<OtaJobRecord, "status" | "createdAt" | "updatedAt">,
): Promise<void> {
  const now = new Date();
  await otaJobs.insertOne({ ...job, status: "queued", createdAt: now, updatedAt: now });
}

export async function markOtaJobPublished(otaJobs: Collection<OtaJobRecord>, jobId: string): Promise<void> {
  await otaJobs.updateOne({ jobId }, { $set: { status: "published", updatedAt: new Date() } });
}

export async function markOtaJobFailed(otaJobs: Collection<OtaJobRecord>, jobId: string, message: string): Promise<void> {
  const now = new Date();
  await otaJobs.updateOne(
    { jobId },
    { $set: { status: "failed", lastStatusMessage: message, updatedAt: now, completedAt: now } },
  );
}

export async function recordOtaStatus(
  ctx: {
    otaStatusEvents: Collection<OtaStatusEventRecord>;
    otaJobs: Collection<OtaJobRecord>;
    deviceStates: Collection<DeviceStateRecord>;
    devices: Collection<DeviceRecord>;
  },
  payload: OtaStatusPayload,
): Promise<void> {
  const now = new Date();
  const statusTimestamp = new Date(payload.timestamp);

  await ctx.otaStatusEvents.insertOne({
    jobId: payload.job_id, deviceId: payload.device_id, serialNumber: payload.serial_number,
    status: payload.status, message: payload.message, currentVersion: payload.current_version,
    targetVersion: payload.target_version, timestamp: statusTimestamp, receivedAt: now,
  });

  await ctx.otaJobs.updateOne(
    { jobId: payload.job_id },
    {
      $set: {
        status: payload.status, lastStatusMessage: payload.message, currentVersion: payload.current_version,
        updatedAt: now, ...(payload.status === "success" || payload.status === "failed" ? { completedAt: now } : {}),
      },
    },
  );

  await ctx.deviceStates.updateOne(
    { deviceId: payload.device_id },
    {
      $set: {
        serialNumber: payload.serial_number, lastFirmwareVersion: payload.current_version,
        lastOtaJobId: payload.job_id, lastOtaStatus: payload.status, lastOtaTargetVersion: payload.target_version,
        lastOtaMessage: payload.message, lastOtaUpdatedAt: now, updatedAt: now,
      },
      $setOnInsert: {
        deviceId: payload.device_id, isOffline: false, lastSeenAt: now, lastTelemetryAt: statusTimestamp,
        lastVoltage: 0, lastCurrent: 0, lastPower: 0,
      },
    },
    { upsert: true },
  );

  await ctx.devices.updateOne(
    { serialNumber: payload.serial_number },
    {
      $set: { deviceId: payload.device_id, lastFirmwareVersion: payload.current_version, lastSeenAt: now, updatedAt: now },
      $setOnInsert: {
        serialNumber: payload.serial_number, claimStatus: "unclaimed", lifecycleStatus: "networked_unclaimed",
        firstSeenAt: now, createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function getOtaJob(otaJobs: Collection<OtaJobRecord>, jobId: string): Promise<OtaJobRecord | null> {
  return otaJobs.findOne({ jobId });
}

export async function getOtaJobs(otaJobs: Collection<OtaJobRecord>, limit = 20): Promise<OtaJobRecord[]> {
  return otaJobs.find({}, { sort: { createdAt: -1 }, limit }).toArray();
}
