import { z } from "zod";
import { config } from "./config";

const analyticsIntentSchema = z.object({
  intent: z.enum(["get_today_energy", "get_peak_hour", "get_current_voltage", "get_current_current", "get_current_power", "get_current_summary", "unknown"]),
  identifier: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const inventoryIntentSchema = z.object({
  intent: z.enum(["get_managed_device_count", "get_managed_device_list", "get_managed_device_summary", "unknown"]),
  confidence: z.number().min(0).max(1).optional(),
});

export type AnalyticsIntent = z.infer<typeof analyticsIntentSchema>;
export type InventoryIntent = z.infer<typeof inventoryIntentSchema>;

type AnalyticsSummary = {
  displayName?: string;
  serialNumber: string;
  siteTimezone: string;
  currentVoltage?: number;
  currentCurrent?: number;
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
  const identifierMatch = question.match(/\b([A-Fa-f0-9]{8,}|[A-Za-z]{2}\d{3,}|SN\d+)\b/);
  const identifier = identifierMatch?.[1];

  if ((text.includes("hôm nay") || text.includes("today")) && (text.includes("kwh") || text.includes("kw điện") || text.includes("dùng bao nhiêu") || text.includes("tiêu thụ"))) {
    return { intent: "get_today_energy", identifier, confidence: 0.5 };
  }

  if ((text.includes("giờ nào") || text.includes("khung giờ") || text.includes("when")) && (text.includes("nhiều nhất") || text.includes("cao nhất") || text.includes("peak"))) {
    return { intent: "get_peak_hour", identifier, confidence: 0.5 };
  }

  if (
    identifier &&
    (text.includes("giá trị hiện tại") ||
      text.includes("gia tri hien tai") ||
      text.includes("hiện tại của") ||
      text.includes("hien tai cua") ||
      text.includes("current value"))
  ) {
    return { intent: "get_current_summary", identifier, confidence: 0.5 };
  }

  if (text.includes("điện áp") && (text.includes("công suất") || text.includes("bao nhiêu"))) {
    return { intent: "get_current_summary", identifier, confidence: 0.5 };
  }

  if (text.includes("dòng điện") || text.includes("dong dien") || text.includes("ampe") || text.includes("ampere") || text.includes("current")) {
    return { intent: "get_current_current", identifier, confidence: 0.5 };
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
          "You classify natural-language analytics questions for an IoT power meter assistant. Return only one JSON object with keys: intent, identifier, confidence. Valid intents are get_today_energy, get_peak_hour, get_current_voltage, get_current_current, get_current_power, get_current_summary, unknown. Use get_current_summary for generic requests like current value or current readings. Only set identifier when the user clearly names a serial number, device ID, or display name. Do not invent data.",
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

function fallbackParseInventoryIntent(question: string): InventoryIntent {
  const text = question.toLowerCase();
  const asksSpecificDeviceDetail =
    text.includes("thông tin thiết bị") ||
    text.includes("thong tin thiet bi") ||
    text.includes("thông tin device") ||
    text.includes("thong tin device") ||
    text.includes("xem thiết bị") ||
    text.includes("xem thiet bi") ||
    text.startsWith("xem ") ||
    text.startsWith("toi muon xem ");
  const asksMeasurement =
    text.includes("giá trị") ||
    text.includes("gia tri") ||
    text.includes("hiện tại") ||
    text.includes("hien tai") ||
    text.includes("điện áp") ||
    text.includes("dien ap") ||
    text.includes("công suất") ||
    text.includes("cong suat") ||
    text.includes("dòng") ||
    text.includes("dong") ||
    text.includes("current") ||
    text.includes("power") ||
    text.includes("voltage");
  const asksCount = text.includes("bao nhiêu thiết bị") || text.includes("bao nhieu thiet bi") || text.includes("how many devices");
  const asksNames =
    text.includes("tên gì") ||
    text.includes("ten gi") ||
    text.includes("thiết bị nào") ||
    text.includes("thiet bi nao") ||
    text.includes("danh sách thiết bị") ||
    text.includes("danh sach thiet bi") ||
    text.includes("list devices") ||
    text.includes("device names");
  const asksManagedScope =
    text.includes("quản lý") || text.includes("quan ly") || text.includes("my devices") || text.includes("managed devices");

  if (asksMeasurement || asksSpecificDeviceDetail) {
    return { intent: "unknown", confidence: 0 };
  }

  if ((asksCount && asksNames) || (asksManagedScope && asksNames)) {
    return { intent: "get_managed_device_summary", confidence: 0.5 };
  }

  if (asksNames) {
    return { intent: "get_managed_device_list", confidence: 0.5 };
  }

  if (asksCount || asksManagedScope) {
    return { intent: "get_managed_device_count", confidence: 0.5 };
  }

  return { intent: "unknown", confidence: 0 };
}

export async function parseInventoryIntent(question: string): Promise<InventoryIntent> {
  const fallback = fallbackParseInventoryIntent(question);
  if (fallback.intent !== "unknown") {
    return fallback;
  }

  if (!config.GROQ_API_KEY) {
    return fallback;
  }

  try {
    const content = await requestGroq([
      {
        role: "system",
        content:
          "You classify natural-language device inventory questions for an IoT power meter assistant. Return only one JSON object with keys: intent and confidence. Valid intents are get_managed_device_count, get_managed_device_list, get_managed_device_summary, unknown. Use get_managed_device_summary when the user asks both how many devices and what they are called. Do not invent data.",
      },
      {
        role: "user",
        content: `Question: ${question}`,
      },
    ]);

    if (!content) {
      return fallback;
    }

    return inventoryIntentSchema.parse(JSON.parse(extractJsonObject(content)));
  } catch {
    return fallback;
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
    case "get_current_current":
      return `${label}: dòng điện hiện tại là ${summary.currentCurrent?.toFixed(3) ?? "không rõ"} A.`;
    case "get_current_power":
      return `${label}: công suất hiện tại là ${summary.currentPower?.toFixed(1) ?? "không rõ"} W.`;
    case "get_current_summary":
      return `${label}: điện áp hiện tại là ${summary.currentVoltage?.toFixed(1) ?? "không rõ"} V, dòng điện hiện tại là ${summary.currentCurrent?.toFixed(3) ?? "không rõ"} A và công suất hiện tại là ${summary.currentPower?.toFixed(1) ?? "không rõ"} W.`;
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
