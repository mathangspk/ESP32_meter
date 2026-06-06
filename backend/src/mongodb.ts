import { Db, MongoClient, ObjectId } from "mongodb";
import { config } from "./config";
import { serviceState } from "./service-state";
import { EnergyRangeOptions } from "./db/analytics";
import { MongoDeviceService } from "./mongodb.device";
import { ensureIndexes } from "./db/indexes";
import { getFleetSummary } from "./db/fleet";
import { bootstrapPlatformAdmin, bootstrapFirmwareRelease } from "./db/bootstrap";
import { AnalyticsRepo } from "./db/analytics.repo";
import { AlertRepo } from "./db/alert.repo";
import { BotRepo } from "./db/bot.repo";
import { DeviceRepo } from "./db/device.repo";
import { OtaRepo } from "./db/ota.repo";
import { TelemetryRepo } from "./db/telemetry.repo";
import { TenantRepo } from "./db/tenant.repo";
import { UserRepo } from "./db/user.repo";

export type {
  DeviceLifecycleStatus, DeviceClaimStatus, UserStatus, MembershipRole, NotificationChannel, NotificationQueueStatus, NotificationType,
  FirmwareReleaseRecord, TenantRecord, SiteRecord, UserRecord, TenantMembershipRecord, ChannelIdentityRecord, DeviceRecord,
  DeviceAssignmentRecord, AuditEventRecord, DeviceCommandStatus, DeviceCommandRecord, DeviceStateRecord, AlertEventRecord,
  TelemetryRecord, OtaJobStatus, OtaJobRecord, OtaStatusEventRecord, TelemetryHourlyRecord, NotificationQueueRecord,
  BotSessionRecord, DeviceListRecord, FirmwarePolicyEvaluation, DeviceAnalyticsSummary, EnergyAnalyticsPreset,
  DeviceEnergyAnalyticsSummary, DevicePeakDaySummary, DeviceHourlyBreakdown, FleetSummary, UserSummary,
} from "./db/types";

import { Document } from "mongodb";

export class MongoService extends MongoDeviceService {
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
    await ensureIndexes(this.db);
    await bootstrapPlatformAdmin(this.tenantRepo, this.userRepo);
    await bootstrapFirmwareRelease(this.otaRepo);
    serviceState.setMongodbConnected(true);
  }

  async close(): Promise<void> {
    serviceState.setMongodbConnected(false);
    await this.client.close();
  }

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
  getFleetSummary() { return getFleetSummary(this.db, this.deviceRepo); }

  async getDashboardStats() {
    const onlineCutoff = new Date(Date.now() - 60 * 1000);
    const [totalDevices, onlineDevices, totalUsers, totalTenants] = await Promise.all([
      this.db.collection("devices").countDocuments({}),
      this.db.collection("device_states").countDocuments({ isOffline: false, lastSeenAt: { $gte: onlineCutoff } }),
      this.db.collection("users").countDocuments({ username: { $exists: true } }),
      this.db.collection("tenants").countDocuments({}),
    ]);
    return { totalDevices, onlineDevices, totalUsers, totalTenants };
  }
}

export const mongoService = new MongoService();
