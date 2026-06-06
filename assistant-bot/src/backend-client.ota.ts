import { z } from "zod";
import { request } from "./backend-client.request";
import {
  firmwarePolicySchema,
  firmwareReleaseSchema,
  deviceActionResultSchema,
  otaJobSchema,
} from "./backend-client.types.ota";

export const otaClient = {
  getFirmwarePolicy: (identifier: string) =>
    request(`/devices/${encodeURIComponent(identifier)}/firmware-policy`, { method: "GET" }, firmwarePolicySchema),

  getFleetFirmwarePolicy: (limit = 50) =>
    request(`/admin/firmware/policy?limit=${limit}`, { method: "GET" }, z.array(firmwarePolicySchema)),

  getFirmwareReleases: (limit = 20) =>
    request(`/admin/firmware/releases?limit=${limit}`, { method: "GET" }, z.array(firmwareReleaseSchema)),

  performDeviceAction: (
    identifier: string,
    input: { action: "remove" | "reboot" | "factory_reset"; actorUserId: string; reason?: string }
  ) =>
    request(
      `/devices/${encodeURIComponent(identifier)}/actions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      deviceActionResultSchema
    ),

  createOtaFromRelease: (identifier: string, input: { version: string; actorUserId: string }) =>
    request(
      `/devices/${encodeURIComponent(identifier)}/ota`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      otaJobSchema.nullable()
    ),
};
