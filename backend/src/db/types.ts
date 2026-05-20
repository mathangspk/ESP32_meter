import { Document, ObjectId } from "mongodb";
import { DeviceAction, OtaStatus } from "../types";

export type { FirmwareReleaseSeverity, FirmwareSupportStatus, FirmwareReleaseRequest } from "../types";

export type DeviceLifecycleStatus =
  | "factory_new"
  | "networked_unclaimed"
  | "claimed_unconfigured"
  | "active"
  | "unclaimed"
  | "retired";

export type DeviceClaimStatus = "unclaimed" | "claimed";
export type UserStatus = "invited" | "registered" | "active" | "inactive" | "suspended";
export type MembershipRole = "platform_admin" | "tenant_admin" | "site_operator" | "viewer";
export type NotificationChannel = "telegram";
export type NotificationQueueStatus = "pending" | "processing" | "sent" | "failed";
export type NotificationType =
  | "device.offline"
  | "device.recovered"
  | "device.unsupported"
  | "ota.status"
  | "system.notice";

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

export type TenantRecord = {
  tenantId: string;
  name: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};

export type SiteRecord = {
  siteId: string;
  tenantId: string;
  name: string;
  timezone?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};

export type UserRecord = {
  userId: string;
  username?: string;
  passwordHash?: string;
  systemRole?: "platform_admin" | "user";
  displayName?: string;
  status: UserStatus;
  defaultTenantId?: string;
  activatedAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TenantMembershipRecord = {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  createdAt: Date;
  updatedAt: Date;
};

export type ChannelIdentityRecord = {
  provider: NotificationChannel;
  externalId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

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

export type AlertEventRecord = {
  deviceId: string;
  serialNumber: string;
  type: "offline" | "recovered";
  message: string;
  sentAt: Date;
  status: "queued" | "sent" | "failed";
};

export type TelemetryRecord = {
  deviceId: string;
  serialNumber: string;
  timestamp: Date;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  ipAddress: string;
  firmwareVersion: string;
  macAddress?: string;
  chipFamily?: string;
  chipModel?: string;
  boardType?: string;
  receivedAt: Date;
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

export type TelemetryHourlyRecord = {
  serialNumber: string;
  deviceId: string;
  hourStart: Date;
  firstEnergy: number;
  lastEnergy: number;
  energyKwh?: number;
  counterReset: boolean;
  avgPower: number;
  maxPower: number;
  avgVoltage: number;
  minVoltage: number;
  maxVoltage: number;
  avgCurrent: number;
  sampleCount: number;
  firstTimestamp: Date;
  lastTimestamp: Date;
  aggregatedAt: Date;
};

export type NotificationQueueRecord = {
  _id?: ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  targetExternalId: string;
  tenantId?: string;
  userId?: string;
  title?: string;
  text: string;
  payload?: Document;
  status: NotificationQueueStatus;
  attemptCount: number;
  lastError?: string;
  createdAt: Date;
  processingAt?: Date;
  sentAt?: Date;
  updatedAt: Date;
};

export type BotSessionRecord = {
  chatId: string;
  state: Document;
  createdAt: Date;
  updatedAt: Date;
};

export type DeviceListRecord = DeviceRecord & {
  state?: DeviceStateRecord | null;
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

export type DeviceAnalyticsSummary = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  tenantId?: string;
  siteId?: string;
  siteTimezone: string;
  dayStart: Date;
  dayEnd: Date;
  currentVoltage?: number;
  currentCurrent?: number;
  currentPower?: number;
  currentSeenAt?: Date;
  todayEnergyKwh?: number;
  peakHourStart?: Date;
  peakHourEnd?: Date;
  peakHourAveragePower?: number;
  sampleCount: number;
  dataStatus: "ok" | "insufficient_data" | "counter_reset_detected";
  messages: string[];
};

export type EnergyAnalyticsPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month";

export type DeviceEnergyAnalyticsSummary = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  tenantId?: string;
  siteId?: string;
  siteTimezone: string;
  rangeStart: Date;
  rangeEnd: Date;
  preset?: EnergyAnalyticsPreset;
  requestedStartDate?: string;
  requestedEndDate?: string;
  dayCount: number;
  energyKwh?: number;
  averageDailyKwh?: number;
  sampleCount: number;
  dataStatus: "ok" | "insufficient_data" | "counter_reset_detected";
  messages: string[];
};

export type FleetSummary = {
  totals: {
    devices: number;
    claimedDevices: number;
    unclaimedDevices: number;
    activeDevices: number;
    onlineDevices: number;
    onlineUnclaimedDevices: number;
    users: number;
    activeUsers: number;
    tenants: number;
    sites: number;
  };
  lifecycleCounts: Array<{ lifecycleStatus: string; count: number }>;
};

export type UserSummary = {
  totals: {
    users: number;
    activeUsers: number;
    invitedUsers: number;
    suspendedUsers: number;
  };
};

export type DevicePeakDaySummary = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  tenantId?: string;
  siteId?: string;
  siteTimezone: string;
  rangeStart: Date;
  rangeEnd: Date;
  peakDate?: string;
  peakDayStart?: Date;
  peakDayEnd?: Date;
  peakDayEnergyKwh?: number;
  dailyBreakdown: Array<{ date: string; energyKwh?: number; dataStatus: string }>;
  dataStatus: "ok" | "insufficient_data" | "counter_reset_detected" | "no_valid_days";
  messages: string[];
};

export type DeviceHourlyBreakdown = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  tenantId?: string;
  siteId?: string;
  siteTimezone: string;
  date: string;
  dayStart: Date;
  dayEnd: Date;
  hours: Array<{
    hourStart: Date;
    localHour: number;
    energyKwh?: number;
    avgPower: number;
    maxPower: number;
    sampleCount: number;
    counterReset: boolean;
  }>;
  totalEnergyKwh?: number;
  dataStatus: "ok" | "no_data" | "partial_data";
  messages: string[];
};
