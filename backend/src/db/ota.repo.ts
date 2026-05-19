import { Collection, Db, Document } from "mongodb";
import { FirmwareReleaseRequest, OtaStatusPayload } from "../types";
import {
  DeviceRecord,
  DeviceStateRecord,
  FirmwarePolicyEvaluation,
  FirmwareReleaseRecord,
  OtaJobRecord,
  OtaStatusEventRecord,
} from "./types";

export class OtaRepo {
  private otaJobs: Collection<OtaJobRecord>;
  private otaStatusEvents: Collection<OtaStatusEventRecord>;
  private firmwareReleases: Collection<FirmwareReleaseRecord>;
  private deviceStates: Collection<DeviceStateRecord>;
  private devices: Collection<DeviceRecord>;

  constructor(db: Db) {
    this.otaJobs = db.collection<OtaJobRecord>("ota_jobs");
    this.otaStatusEvents = db.collection<OtaStatusEventRecord>("ota_status_events");
    this.firmwareReleases = db.collection<FirmwareReleaseRecord>("firmware_releases");
    this.deviceStates = db.collection<DeviceStateRecord>("device_states");
    this.devices = db.collection<DeviceRecord>("devices");
  }

  async createOtaJob(job: Omit<OtaJobRecord, "status" | "createdAt" | "updatedAt">): Promise<void> {
    const now = new Date();
    await this.otaJobs.insertOne({ ...job, status: "queued", createdAt: now, updatedAt: now });
  }

  async markOtaJobPublished(jobId: string): Promise<void> {
    await this.otaJobs.updateOne({ jobId }, { $set: { status: "published", updatedAt: new Date() } });
  }

  async markOtaJobFailed(jobId: string, message: string): Promise<void> {
    const now = new Date();
    await this.otaJobs.updateOne(
      { jobId },
      { $set: { status: "failed", lastStatusMessage: message, updatedAt: now, completedAt: now } },
    );
  }

  async recordOtaStatus(payload: OtaStatusPayload): Promise<void> {
    const now = new Date();
    const statusTimestamp = new Date(payload.timestamp);

    await this.otaStatusEvents.insertOne({
      jobId: payload.job_id,
      deviceId: payload.device_id,
      serialNumber: payload.serial_number,
      status: payload.status,
      message: payload.message,
      currentVersion: payload.current_version,
      targetVersion: payload.target_version,
      timestamp: statusTimestamp,
      receivedAt: now,
    });

    await this.otaJobs.updateOne(
      { jobId: payload.job_id },
      {
        $set: {
          status: payload.status,
          lastStatusMessage: payload.message,
          currentVersion: payload.current_version,
          updatedAt: now,
          ...(payload.status === "success" || payload.status === "failed" ? { completedAt: now } : {}),
        },
      },
    );

    await this.deviceStates.updateOne(
      { deviceId: payload.device_id },
      {
        $set: {
          serialNumber: payload.serial_number,
          lastFirmwareVersion: payload.current_version,
          lastOtaJobId: payload.job_id,
          lastOtaStatus: payload.status,
          lastOtaTargetVersion: payload.target_version,
          lastOtaMessage: payload.message,
          lastOtaUpdatedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          deviceId: payload.device_id,
          isOffline: false,
          lastSeenAt: now,
          lastTelemetryAt: statusTimestamp,
          lastVoltage: 0,
          lastCurrent: 0,
          lastPower: 0,
        },
      },
      { upsert: true },
    );

    await this.devices.updateOne(
      { serialNumber: payload.serial_number },
      {
        $set: {
          deviceId: payload.device_id,
          lastFirmwareVersion: payload.current_version,
          lastSeenAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          serialNumber: payload.serial_number,
          claimStatus: "unclaimed",
          lifecycleStatus: "networked_unclaimed",
          firstSeenAt: now,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  async getOtaJob(jobId: string): Promise<OtaJobRecord | null> {
    return this.otaJobs.findOne({ jobId });
  }

  async getOtaJobs(limit = 20): Promise<OtaJobRecord[]> {
    return this.otaJobs.find({}, { sort: { createdAt: -1 }, limit }).toArray();
  }

  async createFirmwareRelease(input: FirmwareReleaseRequest): Promise<FirmwareReleaseRecord> {
    const now = new Date();
    const identityFilter: Document = { version: input.version };
    const releaseSet: Document = {
      severity: input.severity,
      supportStatus: input.supportStatus,
      isActive: true,
      releasedAt: input.releasedAt ? new Date(input.releasedAt) : now,
      updatedAt: now,
    };
    const releaseSetOnInsert: Document = {
      releaseId: `fw-${input.version}-${now.getTime()}`,
      version: input.version,
      createdAt: now,
    };

    for (const field of ["chipFamily", "chipModel", "boardType"] as const) {
      if (input[field]) {
        identityFilter[field] = input[field];
        releaseSetOnInsert[field] = input[field];
      } else {
        identityFilter[field] = { $exists: false };
      }
    }

    if (input.url) releaseSet.url = input.url;
    if (input.sha256) releaseSet.sha256 = input.sha256;
    if (input.notes) releaseSet.notes = input.notes;

    const release: FirmwareReleaseRecord = {
      releaseId: releaseSetOnInsert.releaseId as string,
      version: input.version,
      severity: input.severity,
      supportStatus: input.supportStatus,
      url: input.url,
      sha256: input.sha256,
      notes: input.notes,
      chipFamily: input.chipFamily,
      chipModel: input.chipModel,
      boardType: input.boardType,
      isActive: true,
      releasedAt: input.releasedAt ? new Date(input.releasedAt) : now,
      createdAt: now,
      updatedAt: now,
    };

    await this.firmwareReleases.updateOne(
      identityFilter,
      { $set: releaseSet, $setOnInsert: releaseSetOnInsert },
      { upsert: true },
    );

    const savedRelease = await this.firmwareReleases.findOne({ releaseId: release.releaseId });
    if (savedRelease) return savedRelease;

    const updatedRelease = await this.firmwareReleases.findOne(identityFilter);
    if (!updatedRelease) throw new Error("Failed to save firmware release");

    return updatedRelease;
  }

  async getFirmwareReleases(limit = 50): Promise<FirmwareReleaseRecord[]> {
    return this.firmwareReleases.find({ isActive: true }, { sort: { releasedAt: -1 }, limit }).toArray();
  }

  async evaluateFirmwarePolicyForDevice(identifier: string): Promise<FirmwarePolicyEvaluation | null> {
    const device = await this.devices.findOne({
      $or: [{ serialNumber: identifier }, { deviceId: identifier }],
    });
    if (!device) return null;
    return this.evaluateFirmwarePolicy(device);
  }

  async getFirmwareReleaseForDevice(identifier: string, version: string): Promise<FirmwareReleaseRecord | null> {
    const device = await this.devices.findOne({
      $or: [{ serialNumber: identifier }, { deviceId: identifier }],
    });
    if (!device) throw new Error("Device not found");
    const releases = await this.getCompatibleFirmwareReleases(device);
    return releases.find((release) => release.version === version) ?? null;
  }

  async evaluateFirmwarePolicyForFleet(limit = 50): Promise<FirmwarePolicyEvaluation[]> {
    const devices = await this.devices.find({}, { sort: { updatedAt: -1 }, limit }).toArray();
    return Promise.all(devices.map((device) => this.evaluateFirmwarePolicy(device)));
  }

  private async evaluateFirmwarePolicy(device: DeviceRecord): Promise<FirmwarePolicyEvaluation> {
    const releases = await this.getCompatibleFirmwareReleases(device);
    const currentVersion = device.lastFirmwareVersion;
    const release = currentVersion ? releases.find((c) => c.version === currentVersion) : undefined;
    const recommendedRelease = releases[0];

    if (!currentVersion) {
      return {
        serialNumber: device.serialNumber,
        deviceId: device.deviceId,
        supportStatus: "unsupported",
        severity: "required",
        updateAvailable: Boolean(recommendedRelease),
        latestVersion: recommendedRelease?.version,
        recommendedRelease,
        message: "Device has not reported a firmware version yet.",
      };
    }

    if (!release) {
      return {
        serialNumber: device.serialNumber,
        deviceId: device.deviceId,
        currentVersion,
        supportStatus: "unsupported",
        severity: "required",
        updateAvailable: Boolean(recommendedRelease && recommendedRelease.version !== currentVersion),
        latestVersion: recommendedRelease?.version,
        recommendedRelease,
        message: `Firmware ${currentVersion} is not present in the release catalog.`,
      };
    }

    const updateAvailable = Boolean(recommendedRelease && recommendedRelease.version !== currentVersion);
    const severity = updateAvailable && recommendedRelease ? recommendedRelease.severity : release.severity;

    return {
      serialNumber: device.serialNumber,
      deviceId: device.deviceId,
      currentVersion,
      supportStatus: release.supportStatus,
      severity,
      updateAvailable,
      latestVersion: recommendedRelease?.version,
      release,
      recommendedRelease: updateAvailable ? recommendedRelease : undefined,
      message: updateAvailable
        ? `Firmware ${currentVersion} can be updated to ${recommendedRelease?.version}.`
        : `Firmware ${currentVersion} is the latest compatible release.`,
    };
  }

  private async getCompatibleFirmwareReleases(device: DeviceRecord): Promise<FirmwareReleaseRecord[]> {
    return this.firmwareReleases
      .find(
        {
          isActive: true,
          $and: [
            { $or: [{ chipFamily: { $exists: false } }, { chipFamily: device.chipFamily }] },
            { $or: [{ chipModel: { $exists: false } }, { chipModel: device.chipModel }] },
            { $or: [{ boardType: { $exists: false } }, { boardType: device.boardType }] },
          ],
        },
        { sort: { releasedAt: -1 } },
      )
      .toArray();
  }

  async bootstrapFirmwareRelease(version: string, boardType: string | undefined, now: Date): Promise<void> {
    const filter: Document = { version };
    const setOnInsert: Document = {
      releaseId: `fw-${version}-bootstrap`,
      version,
      releasedAt: now,
      createdAt: now,
    };

    if (boardType) {
      filter.boardType = boardType;
      setOnInsert.boardType = boardType;
    } else {
      filter.boardType = { $exists: false };
    }

    await this.firmwareReleases.updateOne(
      filter,
      {
        $set: {
          severity: "optional",
          supportStatus: "supported",
          notes: "Bootstrap firmware release seeded for local and production control-plane startup.",
          isActive: true,
          updatedAt: now,
        },
        $setOnInsert: setOnInsert,
      },
      { upsert: true },
    );
  }
}
