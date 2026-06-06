import { config } from "./config";
import {
  analyticsIntentSchema,
  inventoryIntentSchema,
  AnalyticsIntent,
  InventoryIntent,
} from "./groq.types";
import { extractJsonObject } from "./groq.helpers";
import { fallbackParseAnalyticsIntent } from "./groq.fallback.analytics";
import { fallbackParseInventoryIntent } from "./groq.fallback.inventory";
import { requestGroq } from "./groq.request";

export async function parseAnalyticsIntent(question: string): Promise<AnalyticsIntent> {
  const fallback = fallbackParseAnalyticsIntent(question);
  if (!config.GROQ_API_KEY) return fallback;

  try {
    const content = await requestGroq([
      {
        role: "system",
        content:
          "You classify natural-language analytics questions for an IoT power meter assistant. Return only one JSON object with keys: intent, identifier, startDate, endDate, targetDate, confidence. Valid intents are get_today_energy, get_yesterday_energy, get_last_7_days_energy, get_this_week_energy, get_last_week_energy, get_this_month_energy, get_last_month_energy, get_date_range_energy, get_peak_day, get_hourly_breakdown, get_peak_hour, get_current_voltage, get_current_current, get_current_power, get_current_summary, unknown. Use get_date_range_energy only when user explicitly gives start and end dates. Dates must use YYYY-MM-DD. If user gives dd/mm without year, use current year. Use get_current_summary for generic requests like current value or current readings. Only set identifier when user clearly names serial number, device ID, or display name. Do not invent data. Use get_peak_day when the user asks which day had the highest energy usage in the past week. Use get_hourly_breakdown when the user asks for an hourly breakdown table (set targetDate to today, yesterday, or YYYY-MM-DD based on context; default to today).",
      },
      { role: "user", content: `Question: ${question}` },
    ]);

    return content ? analyticsIntentSchema.parse(JSON.parse(extractJsonObject(content))) : fallback;
  } catch {
    return fallback;
  }
}

export async function parseInventoryIntent(question: string): Promise<InventoryIntent> {
  const fallback = fallbackParseInventoryIntent(question);
  if (fallback.intent !== "unknown") return fallback;
  if (!config.GROQ_API_KEY) return fallback;

  try {
    const content = await requestGroq([
      {
        role: "system",
        content:
          "You classify natural-language device inventory questions for an IoT power meter assistant. Return only one JSON object with keys: intent and confidence. Valid intents are get_managed_device_count, get_managed_device_list, get_managed_device_summary, unknown. Use get_managed_device_summary when the user asks both how many devices and what they are called. If the question is about energy consumption, electrical readings, power usage, current, voltage, device status, or firmware, return unknown. Do not invent data.",
      },
      { role: "user", content: `Question: ${question}` },
    ]);

    return content ? inventoryIntentSchema.parse(JSON.parse(extractJsonObject(content))) : fallback;
  } catch {
    return fallback;
  }
}

export async function askGroq(question: string, context: unknown): Promise<string | null> {
  return requestGroq([
    {
      role: "system",
      content:
        "You are an operations assistant for an IoT power monitoring platform. Only answer using the provided context. If the context is missing information, say so directly. Keep answers concise and practical.",
    },
    {
      role: "user",
      content: `Question: ${question}\n\nContext:\n${JSON.stringify(context, null, 2)}`,
    },
  ]);
}

export { renderAnalyticsAnswer } from "./groq.facts";
export { AnalyticsSummary, EnergyAnalyticsSummary, PeakDaySummary, HourlyBreakdown } from "./groq.types";
