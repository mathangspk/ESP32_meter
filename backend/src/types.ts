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
});

export type TelemetryPayload = z.infer<typeof telemetryPayloadSchema>;

export type HealthSnapshot = {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  mqttConnected: boolean;
  mongodbConnected: boolean;
};
