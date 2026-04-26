import { z } from "zod";

export const telemetryPayloadSchema = z.object({
  serial_number: z.string().min(1),
  device_id: z.string().min(1),
  voltage: z.number(),
  current: z.number(),
  power: z.number(),
  energy: z.number(),
  ip_address: z.string().min(1),
  timestamp: z.string().min(1),
  firmware_version: z.string().min(1),
  mac_address: z.string().min(1).optional(),
  chip_family: z.string().min(1).optional(),
  chip_model: z.string().min(1).optional(),
  board_type: z.string().min(1).optional(),
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;

export const firmwareReleaseSeveritySchema = z.enum(["optional", "recommended", "required"]);
export type FirmwareReleaseSeverity = z.infer<typeof firmwareReleaseSeveritySchema>;

export const firmwareSupportStatusSchema = z.enum(["supported", "deprecated", "unsupported"]);
export type FirmwareSupportStatus = z.infer<typeof firmwareSupportStatusSchema>;

export const firmwareReleaseRequestSchema = z.object({
  version: z.string().min(1),
  severity: firmwareReleaseSeveritySchema.default("optional"),
  supportStatus: firmwareSupportStatusSchema.default("supported"),
  url: z.string().url().optional(),
  sha256: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
  chipFamily: z.string().min(1).optional(),
  chipModel: z.string().min(1).optional(),
  boardType: z.string().min(1).optional(),
  releasedAt: z.string().datetime().optional(),
});

export type FirmwareReleaseRequest = z.infer<typeof firmwareReleaseRequestSchema>;

export const deviceActionSchema = z.enum(["remove", "reboot", "factory_reset"]);
export type DeviceAction = z.infer<typeof deviceActionSchema>;

export const deviceActionRequestSchema = z.object({
  action: deviceActionSchema,
  actorUserId: z.string().min(1),
  reason: z.string().min(1).optional(),
});

export type DeviceActionRequest = z.infer<typeof deviceActionRequestSchema>;

export const otaCommandRequestSchema = z.object({
  device_id: z.string().min(1),
  serial_number: z.string().min(1),
  version: z.string().min(1),
  url: z.string().url(),
  sha256: z.string().min(1).optional(),
});

export type OtaCommandRequest = z.infer<typeof otaCommandRequestSchema>;

export const otaCommandPayloadSchema = otaCommandRequestSchema.extend({
  job_id: z.string().min(1),
});

export type OtaCommandPayload = z.infer<typeof otaCommandPayloadSchema>;

export const otaStatusSchema = z.enum(["received", "downloading", "success", "failed"]);

export type OtaStatus = z.infer<typeof otaStatusSchema>;

export const otaStatusPayloadSchema = z.object({
  job_id: z.string().min(1),
  device_id: z.string().min(1),
  serial_number: z.string().min(1),
  status: otaStatusSchema,
  message: z.string().min(1),
  current_version: z.string().min(1),
  target_version: z.string().min(1).optional().default(""),
  timestamp: z.string().min(1),
});

export type OtaStatusPayload = z.infer<typeof otaStatusPayloadSchema>;

export type HealthSnapshot = {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  mqttConnected: boolean;
  mongodbConnected: boolean;
};
