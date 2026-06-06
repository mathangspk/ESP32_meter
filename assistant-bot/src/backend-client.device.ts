import { z } from "zod";
import { request } from "./backend-client.request";
import { siteSchema, deviceSchema } from "./backend-client.types.device";

export const deviceClient = {
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

  getDevices: (limit = 50) => request(`/devices?limit=${limit}`, { method: "GET" }, z.array(deviceSchema)),

  getDeviceHealth: (identifier: string) =>
    request(`/devices/${encodeURIComponent(identifier)}/health`, { method: "GET" }, deviceSchema),
};
