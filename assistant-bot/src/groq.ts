import { z } from "zod";
import { config } from "./config";

const analyticsIntentSchema = z.object({
  intent: z.enum(["get_today_energy", "get_peak_hour", "get_current_voltage", "get_current_power", "get_current_summary", "unknown"]),
  identifier: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type AnalyticsIntent = z.infer<typeof analyticsIntentSchema>;

type AnalyticsSummary = {
  displayName?: string;
  serialNumber: string;
  siteTimezone: string;
  currentVoltage?: number;
  currentPower?: number;
  currentSeenAt?: string;
  todayEnergyKwh?: number;
  peakHourStart?: string;
  peakHourEnd?: string;
  peakHourAveragePower?: number;
  dataStatus: string;
  messages: string[];
};

async function requestGroq(messages: Array<{ role: "system" | "user"; content: string }>): Promise<string | null> {
  if (!config.GROQ_API_KEY) {
    return null;
  }

  const response = await fetch(`${config.GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.GROQ_MODEL,
      temperature: 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  return json.choices?.[0]?.message?.content?.trim() ?? null;
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function fallbackParseAnalyticsIntent(question: string): AnalyticsIntent {
  const text = question.toLowerCase();
  const identifierMatch = question.match(/\b([A-Za-z]{2}\d{3,}|SN\d+)\b/i);
  const identifier = identifierMatch?.[1];

  if ((text.includes("hôm nay") || text.includes("today")) && (text.includes("kwh") || text.includes("kw điện") || text.includes("dùng bao nhiêu") || text.includes("tiêu thụ"))) {
    return { intent: "get_today_energy", identifier, confidence: 0.5 };
  }

  if ((text.includes("giờ nào") || text.includes("khung giờ") || text.includes("when")) && (text.includes("nhiều nhất") || text.includes("cao nhất") || text.includes("peak"))) {
    return { intent: "get_peak_hour", identifier, confidence: 0.5 };
  }

  if (text.includes("điện áp") && (text.includes("công suất") || text.includes("bao nhiêu"))) {
    return { intent: "get_current_summary", identifier, confidence: 0.5 };
  }

  if (text.includes("điện áp")) {
    return { intent: "get_current_voltage", identifier, confidence: 0.5 };
  }

  if (text.includes("công suất") || text.includes("power")) {
    return { intent: "get_current_power", identifier, confidence: 0.5 };
  }

  return { intent: "unknown", confidence: 0 };
}

export async function parseAnalyticsIntent(question: string): Promise<AnalyticsIntent> {
  if (!config.GROQ_API_KEY) {
    return fallbackParseAnalyticsIntent(question);
  }

  try {
    const content = await requestGroq([
      {
        role: "system",
        content:
          "You classify natural-language analytics questions for an IoT power meter assistant. Return only one JSON object with keys: intent, identifier, confidence. Valid intents are get_today_energy, get_peak_hour, get_current_voltage, get_current_power, get_current_summary, unknown. Only set identifier when the user clearly names a serial number, device ID, or display name. Do not invent data.",
      },
      {
        role: "user",
        content: `Question: ${question}`,
      },
    ]);

    if (!content) {
      return fallbackParseAnalyticsIntent(question);
    }

    return analyticsIntentSchema.parse(JSON.parse(extractJsonObject(content)));
  } catch {
    return fallbackParseAnalyticsIntent(question);
  }
}

function formatTimeRange(start: string, end: string, timeZone: string) {
  const startLabel = new Date(start).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone });
  const endLabel = new Date(end).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone });
  return `${startLabel}-${endLabel}`;
}

function buildAnalyticsFacts(intent: AnalyticsIntent["intent"], summary: AnalyticsSummary) {
  const label = summary.displayName ?? summary.serialNumber;
  switch (intent) {
    case "get_today_energy":
      if (summary.todayEnergyKwh === undefined) {
        return `${label}: chưa đủ dữ liệu để tính điện năng tiêu thụ hôm nay theo múi giờ ${summary.siteTimezone}. ${summary.messages.join(" ")}`.trim();
      }
      return `${label}: hôm nay đã tiêu thụ ${summary.todayEnergyKwh.toFixed(3)} kWh theo múi giờ ${summary.siteTimezone}.`;
    case "get_peak_hour":
      if (!summary.peakHourStart || !summary.peakHourEnd || summary.peakHourAveragePower === undefined) {
        return `${label}: chưa đủ dữ liệu để xác định khung giờ có công suất trung bình cao nhất hôm nay theo múi giờ ${summary.siteTimezone}. ${summary.messages.join(" ")}`.trim();
      }
      return `${label}: hôm nay khung giờ có công suất trung bình cao nhất là ${formatTimeRange(summary.peakHourStart, summary.peakHourEnd, summary.siteTimezone)} theo múi giờ ${summary.siteTimezone}, với công suất trung bình ${summary.peakHourAveragePower.toFixed(1)} W.`;
    case "get_current_voltage":
      return `${label}: điện áp hiện tại là ${summary.currentVoltage?.toFixed(1) ?? "không rõ"} V.`;
    case "get_current_power":
      return `${label}: công suất hiện tại là ${summary.currentPower?.toFixed(1) ?? "không rõ"} W.`;
    case "get_current_summary":
      return `${label}: điện áp hiện tại là ${summary.currentVoltage?.toFixed(1) ?? "không rõ"} V và công suất hiện tại là ${summary.currentPower?.toFixed(1) ?? "không rõ"} W.`;
    default:
      return `${label}: ${summary.messages.join(" ")}`.trim();
  }
}

export async function renderAnalyticsAnswer(question: string, intent: AnalyticsIntent["intent"], summary: unknown): Promise<string | null> {
  const fallbackSummary = summary as AnalyticsSummary;
  const facts = buildAnalyticsFacts(intent, fallbackSummary);
  return facts;
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
