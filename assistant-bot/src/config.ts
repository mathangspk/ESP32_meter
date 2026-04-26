import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("info"),
  BACKEND_BASE_URL: z.string().url(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(3000),
  NOTIFICATION_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  GROQ_BASE_URL: z.string().url().default("https://api.groq.com/openai/v1"),
});

export const config = envSchema.parse(process.env);
