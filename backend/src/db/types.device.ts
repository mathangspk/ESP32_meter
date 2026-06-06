import { Document } from "mongodb";
import { DeviceAction, OtaStatus } from "../types";

export type DeviceLifecycleStatus =
  | "factory_new"
  | "networked_unclaimed"
  | "claimed_unconfigured"
  | "active"
  | "unclaimed"
  | "retired";

export type DeviceClaimStatus = "unclaimed" | "claimed";

export type DeviceRecord = {
  serialNumber: string;
  deviceId: string;
  tenantId?: string;
  siteId?: string;
  ownerUserId?: string;
  displayName?: string;
  claimStatus: DeviceClaimStatus;
  lifecycleStatus: DeviceLifecycleStatus;
  lastFirmwareVersion?: string;
  macAddress?: string;
  ipAddress?: string;
  chipFamily?: string;
  chipModel?: string;
  boardType?: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  commissionedAt?: Date;
  claimedAt?: Date;
  unclaimedAt?: Date;
  retiredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceAssignmentRecord = {
  serialNumber: string;
  tenantId: string;
  siteId?: string;
  ownerUserId?: string;
  assignedAt: Date;
  unassignedAt?: Date;
};

export type AuditEventRecord = {
  eventType: string;
  actorUserId?: string;
  tenantId?: string;
  deviceSerialNumber?: string;
  deviceId?: string;
  payload?: Document;
  createdAt: Date;
};

export type DeviceCommandStatus = "queued" | "published" | "failed";

export type DeviceCommandRecord = {
  commandId: string;
  action: DeviceAction;
  deviceId: string;
  serialNumber: string;
  commandTopic: string;
  status: DeviceCommandStatus;
  actorUserId: string;
  reason?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceStateRecord = {
  deviceId: string;
  serialNumber: string;
  lastSeenAt: Date;
  lastTelemetryAt: Date;
  isOffline: boolean;
  offlineSince?: Date;
  lastOfflineAlertAt?: Date;
  lastRecoveredAlertAt?: Date;
  lastVoltage: number;
  lastCurrent: number;
  lastPower: number;
  lastFirmwareVersion?: string;
  lastOtaJobId?: string;
  lastOtaStatus?: OtaStatus;
  lastOtaTargetVersion?: string;
  lastOtaMessage?: string;
  lastOtaUpdatedAt?: Date;
  updatedAt: Date;
};

export type DeviceListRecord = DeviceRecord & {
  state?: DeviceStateRecord | null;
};
