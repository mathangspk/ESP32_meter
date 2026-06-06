import { z } from "zod";

export const fleetSummarySchema = z.object({
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

export const deviceStateSchema = z
  .object({
    lastSeenAt: z.string().optional(),
    lastVoltage: z.number().optional(),
    lastCurrent: z.number().optional(),
    lastPower: z.number().optional(),
    isOffline: z.boolean().optional(),
    lastFirmwareVersion: z.string().optional(),
    lastOtaStatus: z.string().optional(),
    lastOtaMessage: z.string().optional(),
  })
  .passthrough();

export const deviceSchema = z
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

export const tenantSchema = z.object({
  tenantId: z.string(),
  name: z.string(),
  status: z.string(),
});

export const siteSchema = z.object({
  siteId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  timezone: z.string().optional(),
  status: z.string(),
});
