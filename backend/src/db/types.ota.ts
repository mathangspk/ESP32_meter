import { OtaStatus } from "../types";
import { DeviceRecord } from "./types.device";

export type FirmwareReleaseRecord = {
  releaseId: string;
  version: string;
  severity: import("../types").FirmwareReleaseSeverity;
  supportStatus: import("../types").FirmwareSupportStatus;
  url?: string;
  sha256?: string;
  notes?: string;
  chipFamily?: string;
  chipModel?: string;
  boardType?: string;
  isActive: boolean;
  releasedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type OtaJobStatus = "queued" | "published" | OtaStatus;

export type OtaJobRecord = {
  jobId: string;
  deviceId: string;
  serialNumber: string;
  commandTopic: string;
  targetVersion: string;
  url: string;
  sha256?: string;
  status: OtaJobStatus;
  createdAt: Date;
  updatedAt: Date;
  lastStatusMessage?: string;
  currentVersion?: string;
  completedAt?: Date;
};

export type OtaStatusEventRecord = {
  jobId: string;
  deviceId: string;
  serialNumber: string;
  status: OtaStatus;
  message: string;
  currentVersion: string;
  targetVersion: string;
  timestamp: Date;
  receivedAt: Date;
};

export type FirmwarePolicyEvaluation = {
  serialNumber: string;
  deviceId: string;
  currentVersion?: string;
  supportStatus: import("../types").FirmwareSupportStatus;
  severity: import("../types").FirmwareReleaseSeverity;
  updateAvailable: boolean;
  latestVersion?: string;
  release?: FirmwareReleaseRecord;
  recommendedRelease?: FirmwareReleaseRecord;
  message: string;
};
