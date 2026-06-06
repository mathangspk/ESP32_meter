import { z } from "zod";
import { request } from "./backend-client.request";
import { fleetSummarySchema, deviceSchema, tenantSchema, siteSchema } from "./backend-client.types.device";
import { userSummarySchema } from "./backend-client.types.user";

export const adminClient = {
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
};
