import { Collection, Db } from "mongodb";
import { FirmwareReleaseRequest, OtaStatusPayload } from "../types";
import {
  DeviceRecord,
  DeviceStateRecord,
  FirmwarePolicyEvaluation,
  FirmwareReleaseRecord,
  OtaJobRecord,
  OtaStatusEventRecord,
} from "./types";
import * as jobs from "./ota.jobs";
import * as releases from "./ota.releases";
import * as policy from "./ota.policy";

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
    return jobs.createOtaJob(this.otaJobs, job);
  }

  async markOtaJobPublished(jobId: string): Promise<void> {
    return jobs.markOtaJobPublished(this.otaJobs, jobId);
  }

  async markOtaJobFailed(jobId: string, message: string): Promise<void> {
    return jobs.markOtaJobFailed(this.otaJobs, jobId, message);
  }

  async recordOtaStatus(payload: OtaStatusPayload): Promise<void> {
    return jobs.recordOtaStatus({
      otaStatusEvents: this.otaStatusEvents,
      otaJobs: this.otaJobs,
      deviceStates: this.deviceStates,
      devices: this.devices,
    }, payload);
  }

  async getOtaJob(jobId: string): Promise<OtaJobRecord | null> {
    return jobs.getOtaJob(this.otaJobs, jobId);
  }

  async getOtaJobs(limit = 20): Promise<OtaJobRecord[]> {
    return jobs.getOtaJobs(this.otaJobs, limit);
  }

  async createFirmwareRelease(input: FirmwareReleaseRequest): Promise<FirmwareReleaseRecord> {
    return releases.createFirmwareRelease(this.firmwareReleases, input);
  }

  async getFirmwareReleases(limit = 50): Promise<FirmwareReleaseRecord[]> {
    return releases.getFirmwareReleases(this.firmwareReleases, limit);
  }

  async evaluateFirmwarePolicyForDevice(identifier: string): Promise<FirmwarePolicyEvaluation | null> {
    return policy.evaluateFirmwarePolicyForDevice(this.devices, this.firmwareReleases, identifier);
  }

  async getFirmwareReleaseForDevice(identifier: string, version: string): Promise<FirmwareReleaseRecord | null> {
    return policy.getFirmwareReleaseForDevice(this.devices, this.firmwareReleases, identifier, version);
  }

  async evaluateFirmwarePolicyForFleet(limit = 50): Promise<FirmwarePolicyEvaluation[]> {
    return policy.evaluateFirmwarePolicyForFleet(this.devices, this.firmwareReleases, limit);
  }

  async bootstrapFirmwareRelease(version: string, boardType: string | undefined, now: Date): Promise<void> {
    return releases.bootstrapFirmwareRelease(this.firmwareReleases, version, boardType, now);
  }
}
