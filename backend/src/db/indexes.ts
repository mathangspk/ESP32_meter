import { Db } from "mongodb";

export async function ensureIndexes(db: Db): Promise<void> {
  const telemetry = db.collection("telemetry");
  const devices = db.collection("devices");
  const deviceStates = db.collection("device_states");
  const alertEvents = db.collection("alert_events");
  const users = db.collection("users");
  const tenants = db.collection("tenants");
  const sites = db.collection("sites");
  const tenantMemberships = db.collection("tenant_memberships");
  const channelIdentities = db.collection("channel_identities");
  const deviceAssignments = db.collection("device_assignments");
  const deviceCommands = db.collection("device_commands");
  const auditEvents = db.collection("audit_events");
  const otaJobs = db.collection("ota_jobs");
  const otaStatusEvents = db.collection("ota_status_events");
  const notificationQueue = db.collection("notification_queue");
  const firmwareReleases = db.collection("firmware_releases");
  const botSessions = db.collection("bot_sessions");
  const telemetryHourly = db.collection("telemetry_hourly");

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
