import { Db, MongoClient, ObjectId } from "mongodb";
import { config } from "./config";
import { serviceState } from "./service-state";
import { FirmwareReleaseRequest, OtaStatusPayload, TelemetryPayload } from "./types";
import { DEFAULT_SITE_TIMEZONE } from "./db/analytics";
import { AnalyticsRepo } from "./db/analytics.repo";
import { AlertRepo } from "./db/alert.repo";
import { BotRepo } from "./db/bot.repo";
import { DeviceRepo } from "./db/device.repo";
import { OtaRepo } from "./db/ota.repo";
import { TelemetryRepo } from "./db/telemetry.repo";
import { TenantRepo } from "./db/tenant.repo";
import { UserRepo } from "./db/user.repo";

export type {
  DeviceLifecycleStatus,
  DeviceClaimStatus,
  UserStatus,
  MembershipRole,
  NotificationChannel,
  NotificationQueueStatus,
  NotificationType,
  FirmwareReleaseRecord,
  TenantRecord,
  SiteRecord,
  UserRecord,
  TenantMembershipRecord,
  ChannelIdentityRecord,
  DeviceRecord,
  DeviceAssignmentRecord,
  AuditEventRecord,
  DeviceCommandStatus,
  DeviceCommandRecord,
  DeviceStateRecord,
  AlertEventRecord,
  TelemetryRecord,
  OtaJobStatus,
  OtaJobRecord,
  OtaStatusEventRecord,
  TelemetryHourlyRecord,
  NotificationQueueRecord,
  BotSessionRecord,
  DeviceListRecord,
  FirmwarePolicyEvaluation,
  DeviceAnalyticsSummary,
  EnergyAnalyticsPreset,
  DeviceEnergyAnalyticsSummary,
  DevicePeakDaySummary,
  DeviceHourlyBreakdown,
  FleetSummary,
  UserSummary,
} from "./db/types";

import { Document } from "mongodb";
import { EnergyRangeOptions } from "./db/analytics";

export class MongoService {
  private client = new MongoClient(config.MONGODB_URI);
  private db!: Db;
  private deviceRepo!: DeviceRepo;
  private telemetryRepo!: TelemetryRepo;
  private otaRepo!: OtaRepo;
  private userRepo!: UserRepo;
  private tenantRepo!: TenantRepo;
  private alertRepo!: AlertRepo;
  private botRepo!: BotRepo;
  private analyticsRepo!: AnalyticsRepo;

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(config.MONGODB_DB_NAME);
    this.deviceRepo = new DeviceRepo(this.db);
    this.telemetryRepo = new TelemetryRepo(this.db);
    this.otaRepo = new OtaRepo(this.db);
    this.userRepo = new UserRepo(this.db);
    this.tenantRepo = new TenantRepo(this.db);
    this.alertRepo = new AlertRepo(this.db);
    this.botRepo = new BotRepo(this.db);
    this.analyticsRepo = new AnalyticsRepo(this.db, this.deviceRepo);
    await this.ensureIndexes();
    await this.bootstrapPlatformAdmin();
    await this.bootstrapFirmwareRelease();
    serviceState.setMongodbConnected(true);
  }

  async close(): Promise<void> {
    serviceState.setMongodbConnected(false);
    await this.client.close();
  }

  // --- Telemetry ---
  insertTelemetry(payload: TelemetryPayload) { return this.telemetryRepo.insertTelemetry(payload); }
  upsertDeviceState(payload: TelemetryPayload) { return this.telemetryRepo.upsertDeviceState(payload); }
  markRecovered(deviceId: string, sentAt: Date) { return this.telemetryRepo.markRecovered(deviceId, sentAt); }
  clearOfflinePending(deviceId: string) { return this.telemetryRepo.clearOfflinePending(deviceId); }
  markOfflinePending(detectionCutoff: Date) { return this.telemetryRepo.markOfflinePending(detectionCutoff); }
  markOffline(deviceId: string, sentAt: Date) { return this.telemetryRepo.markOffline(deviceId, sentAt); }
  getDevicesToAlert(alertCutoff: Date) { return this.telemetryRepo.getDevicesToAlert(alertCutoff); }
  getRecentTelemetry(serialNumber: string, limit?: number) { return this.telemetryRepo.getRecentTelemetry(serialNumber, limit); }
  rollupTelemetryForDevice(serialNumber: string, deviceId: string, startHour: Date, endHour: Date) {
    return this.telemetryRepo.rollupTelemetryForDevice(serialNumber, deviceId, startHour, endHour);
  }

  // --- Devices ---
  getDevices(limit?: number) { return this.deviceRepo.getDevices(limit); }
  getDeviceHealth(identifier: string) { return this.deviceRepo.getDeviceHealth(identifier); }
  getDeviceSerialNumbers() { return this.deviceRepo.getDeviceSerialNumbers(); }
  getDevicesForTenant(tenantId: string, limit?: number) { return this.deviceRepo.getDevicesForTenant(tenantId, limit); }
  getUnclaimedDevices(options?: { onlineOnly?: boolean; limit?: number }) { return this.deviceRepo.getUnclaimedDevices(options); }
  claimDevice(input: { serialNumber: string; tenantId: string; siteId: string; ownerUserId: string; displayName: string }) {
    return this.deviceRepo.claimDevice(input);
  }
  unclaimDevice(input: { identifier: string; actorUserId: string; reason?: string }) {
    return this.deviceRepo.unclaimDevice(input);
  }
  updateDeviceDisplayName(identifier: string, displayName: string, actorUserId: string) {
    return this.deviceRepo.updateDeviceDisplayName(identifier, displayName, actorUserId);
  }
  createDeviceCommand(input: { commandId: string; action: import("./types").DeviceAction; identifier: string; commandTopic: string; actorUserId: string; reason?: string }) {
    return this.deviceRepo.createDeviceCommand(input);
  }
  markDeviceCommandPublished(commandId: string) { return this.deviceRepo.markDeviceCommandPublished(commandId); }
  markDeviceCommandFailed(commandId: string, errorMessage: string) { return this.deviceRepo.markDeviceCommandFailed(commandId, errorMessage); }
  getDeviceCommands(limit?: number) { return this.deviceRepo.getDeviceCommands(limit); }

  // --- OTA ---
  createOtaJob(job: Parameters<OtaRepo["createOtaJob"]>[0]) { return this.otaRepo.createOtaJob(job); }
  markOtaJobPublished(jobId: string) { return this.otaRepo.markOtaJobPublished(jobId); }
  markOtaJobFailed(jobId: string, message: string) { return this.otaRepo.markOtaJobFailed(jobId, message); }
  recordOtaStatus(payload: OtaStatusPayload) { return this.otaRepo.recordOtaStatus(payload); }
  getOtaJob(jobId: string) { return this.otaRepo.getOtaJob(jobId); }
  getOtaJobs(limit?: number) { return this.otaRepo.getOtaJobs(limit); }
  createFirmwareRelease(input: FirmwareReleaseRequest) { return this.otaRepo.createFirmwareRelease(input); }
  getFirmwareReleases(limit?: number) { return this.otaRepo.getFirmwareReleases(limit); }
  evaluateFirmwarePolicyForDevice(identifier: string) { return this.otaRepo.evaluateFirmwarePolicyForDevice(identifier); }
  getFirmwareReleaseForDevice(identifier: string, version: string) { return this.otaRepo.getFirmwareReleaseForDevice(identifier, version); }
  evaluateFirmwarePolicyForFleet(limit?: number) { return this.otaRepo.evaluateFirmwarePolicyForFleet(limit); }

  // --- Users ---
  getUserById(userId: string) { return this.userRepo.getUserById(userId); }
  getUserByUsername(username: string) { return this.userRepo.getUserByUsername(username); }
  identifyTelegramUser(input: { externalId: string; displayName?: string; username?: string }) {
    return this.userRepo.identifyTelegramUser(input);
  }
  getMembershipsForUser(userId: string) { return this.userRepo.getMembershipsForUser(userId); }
  setUserDefaultTenant(userId: string, tenantId: string) { return this.userRepo.setUserDefaultTenant(userId, tenantId); }
  getTenantListForUser(userId: string) { return this.userRepo.getTenantListForUser(userId); }
  getUserSummary() { return this.userRepo.getUserSummary(); }
  createWebUser(input: Parameters<UserRepo["createWebUser"]>[0]) {
    return this.userRepo.createWebUser(input);
  }
  updateWebUser(userId: string, patch: Parameters<UserRepo["updateWebUser"]>[1]) { return this.userRepo.updateWebUser(userId, patch); }
  listWebUsers(limit?: number) { return this.userRepo.listWebUsers(limit); }
  deleteWebUser(userId: string) { return this.userRepo.deleteWebUser(userId); }
  hasPlatformAdmin() { return this.userRepo.hasPlatformAdmin(); }
  setAdminCredentials(userId: string, username: string, passwordHash: string) {
    return this.userRepo.setAdminCredentials(userId, username, passwordHash);
  }

  // --- Tenants / Sites ---
  getTenants(limit?: number) { return this.tenantRepo.getTenants(limit); }
  getSites(limit?: number) { return this.tenantRepo.getSites(limit); }
  getSitesForTenant(tenantId: string) { return this.tenantRepo.getSitesForTenant(tenantId); }

  // --- Alerts / Notifications ---
  recordAlert(event: Parameters<AlertRepo["recordAlert"]>[0]) { return this.alertRepo.recordAlert(event); }
  enqueueTelegramNotification(
    type: Parameters<AlertRepo["enqueueTelegramNotification"]>[0],
    text: string,
    payload?: Document,
    options?: { tenantId?: string; userId?: string; title?: string; targetExternalId?: string },
  ) { return this.alertRepo.enqueueTelegramNotification(type, text, payload, options); }
  getPendingNotifications(limit?: number) { return this.alertRepo.getPendingNotifications(limit); }
  markNotificationProcessing(notificationId: ObjectId) { return this.alertRepo.markNotificationProcessing(notificationId); }
  markNotificationSent(notificationId: ObjectId) { return this.alertRepo.markNotificationSent(notificationId); }
  markNotificationFailed(notificationId: ObjectId, errorMessage: string) { return this.alertRepo.markNotificationFailed(notificationId, errorMessage); }

  // --- Bot sessions ---
  getBotSession(chatId: string) { return this.botRepo.getBotSession(chatId); }
  upsertBotSession(chatId: string, state: Document) { return this.botRepo.upsertBotSession(chatId, state); }
  deleteBotSession(chatId: string) { return this.botRepo.deleteBotSession(chatId); }

  // --- Analytics ---
  getDeviceAnalyticsSummary(identifier: string) { return this.analyticsRepo.getDeviceAnalyticsSummary(identifier); }
  getDeviceEnergyAnalytics(identifier: string, options: EnergyRangeOptions) {
    return this.analyticsRepo.getDeviceEnergyAnalytics(identifier, options);
  }
  getPeakDayLast7Days(identifier: string) { return this.analyticsRepo.getPeakDayLast7Days(identifier); }
  getPeakDayAnalytics(identifier: string, options?: EnergyRangeOptions) {
    return this.analyticsRepo.getPeakDayAnalytics(identifier, options);
  }
  getHourlyBreakdown(identifier: string, date: string) { return this.analyticsRepo.getHourlyBreakdown(identifier, date); }

  // --- Cross-domain aggregates ---

  async getFleetSummary() {
    const onlineCutoff = new Date(Date.now() - config.OFFLINE_TIMEOUT_SECONDS * 1000);
    const devices = this.db.collection("devices");
    const deviceStates = this.db.collection("device_states");
    const users = this.db.collection("users");
    const tenants = this.db.collection("tenants");
    const sites = this.db.collection("sites");

    const [
      totalDevices,
      claimedDevices,
      unclaimedDevices,
      activeDevices,
      onlineDevices,
      totalUsers,
      activeUsers,
      totalTenants,
      totalSites,
      onlineUnclaimedDevices,
      lifecycleCounts,
    ] = await Promise.all([
      devices.countDocuments({}),
      devices.countDocuments({ claimStatus: "claimed" }),
      devices.countDocuments({ claimStatus: "unclaimed" }),
      devices.countDocuments({ lifecycleStatus: "active" }),
      deviceStates.countDocuments({ lastSeenAt: { $gte: onlineCutoff } }),
      users.countDocuments({}),
      users.countDocuments({ status: "active" }),
      tenants.countDocuments({}),
      sites.countDocuments({}),
      this.deviceRepo.getOnlineUnclaimedDevicesCount(onlineCutoff),
      devices.aggregate<{ lifecycleStatus: string; count: number }>([
        { $group: { _id: "$lifecycleStatus", count: { $sum: 1 } } },
        { $project: { _id: 0, lifecycleStatus: "$_id", count: 1 } },
        { $sort: { lifecycleStatus: 1 } },
      ]).toArray(),
    ]);

    return {
      totals: {
        devices: totalDevices,
        claimedDevices,
        unclaimedDevices,
        activeDevices,
        onlineDevices,
        onlineUnclaimedDevices,
        users: totalUsers,
        activeUsers,
        tenants: totalTenants,
        sites: totalSites,
      },
      lifecycleCounts,
    };
  }

  async getDashboardStats() {
    const onlineCutoff = new Date(Date.now() - 60 * 1000);
    const devices = this.db.collection("devices");
    const deviceStates = this.db.collection("device_states");
    const users = this.db.collection("users");
    const tenants = this.db.collection("tenants");

    const [totalDevices, onlineDevices, totalUsers, totalTenants] = await Promise.all([
      devices.countDocuments({}),
      deviceStates.countDocuments({ isOffline: false, lastSeenAt: { $gte: onlineCutoff } }),
      users.countDocuments({ username: { $exists: true } }),
      tenants.countDocuments({}),
    ]);
    return { totalDevices, onlineDevices, totalUsers, totalTenants };
  }

  private async bootstrapPlatformAdmin(): Promise<void> {
    const now = new Date();
    await this.tenantRepo.bootstrapTenantAndSite(
      config.BOOTSTRAP_TENANT_ID,
      config.BOOTSTRAP_TENANT_NAME,
      config.BOOTSTRAP_SITE_ID,
      config.BOOTSTRAP_SITE_NAME,
      DEFAULT_SITE_TIMEZONE,
      now,
    );
    await this.userRepo.bootstrapUser(
      config.PLATFORM_ADMIN_USER_ID,
      config.PLATFORM_ADMIN_DISPLAY_NAME,
      config.BOOTSTRAP_TENANT_ID,
      config.BOOTSTRAP_TENANT_ID,
      config.PLATFORM_ADMIN_TELEGRAM_ID,
      now,
    );
  }

  private async bootstrapFirmwareRelease(): Promise<void> {
    await this.otaRepo.bootstrapFirmwareRelease(
      config.BOOTSTRAP_FIRMWARE_VERSION,
      config.BOOTSTRAP_FIRMWARE_BOARD_TYPE,
      new Date(),
    );
  }

  private async ensureIndexes(): Promise<void> {
    const telemetry = this.db.collection("telemetry");
    const devices = this.db.collection("devices");
    const deviceStates = this.db.collection("device_states");
    const alertEvents = this.db.collection("alert_events");
    const users = this.db.collection("users");
    const tenants = this.db.collection("tenants");
    const sites = this.db.collection("sites");
    const tenantMemberships = this.db.collection("tenant_memberships");
    const channelIdentities = this.db.collection("channel_identities");
    const deviceAssignments = this.db.collection("device_assignments");
    const deviceCommands = this.db.collection("device_commands");
    const auditEvents = this.db.collection("audit_events");
    const otaJobs = this.db.collection("ota_jobs");
    const otaStatusEvents = this.db.collection("ota_status_events");
    const notificationQueue = this.db.collection("notification_queue");
    const firmwareReleases = this.db.collection("firmware_releases");
    const botSessions = this.db.collection("bot_sessions");
    const telemetryHourly = this.db.collection("telemetry_hourly");

    await Promise.all([
      telemetry.createIndex({ deviceId: 1, timestamp: -1 }),
      telemetry.createIndex({ serialNumber: 1, timestamp: -1 }),
      telemetry.createIndex({ serialNumber: 1, timestamp: -1, voltage: 1 }),
      telemetry.createIndex({ receivedAt: 1 }, { expireAfterSeconds: 95 * 24 * 3600 }),
      devices.createIndex({ serialNumber: 1 }, { unique: true }),
      devices.createIndex({ deviceId: 1 }),
      devices.createIndex({ macAddress: 1 }),
      devices.createIndex({ claimStatus: 1, updatedAt: -1 }),
      devices.createIndex({ lifecycleStatus: 1, updatedAt: -1 }),
      deviceStates.createIndex({ deviceId: 1 }, { unique: true }),
      deviceStates.createIndex({ serialNumber: 1 }),
      alertEvents.createIndex({ deviceId: 1, sentAt: -1 }),
      users.createIndex({ userId: 1 }, { unique: true }),
      users.createIndex({ username: 1 }, { unique: true, sparse: true }),
      tenants.createIndex({ tenantId: 1 }, { unique: true }),
      sites.createIndex({ siteId: 1 }, { unique: true }),
      sites.createIndex({ tenantId: 1, name: 1 }),
      tenantMemberships.createIndex({ userId: 1, tenantId: 1 }, { unique: true }),
      channelIdentities.createIndex({ provider: 1, externalId: 1 }, { unique: true }),
      deviceAssignments.createIndex({ serialNumber: 1, assignedAt: -1 }),
      deviceCommands.createIndex({ commandId: 1 }, { unique: true }),
      deviceCommands.createIndex({ deviceId: 1, createdAt: -1 }),
      auditEvents.createIndex({ createdAt: -1 }),
      otaJobs.createIndex({ jobId: 1 }, { unique: true }),
      otaJobs.createIndex({ deviceId: 1, createdAt: -1 }),
      otaStatusEvents.createIndex({ jobId: 1, timestamp: -1 }),
      notificationQueue.createIndex({ status: 1, createdAt: 1 }),
      notificationQueue.createIndex({ channel: 1, targetExternalId: 1, createdAt: -1 }),
      firmwareReleases.createIndex({ version: 1, chipFamily: 1, chipModel: 1, boardType: 1 }, { unique: true }),
      firmwareReleases.createIndex({ isActive: 1, releasedAt: -1 }),
      botSessions.createIndex({ chatId: 1 }, { unique: true }),
      botSessions.createIndex({ updatedAt: -1 }),
      telemetryHourly.createIndex({ serialNumber: 1, hourStart: 1 }, { unique: true }),
    ]);
  }
}

export const mongoService = new MongoService();
