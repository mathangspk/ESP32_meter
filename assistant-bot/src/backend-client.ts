import { z } from "zod";
import { config } from "./config";

const membershipSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  role: z.enum(["platform_admin", "tenant_admin", "site_operator", "viewer"]),
  tenantName: z.string().optional(),
});

const userSchema = z.object({
  userId: z.string(),
  displayName: z.string().optional(),
  status: z.string(),
  defaultTenantId: z.string().optional(),
});

export type BotUser = z.infer<typeof userSchema>;
export type Membership = z.infer<typeof membershipSchema>;

const identifyResponseSchema = z.object({
  user: userSchema,
  memberships: z.array(membershipSchema),
  requiresDefaultTenantSelection: z.boolean(),
});

const fleetSummarySchema = z.object({
  totals: z.object({
    devices: z.number(),
    claimedDevices: z.number(),
    unclaimedDevices: z.number(),
    activeDevices: z.number(),
    onlineDevices: z.number(),
    onlineUnclaimedDevices: z.number(),
    users: z.number(),
    activeUsers: z.number(),
    tenants: z.number(),
    sites: z.number(),
  }),
  lifecycleCounts: z.array(z.object({ lifecycleStatus: z.string(), count: z.number() })),
});

const userSummarySchema = z.object({
  totals: z.object({
    users: z.number(),
    activeUsers: z.number(),
    invitedUsers: z.number(),
    suspendedUsers: z.number(),
  }),
});

const notificationSchema = z.object({
  _id: z.string(),
  type: z.string(),
  channel: z.string(),
  targetExternalId: z.string(),
  title: z.string().optional(),
  text: z.string(),
  payload: z.unknown().optional(),
  status: z.string(),
  attemptCount: z.number(),
});

const deviceStateSchema = z
  .object({
    lastSeenAt: z.string().optional(),
    lastVoltage: z.number().optional(),
    lastPower: z.number().optional(),
    isOffline: z.boolean().optional(),
    lastFirmwareVersion: z.string().optional(),
    lastOtaStatus: z.string().optional(),
    lastOtaMessage: z.string().optional(),
  })
  .passthrough();

const deviceSchema = z
  .object({
    serialNumber: z.string(),
    deviceId: z.string(),
    tenantId: z.string().optional(),
    siteId: z.string().optional(),
    displayName: z.string().optional(),
    claimStatus: z.string(),
    lifecycleStatus: z.string(),
    lastFirmwareVersion: z.string().optional(),
    state: deviceStateSchema.nullish(),
  })
  .passthrough();

const tenantSchema = z.object({
  tenantId: z.string(),
  name: z.string(),
  status: z.string(),
});

const siteSchema = z.object({
  siteId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  status: z.string(),
});

const firmwareReleaseSchema = z
  .object({
    releaseId: z.string(),
    version: z.string(),
    severity: z.enum(["optional", "recommended", "required"]),
    supportStatus: z.enum(["supported", "deprecated", "unsupported"]),
    url: z.string().optional(),
    notes: z.string().optional(),
    releasedAt: z.string(),
  })
  .passthrough();

const firmwarePolicySchema = z
  .object({
    serialNumber: z.string(),
    deviceId: z.string(),
    currentVersion: z.string().optional(),
    supportStatus: z.enum(["supported", "deprecated", "unsupported"]),
    severity: z.enum(["optional", "recommended", "required"]),
    updateAvailable: z.boolean(),
    latestVersion: z.string().optional(),
    release: firmwareReleaseSchema.optional(),
    recommendedRelease: firmwareReleaseSchema.optional(),
    message: z.string(),
  })
  .passthrough();

const deviceActionResultSchema = z.unknown();

const otaJobSchema = z
  .object({
    jobId: z.string(),
    deviceId: z.string(),
    serialNumber: z.string(),
    targetVersion: z.string(),
    status: z.string(),
  })
  .passthrough();

async function request<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(`${config.BACKEND_BASE_URL}${path}`, init);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Backend request failed: ${response.status} ${body}`);
  }

  if (response.status === 204) {
    return schema.parse(undefined);
  }

  const json = await response.json();
  return schema.parse(json);
}

export const backendClient = {
  identifyTelegramUser: (input: { externalId: string; displayName?: string; username?: string }) =>
    request(
      "/internal/telegram/identify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      identifyResponseSchema,
    ),

  setDefaultTenant: (userId: string, tenantId: string) =>
    request(
      `/internal/users/${encodeURIComponent(userId)}/default-tenant`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      },
      userSchema.nullable(),
    ),

  getUserMemberships: (userId: string) =>
    request(
      `/internal/users/${encodeURIComponent(userId)}/memberships`,
      { method: "GET" },
      z.object({ user: userSchema, memberships: z.array(membershipSchema) }),
    ),

  getUserTenants: (userId: string) =>
    request(`/internal/users/${encodeURIComponent(userId)}/tenants`, { method: "GET" }, z.array(tenantSchema)),

  getSitesForTenant: (tenantId: string) =>
    request(`/internal/tenants/${encodeURIComponent(tenantId)}/sites`, { method: "GET" }, z.array(siteSchema)),

  claimDevice: (input: {
    serialNumber: string;
    tenantId: string;
    siteId: string;
    ownerUserId: string;
    displayName: string;
  }) =>
    request(
      "/devices/claim",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      deviceSchema.nullable(),
    ),

  getDevicesForTenant: (tenantId: string, limit = 20) =>
    request(
      `/internal/tenants/${encodeURIComponent(tenantId)}/devices?limit=${limit}`,
      { method: "GET" },
      z.array(deviceSchema),
    ),

  getDeviceHealth: (identifier: string) =>
    request(`/devices/${encodeURIComponent(identifier)}/health`, { method: "GET" }, deviceSchema),

  getFleetSummary: () => request("/admin/fleet/summary", { method: "GET" }, fleetSummarySchema),

  getUnclaimedDevices: (onlineOnly: boolean) =>
    request(
      onlineOnly ? "/admin/devices/online-unclaimed" : "/admin/devices/unclaimed",
      { method: "GET" },
      z.array(deviceSchema),
    ),

  getUserSummary: () => request("/admin/users/summary", { method: "GET" }, userSummarySchema),

  getAdminTenants: (limit = 100) =>
    request(`/admin/tenants?limit=${limit}`, { method: "GET" }, z.array(tenantSchema)),

  getAdminSites: (limit = 100) =>
    request(`/admin/sites?limit=${limit}`, { method: "GET" }, z.array(siteSchema)),

  getFirmwarePolicy: (identifier: string) =>
    request(`/devices/${encodeURIComponent(identifier)}/firmware-policy`, { method: "GET" }, firmwarePolicySchema),

  getFleetFirmwarePolicy: (limit = 50) =>
    request(`/admin/firmware/policy?limit=${limit}`, { method: "GET" }, z.array(firmwarePolicySchema)),

  getFirmwareReleases: (limit = 20) =>
    request(`/admin/firmware/releases?limit=${limit}`, { method: "GET" }, z.array(firmwareReleaseSchema)),

  performDeviceAction: (identifier: string, input: { action: "remove" | "reboot" | "factory_reset"; actorUserId: string; reason?: string }) =>
    request(
      `/devices/${encodeURIComponent(identifier)}/actions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      deviceActionResultSchema,
    ),

  createOtaFromRelease: (identifier: string, input: { version: string; actorUserId: string }) =>
    request(
      `/devices/${encodeURIComponent(identifier)}/ota`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      otaJobSchema.nullable(),
    ),

  getPendingNotifications: (limit = 20) =>
    request(`/internal/notifications/pending?limit=${limit}`, { method: "GET" }, z.array(notificationSchema)),

  markNotificationProcessing: async (notificationId: string) => {
    const response = await fetch(`${config.BACKEND_BASE_URL}/internal/notifications/${notificationId}/processing`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Failed to mark notification processing: ${response.status}`);
    }
  },

  markNotificationSent: async (notificationId: string) => {
    const response = await fetch(`${config.BACKEND_BASE_URL}/internal/notifications/${notificationId}/sent`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Failed to mark notification sent: ${response.status}`);
    }
  },

  markNotificationFailed: async (notificationId: string, error: string) => {
    const response = await fetch(`${config.BACKEND_BASE_URL}/internal/notifications/${notificationId}/failed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error }),
    });
    if (!response.ok) {
      throw new Error(`Failed to mark notification failed: ${response.status}`);
    }
  },
};
