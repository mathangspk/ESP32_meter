import { Collection, Db, Document, MongoClient, ObjectId } from "mongodb";
import { config } from "./config";
import { serviceState } from "./service-state";
import {
  FirmwareReleaseRequest,
  FirmwareReleaseSeverity,
  FirmwareSupportStatus,
  DeviceAction,
  OtaStatus,
  OtaStatusPayload,
  TelemetryPayload,
} from "./types";

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
  severity: FirmwareReleaseSeverity;
  supportStatus: FirmwareSupportStatus;
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
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};

export type UserRecord = {
  userId: string;
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
  lastOfflineAlertAt?: Date;
  lastRecoveredAlertAt?: Date;
  lastVoltage: number;
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

type TelemetryRecord = {
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

type DeviceListRecord = DeviceRecord & {
  state?: DeviceStateRecord | null;
};

export type FirmwarePolicyEvaluation = {
  serialNumber: string;
  deviceId: string;
  currentVersion?: string;
  supportStatus: FirmwareSupportStatus;
  severity: FirmwareReleaseSeverity;
  updateAvailable: boolean;
  latestVersion?: string;
  release?: FirmwareReleaseRecord;
  recommendedRelease?: FirmwareReleaseRecord;
  message: string;
};

type FleetSummary = {
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

type UserSummary = {
  totals: {
    users: number;
    activeUsers: number;
    invitedUsers: number;
    suspendedUsers: number;
  };
};

export class MongoService {
  private client = new MongoClient(config.MONGODB_URI);
  private db!: Db;
  private telemetry!: Collection<TelemetryRecord>;
  private deviceStates!: Collection<DeviceStateRecord>;
  private devices!: Collection<DeviceRecord>;
  private users!: Collection<UserRecord>;
  private tenantMemberships!: Collection<TenantMembershipRecord>;
  private channelIdentities!: Collection<ChannelIdentityRecord>;
  private tenants!: Collection<TenantRecord>;
  private sites!: Collection<SiteRecord>;
  private deviceAssignments!: Collection<DeviceAssignmentRecord>;
  private auditEvents!: Collection<AuditEventRecord>;
  private deviceCommands!: Collection<DeviceCommandRecord>;
  private alertEvents!: Collection<AlertEventRecord>;
  private otaJobs!: Collection<OtaJobRecord>;
  private otaStatusEvents!: Collection<OtaStatusEventRecord>;
  private notificationQueue!: Collection<NotificationQueueRecord>;
  private firmwareReleases!: Collection<FirmwareReleaseRecord>;

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(config.MONGODB_DB_NAME);
    this.telemetry = this.db.collection<TelemetryRecord>("telemetry");
    this.deviceStates = this.db.collection<DeviceStateRecord>("device_states");
    this.devices = this.db.collection<DeviceRecord>("devices");
    this.users = this.db.collection<UserRecord>("users");
    this.tenantMemberships = this.db.collection<TenantMembershipRecord>("tenant_memberships");
    this.channelIdentities = this.db.collection<ChannelIdentityRecord>("channel_identities");
    this.tenants = this.db.collection<TenantRecord>("tenants");
    this.sites = this.db.collection<SiteRecord>("sites");
    this.deviceAssignments = this.db.collection<DeviceAssignmentRecord>("device_assignments");
    this.auditEvents = this.db.collection<AuditEventRecord>("audit_events");
    this.deviceCommands = this.db.collection<DeviceCommandRecord>("device_commands");
    this.alertEvents = this.db.collection<AlertEventRecord>("alert_events");
    this.otaJobs = this.db.collection<OtaJobRecord>("ota_jobs");
    this.otaStatusEvents = this.db.collection<OtaStatusEventRecord>("ota_status_events");
    this.notificationQueue = this.db.collection<NotificationQueueRecord>("notification_queue");
    this.firmwareReleases = this.db.collection<FirmwareReleaseRecord>("firmware_releases");
    await this.ensureIndexes();
    await this.bootstrapPlatformAdmin();
    await this.bootstrapFirmwareRelease();
    serviceState.setMongodbConnected(true);
  }

  async close(): Promise<void> {
    serviceState.setMongodbConnected(false);
    await this.client.close();
  }

  async insertTelemetry(payload: TelemetryPayload): Promise<void> {
    await this.telemetry.insertOne({
      deviceId: payload.device_id,
      serialNumber: payload.serial_number,
      timestamp: new Date(payload.timestamp),
      voltage: payload.voltage,
      current: payload.current,
      power: payload.power,
      energy: payload.energy,
      ipAddress: payload.ip_address,
      firmwareVersion: payload.firmware_version,
      macAddress: payload.mac_address,
      chipFamily: payload.chip_family,
      chipModel: payload.chip_model,
      boardType: payload.board_type,
      receivedAt: new Date(),
    });
  }

  async upsertDeviceState(payload: TelemetryPayload): Promise<DeviceStateRecord | null> {
    await this.upsertDeviceFromTelemetry(payload);

    const now = new Date();
    const result = await this.deviceStates.findOneAndUpdate(
      { deviceId: payload.device_id },
      {
        $set: {
          serialNumber: payload.serial_number,
          lastSeenAt: now,
          lastTelemetryAt: new Date(payload.timestamp),
          lastVoltage: payload.voltage,
          lastPower: payload.power,
          lastFirmwareVersion: payload.firmware_version,
          updatedAt: now,
        },
        $setOnInsert: {
          deviceId: payload.device_id,
          isOffline: false,
        },
      },
      { upsert: true, returnDocument: "before" },
    );
    return result;
  }

  async markRecovered(deviceId: string, sentAt: Date): Promise<void> {
    await this.deviceStates.updateOne(
      { deviceId },
      {
        $set: {
          isOffline: false,
          lastRecoveredAlertAt: sentAt,
          updatedAt: sentAt,
        },
      },
    );
  }

  async markOffline(deviceId: string, sentAt: Date): Promise<void> {
    await this.deviceStates.updateOne(
      { deviceId },
      {
        $set: {
          isOffline: true,
          lastOfflineAlertAt: sentAt,
          updatedAt: sentAt,
        },
      },
    );
  }

  async getDevicesToMarkOffline(cutoff: Date): Promise<DeviceStateRecord[]> {
    return this.deviceStates
      .find({
        isOffline: false,
        lastSeenAt: { $lt: cutoff },
      })
      .toArray();
  }

  async recordAlert(event: AlertEventRecord): Promise<void> {
    await this.alertEvents.insertOne(event);
  }

  async createOtaJob(job: Omit<OtaJobRecord, "status" | "createdAt" | "updatedAt">): Promise<void> {
    const now = new Date();
    await this.otaJobs.insertOne({
      ...job,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
  }

  async markOtaJobPublished(jobId: string): Promise<void> {
    const now = new Date();
    await this.otaJobs.updateOne(
      { jobId },
      {
        $set: {
          status: "published",
          updatedAt: now,
        },
      },
    );
  }

  async markOtaJobFailed(jobId: string, message: string): Promise<void> {
    const now = new Date();
    await this.otaJobs.updateOne(
      { jobId },
      {
        $set: {
          status: "failed",
          lastStatusMessage: message,
          updatedAt: now,
          completedAt: now,
        },
      },
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

  async enqueueTelegramNotification(
    type: NotificationType,
    text: string,
    payload?: Document,
    options?: { tenantId?: string; userId?: string; title?: string; targetExternalId?: string },
  ): Promise<void> {
    const now = new Date();
    await this.notificationQueue.insertOne({
      type,
      channel: "telegram",
      targetExternalId: options?.targetExternalId ?? config.TELEGRAM_CHAT_ID,
      tenantId: options?.tenantId,
      userId: options?.userId,
      title: options?.title,
      text,
      payload,
      status: "pending",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getPendingNotifications(limit = 50): Promise<NotificationQueueRecord[]> {
    return this.notificationQueue
      .find({ status: "pending" }, { sort: { createdAt: 1 }, limit })
      .toArray();
  }

  async markNotificationProcessing(notificationId: ObjectId): Promise<void> {
    const now = new Date();
    await this.notificationQueue.updateOne(
      { _id: notificationId },
      {
        $set: {
          status: "processing",
          processingAt: now,
          updatedAt: now,
        },
        $inc: {
          attemptCount: 1,
        },
      },
    );
  }

  async markNotificationSent(notificationId: ObjectId): Promise<void> {
    const now = new Date();
    await this.notificationQueue.updateOne(
      { _id: notificationId },
      {
        $set: {
          status: "sent",
          sentAt: now,
          updatedAt: now,
        },
      },
    );
  }

  async markNotificationFailed(notificationId: ObjectId, errorMessage: string): Promise<void> {
    const now = new Date();
    await this.notificationQueue.updateOne(
      { _id: notificationId },
      {
        $set: {
          status: "failed",
          lastError: errorMessage,
          updatedAt: now,
        },
      },
    );
  }

  async getDevices(limit = 50): Promise<DeviceListRecord[]> {
    const results = await this.devices
      .aggregate<DeviceListRecord>([
        { $sort: { updatedAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "device_states",
            localField: "serialNumber",
            foreignField: "serialNumber",
            as: "state",
          },
        },
        {
          $addFields: {
            state: { $arrayElemAt: ["$state", 0] },
          },
        },
      ])
      .toArray();

    return results;
  }

  async getDeviceHealth(identifier: string): Promise<DeviceListRecord | null> {
    const results = await this.devices
      .aggregate<DeviceListRecord>([
        {
          $match: {
            $or: [{ deviceId: identifier }, { serialNumber: identifier }],
          },
        },
        {
          $lookup: {
            from: "device_states",
            localField: "serialNumber",
            foreignField: "serialNumber",
            as: "state",
          },
        },
        {
          $addFields: {
            state: { $arrayElemAt: ["$state", 0] },
          },
        },
        { $limit: 1 },
      ])
      .toArray();

    return results[0] ?? null;
  }

  async getFleetSummary(): Promise<FleetSummary> {
    const onlineCutoff = new Date(Date.now() - config.OFFLINE_TIMEOUT_SECONDS * 1000);
    const [
      devices,
      claimedDevices,
      unclaimedDevices,
      activeDevices,
      onlineDevices,
      users,
      activeUsers,
      tenants,
      sites,
      onlineUnclaimedDevices,
      lifecycleCounts,
    ] = await Promise.all([
      this.devices.countDocuments({}),
      this.devices.countDocuments({ claimStatus: "claimed" }),
      this.devices.countDocuments({ claimStatus: "unclaimed" }),
      this.devices.countDocuments({ lifecycleStatus: "active" }),
      this.deviceStates.countDocuments({ lastSeenAt: { $gte: onlineCutoff } }),
      this.users.countDocuments({}),
      this.users.countDocuments({ status: "active" }),
      this.tenants.countDocuments({}),
      this.sites.countDocuments({}),
      this.getOnlineUnclaimedDevicesCount(onlineCutoff),
      this.devices.aggregate<{ lifecycleStatus: string; count: number }>([
        { $group: { _id: "$lifecycleStatus", count: { $sum: 1 } } },
        { $project: { _id: 0, lifecycleStatus: "$_id", count: 1 } },
        { $sort: { lifecycleStatus: 1 } },
      ]).toArray(),
    ]);

    return {
      totals: {
        devices,
        claimedDevices,
        unclaimedDevices,
        activeDevices,
        onlineDevices,
        onlineUnclaimedDevices,
        users,
        activeUsers,
        tenants,
        sites,
      },
      lifecycleCounts,
    };
  }

  async getUnclaimedDevices(options?: { onlineOnly?: boolean; limit?: number }): Promise<DeviceListRecord[]> {
    const onlineOnly = options?.onlineOnly ?? false;
    const limit = options?.limit ?? 50;
    const onlineCutoff = new Date(Date.now() - config.OFFLINE_TIMEOUT_SECONDS * 1000);

    const pipeline: Document[] = [
      {
        $match: {
          claimStatus: "unclaimed",
        },
      },
      {
        $lookup: {
          from: "device_states",
          localField: "serialNumber",
          foreignField: "serialNumber",
          as: "state",
        },
      },
      {
        $addFields: {
          state: { $arrayElemAt: ["$state", 0] },
        },
      },
    ];

    if (onlineOnly) {
      pipeline.push({
        $match: {
          "state.lastSeenAt": { $gte: onlineCutoff },
        },
      });
    }

    pipeline.push({ $sort: { updatedAt: -1 } }, { $limit: limit });

    return this.devices.aggregate<DeviceListRecord>(pipeline).toArray();
  }

  async identifyTelegramUser(input: {
    externalId: string;
    displayName?: string;
    username?: string;
  }): Promise<{
    user: UserRecord;
    memberships: Array<TenantMembershipRecord & { tenantName?: string }>;
    requiresDefaultTenantSelection: boolean;
  }> {
    const now = new Date();
    const existingIdentity = await this.channelIdentities.findOne({ provider: "telegram", externalId: input.externalId });

    let userId = existingIdentity?.userId;
    if (!userId) {
      userId = `telegram:${input.externalId}`;
      await this.channelIdentities.insertOne({
        provider: "telegram",
        externalId: input.externalId,
        userId,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await this.channelIdentities.updateOne(
        { provider: "telegram", externalId: input.externalId },
        { $set: { updatedAt: now } },
      );
    }

    await this.users.updateOne(
      { userId },
      {
        $set: {
          status: "active",
          displayName: input.displayName ?? input.username ?? userId,
          lastActiveAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          userId,
          activatedAt: now,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const user = await this.users.findOne({ userId });
    if (!user) {
      throw new Error("Failed to resolve user after Telegram identification");
    }

    const memberships = await this.getMembershipsForUser(userId);

    if (!user.defaultTenantId && memberships.length === 1) {
      await this.setUserDefaultTenant(userId, memberships[0].tenantId);
      user.defaultTenantId = memberships[0].tenantId;
    }

    return {
      user,
      memberships,
      requiresDefaultTenantSelection: memberships.length > 1 && !user.defaultTenantId,
    };
  }

  async getMembershipsForUser(userId: string): Promise<Array<TenantMembershipRecord & { tenantName?: string }>> {
    const memberships = await this.tenantMemberships.find({ userId }, { sort: { tenantId: 1 } }).toArray();
    if (memberships.length === 0) {
      return [];
    }

    const tenants = await this.tenants
      .find({ tenantId: { $in: memberships.map((membership) => membership.tenantId) } })
      .toArray();
    const tenantNameMap = new Map(tenants.map((tenant) => [tenant.tenantId, tenant.name]));

    return memberships.map((membership) => ({
      ...membership,
      tenantName: tenantNameMap.get(membership.tenantId),
    }));
  }

  async setUserDefaultTenant(userId: string, tenantId: string): Promise<UserRecord | null> {
    const membership = await this.tenantMemberships.findOne({ userId, tenantId });
    if (!membership) {
      throw new Error("User is not a member of the selected tenant");
    }

    const now = new Date();
    await this.users.updateOne(
      { userId },
      {
        $set: {
          defaultTenantId: tenantId,
          updatedAt: now,
        },
      },
    );

    return this.users.findOne({ userId });
  }

  async getUserById(userId: string): Promise<UserRecord | null> {
    return this.users.findOne({ userId });
  }

  async getTenantListForUser(userId: string): Promise<TenantRecord[]> {
    const memberships = await this.tenantMemberships.find({ userId }).toArray();
    if (memberships.length === 0) {
      return [];
    }

    return this.tenants.find({ tenantId: { $in: memberships.map((membership) => membership.tenantId) } }, { sort: { name: 1 } }).toArray();
  }

  async getSitesForTenant(tenantId: string): Promise<SiteRecord[]> {
    return this.sites.find({ tenantId, status: "active" }, { sort: { name: 1 } }).toArray();
  }

  async claimDevice(input: {
    serialNumber: string;
    tenantId: string;
    siteId: string;
    ownerUserId: string;
    displayName: string;
  }): Promise<DeviceRecord | null> {
    const now = new Date();
    const existingDevice = await this.devices.findOne({ serialNumber: input.serialNumber });
    if (!existingDevice) {
      throw new Error("Device serial number not found");
    }
    if (existingDevice.claimStatus === "claimed") {
      throw new Error("Device is already claimed");
    }

    const site = await this.sites.findOne({ siteId: input.siteId, tenantId: input.tenantId, status: "active" });
    if (!site) {
      throw new Error("Selected site does not belong to the tenant or is inactive");
    }

    await this.devices.updateOne(
      { serialNumber: input.serialNumber },
      {
        $set: {
          tenantId: input.tenantId,
          siteId: input.siteId,
          ownerUserId: input.ownerUserId,
          displayName: input.displayName,
          claimStatus: "claimed",
          lifecycleStatus: "active",
          claimedAt: now,
          commissionedAt: existingDevice.commissionedAt ?? now,
          updatedAt: now,
        },
      },
    );

    await this.deviceAssignments.insertOne({
      serialNumber: input.serialNumber,
      tenantId: input.tenantId,
      siteId: input.siteId,
      ownerUserId: input.ownerUserId,
      assignedAt: now,
    });

    await this.auditEvents.insertOne({
      eventType: "device.claimed",
      actorUserId: input.ownerUserId,
      tenantId: input.tenantId,
      deviceSerialNumber: input.serialNumber,
      payload: {
        siteId: input.siteId,
        displayName: input.displayName,
      },
      createdAt: now,
    });

    return this.devices.findOne({ serialNumber: input.serialNumber });
  }

  async unclaimDevice(input: { identifier: string; actorUserId: string; reason?: string }): Promise<DeviceRecord | null> {
    const now = new Date();
    const existingDevice = await this.devices.findOne({ $or: [{ serialNumber: input.identifier }, { deviceId: input.identifier }] });
    if (!existingDevice) {
      throw new Error("Device not found");
    }
    if (existingDevice.claimStatus === "unclaimed") {
      throw new Error("Device is already unclaimed");
    }

    await this.devices.updateOne(
      { serialNumber: existingDevice.serialNumber },
      {
        $set: {
          claimStatus: "unclaimed",
          lifecycleStatus: "unclaimed",
          unclaimedAt: now,
          updatedAt: now,
        },
        $unset: {
          tenantId: "",
          siteId: "",
          ownerUserId: "",
          displayName: "",
        },
      },
    );

    await this.deviceAssignments.updateMany(
      { serialNumber: existingDevice.serialNumber, unassignedAt: { $exists: false } },
      { $set: { unassignedAt: now } },
    );

    await this.auditEvents.insertOne({
      eventType: "device.unclaimed",
      actorUserId: input.actorUserId,
      tenantId: existingDevice.tenantId,
      deviceSerialNumber: existingDevice.serialNumber,
      deviceId: existingDevice.deviceId,
      payload: {
        reason: input.reason,
        previousSiteId: existingDevice.siteId,
        previousOwnerUserId: existingDevice.ownerUserId,
      },
      createdAt: now,
    });

    return this.devices.findOne({ serialNumber: existingDevice.serialNumber });
  }

  async createDeviceCommand(input: {
    commandId: string;
    action: DeviceAction;
    identifier: string;
    commandTopic: string;
    actorUserId: string;
    reason?: string;
  }): Promise<DeviceCommandRecord> {
    const now = new Date();
    const device = await this.devices.findOne({ $or: [{ serialNumber: input.identifier }, { deviceId: input.identifier }] });
    if (!device) {
      throw new Error("Device not found");
    }

    const command: DeviceCommandRecord = {
      commandId: input.commandId,
      action: input.action,
      deviceId: device.deviceId,
      serialNumber: device.serialNumber,
      commandTopic: input.commandTopic,
      status: "queued",
      actorUserId: input.actorUserId,
      reason: input.reason,
      createdAt: now,
      updatedAt: now,
    };

    await this.deviceCommands.insertOne(command);
    await this.auditEvents.insertOne({
      eventType: `device.command.${input.action}.queued`,
      actorUserId: input.actorUserId,
      tenantId: device.tenantId,
      deviceSerialNumber: device.serialNumber,
      deviceId: device.deviceId,
      payload: { commandId: input.commandId, reason: input.reason, commandTopic: input.commandTopic },
      createdAt: now,
    });

    return command;
  }

  async markDeviceCommandPublished(commandId: string): Promise<void> {
    const now = new Date();
    await this.deviceCommands.updateOne({ commandId }, { $set: { status: "published", updatedAt: now } });
  }

  async markDeviceCommandFailed(commandId: string, errorMessage: string): Promise<void> {
    const now = new Date();
    await this.deviceCommands.updateOne(
      { commandId },
      { $set: { status: "failed", errorMessage, updatedAt: now } },
    );
  }

  async getDeviceCommands(limit = 50): Promise<DeviceCommandRecord[]> {
    return this.deviceCommands.find({}, { sort: { createdAt: -1 }, limit }).toArray();
  }

  async getDevicesForTenant(tenantId: string, limit = 50): Promise<DeviceListRecord[]> {
    return this.devices
      .aggregate<DeviceListRecord>([
        { $match: { tenantId } },
        { $sort: { updatedAt: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: "device_states",
            localField: "serialNumber",
            foreignField: "serialNumber",
            as: "state",
          },
        },
        {
          $addFields: {
            state: { $arrayElemAt: ["$state", 0] },
          },
        },
      ])
      .toArray();
  }

  async getTenants(limit = 100): Promise<TenantRecord[]> {
    return this.tenants.find({}, { sort: { name: 1 }, limit }).toArray();
  }

  async getSites(limit = 100): Promise<SiteRecord[]> {
    return this.sites.find({}, { sort: { tenantId: 1, name: 1 }, limit }).toArray();
  }

  async getUserSummary(): Promise<UserSummary> {
    const [users, activeUsers, invitedUsers, suspendedUsers] = await Promise.all([
      this.users.countDocuments({}),
      this.users.countDocuments({ status: "active" }),
      this.users.countDocuments({ status: "invited" }),
      this.users.countDocuments({ status: "suspended" }),
    ]);

    return {
      totals: {
        users,
        activeUsers,
        invitedUsers,
        suspendedUsers,
      },
    };
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

    if (input.url) {
      releaseSet.url = input.url;
    }
    if (input.sha256) {
      releaseSet.sha256 = input.sha256;
    }
    if (input.notes) {
      releaseSet.notes = input.notes;
    }

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
      {
        $set: releaseSet,
        $setOnInsert: releaseSetOnInsert,
      },
      { upsert: true },
    );

    const savedRelease = await this.firmwareReleases.findOne({ releaseId: release.releaseId });
    if (savedRelease) {
      return savedRelease;
    }

    const updatedRelease = await this.firmwareReleases.findOne(identityFilter);
    if (!updatedRelease) {
      throw new Error("Failed to save firmware release");
    }

    return updatedRelease;
  }

  async getFirmwareReleases(limit = 50): Promise<FirmwareReleaseRecord[]> {
    return this.firmwareReleases.find({ isActive: true }, { sort: { releasedAt: -1 }, limit }).toArray();
  }

  async evaluateFirmwarePolicyForDevice(identifier: string): Promise<FirmwarePolicyEvaluation | null> {
    const device = await this.devices.findOne({ $or: [{ serialNumber: identifier }, { deviceId: identifier }] });
    if (!device) {
      return null;
    }

    return this.evaluateFirmwarePolicy(device);
  }

  async evaluateFirmwarePolicyForFleet(limit = 50): Promise<FirmwarePolicyEvaluation[]> {
    const devices = await this.devices.find({}, { sort: { updatedAt: -1 }, limit }).toArray();
    return Promise.all(devices.map((device) => this.evaluateFirmwarePolicy(device)));
  }

  private async evaluateFirmwarePolicy(device: DeviceRecord): Promise<FirmwarePolicyEvaluation> {
    const releases = await this.getCompatibleFirmwareReleases(device);
    const currentVersion = device.lastFirmwareVersion;
    const release = currentVersion ? releases.find((candidate) => candidate.version === currentVersion) : undefined;
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

  private async upsertDeviceFromTelemetry(payload: TelemetryPayload): Promise<void> {
    const now = new Date();
    const setFields: Partial<DeviceRecord> = {
      deviceId: payload.device_id,
      lastSeenAt: now,
      lastFirmwareVersion: payload.firmware_version,
      updatedAt: now,
    };

    if (payload.mac_address) {
      setFields.macAddress = payload.mac_address;
    }
    if (payload.chip_family) {
      setFields.chipFamily = payload.chip_family;
    }
    if (payload.chip_model) {
      setFields.chipModel = payload.chip_model;
    }
    if (payload.board_type) {
      setFields.boardType = payload.board_type;
    }

    await this.devices.updateOne(
      { serialNumber: payload.serial_number },
      {
        $set: setFields,
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

  private async getOnlineUnclaimedDevicesCount(onlineCutoff: Date): Promise<number> {
    const results = await this.devices
      .aggregate<{ count: number }>([
        { $match: { claimStatus: "unclaimed" } },
        {
          $lookup: {
            from: "device_states",
            localField: "serialNumber",
            foreignField: "serialNumber",
            as: "state",
          },
        },
        {
          $addFields: {
            state: { $arrayElemAt: ["$state", 0] },
          },
        },
        {
          $match: {
            "state.lastSeenAt": { $gte: onlineCutoff },
          },
        },
        { $count: "count" },
      ])
      .toArray();

    return results[0]?.count ?? 0;
  }

  private async bootstrapPlatformAdmin(): Promise<void> {
    const now = new Date();

    await this.tenants.updateOne(
      { tenantId: config.BOOTSTRAP_TENANT_ID },
      {
        $set: {
          name: config.BOOTSTRAP_TENANT_NAME,
          status: "active",
          updatedAt: now,
        },
        $setOnInsert: {
          tenantId: config.BOOTSTRAP_TENANT_ID,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await this.sites.updateOne(
      { siteId: config.BOOTSTRAP_SITE_ID },
      {
        $set: {
          tenantId: config.BOOTSTRAP_TENANT_ID,
          name: config.BOOTSTRAP_SITE_NAME,
          status: "active",
          updatedAt: now,
        },
        $setOnInsert: {
          siteId: config.BOOTSTRAP_SITE_ID,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await this.users.updateOne(
      { userId: config.PLATFORM_ADMIN_USER_ID },
      {
        $set: {
          displayName: config.PLATFORM_ADMIN_DISPLAY_NAME,
          status: "active",
          defaultTenantId: config.BOOTSTRAP_TENANT_ID,
          activatedAt: now,
          updatedAt: now,
        },
        $setOnInsert: {
          userId: config.PLATFORM_ADMIN_USER_ID,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await this.tenantMemberships.updateOne(
      { userId: config.PLATFORM_ADMIN_USER_ID, tenantId: config.BOOTSTRAP_TENANT_ID },
      {
        $set: {
          role: "platform_admin",
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    if (config.PLATFORM_ADMIN_TELEGRAM_ID) {
      await this.channelIdentities.updateOne(
        { provider: "telegram", externalId: config.PLATFORM_ADMIN_TELEGRAM_ID },
        {
          $set: {
            userId: config.PLATFORM_ADMIN_USER_ID,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }
  }

  private async bootstrapFirmwareRelease(): Promise<void> {
    const now = new Date();
    const filter: Document = { version: config.BOOTSTRAP_FIRMWARE_VERSION };
    const setOnInsert: Document = {
      releaseId: `fw-${config.BOOTSTRAP_FIRMWARE_VERSION}-bootstrap`,
      version: config.BOOTSTRAP_FIRMWARE_VERSION,
      releasedAt: now,
      createdAt: now,
    };
    if (config.BOOTSTRAP_FIRMWARE_BOARD_TYPE) {
      filter.boardType = config.BOOTSTRAP_FIRMWARE_BOARD_TYPE;
      setOnInsert.boardType = config.BOOTSTRAP_FIRMWARE_BOARD_TYPE;
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

  private async ensureIndexes(): Promise<void> {
    await this.telemetry.createIndex({ deviceId: 1, timestamp: -1 });
    await this.devices.createIndex({ serialNumber: 1 }, { unique: true });
    await this.devices.createIndex({ deviceId: 1 });
    await this.devices.createIndex({ claimStatus: 1, updatedAt: -1 });
    await this.devices.createIndex({ lifecycleStatus: 1, updatedAt: -1 });
    await this.deviceStates.createIndex({ deviceId: 1 }, { unique: true });
    await this.deviceStates.createIndex({ serialNumber: 1 });
    await this.alertEvents.createIndex({ deviceId: 1, sentAt: -1 });
    await this.users.createIndex({ userId: 1 }, { unique: true });
    await this.tenants.createIndex({ tenantId: 1 }, { unique: true });
    await this.sites.createIndex({ siteId: 1 }, { unique: true });
    await this.sites.createIndex({ tenantId: 1, name: 1 });
    await this.tenantMemberships.createIndex({ userId: 1, tenantId: 1 }, { unique: true });
    await this.channelIdentities.createIndex({ provider: 1, externalId: 1 }, { unique: true });
    await this.deviceAssignments.createIndex({ serialNumber: 1, assignedAt: -1 });
    await this.deviceCommands.createIndex({ commandId: 1 }, { unique: true });
    await this.deviceCommands.createIndex({ deviceId: 1, createdAt: -1 });
    await this.auditEvents.createIndex({ createdAt: -1 });
    await this.otaJobs.createIndex({ jobId: 1 }, { unique: true });
    await this.otaJobs.createIndex({ deviceId: 1, createdAt: -1 });
    await this.otaStatusEvents.createIndex({ jobId: 1, timestamp: -1 });
    await this.notificationQueue.createIndex({ status: 1, createdAt: 1 });
    await this.notificationQueue.createIndex({ channel: 1, targetExternalId: 1, createdAt: -1 });
    await this.firmwareReleases.createIndex({ version: 1, chipFamily: 1, chipModel: 1, boardType: 1 }, { unique: true });
    await this.firmwareReleases.createIndex({ isActive: 1, releasedAt: -1 });
  }
}

export const mongoService = new MongoService();
