import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),
  MQTT_URL: z.string().min(1),
  MQTT_USERNAME: z.string().optional().default(""),
  MQTT_PASSWORD: z.string().optional().default(""),
  MQTT_TOPIC_PATTERN: z.string().default("meter/+/data"),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),
  OFFLINE_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(45),
  CHECK_INTERVAL_SECONDS: z.coerce.number().int().positive().default(10),
  PLATFORM_ADMIN_USER_ID: z.string().default("platform-admin"),
  PLATFORM_ADMIN_TELEGRAM_ID: z.string().optional().default(""),
  PLATFORM_ADMIN_DISPLAY_NAME: z.string().default("Platform Admin"),
  BOOTSTRAP_TENANT_ID: z.string().default("tenant-default"),
  BOOTSTRAP_TENANT_NAME: z.string().default("Default Tenant"),
  BOOTSTRAP_SITE_ID: z.string().default("site-default"),
  BOOTSTRAP_SITE_NAME: z.string().default("Default Site"),
  BOOTSTRAP_FIRMWARE_VERSION: z.string().default("1.0.0"),
  BOOTSTRAP_FIRMWARE_BOARD_TYPE: z.string().default(""),
});

export const config = envSchema.parse(process.env);
