import { z } from "zod";
import { config } from "./config";

const analyticsIntentSchema = z.object({
  intent: z.enum([
    "get_today_energy",
    "get_yesterday_energy",
    "get_last_7_days_energy",
    "get_this_week_energy",
    "get_last_week_energy",
    "get_this_month_energy",
    "get_last_month_energy",
    "get_date_range_energy",
    "get_peak_hour",
    "get_current_voltage",
    "get_current_current",
    "get_current_power",
    "get_current_summary",
    "unknown",
  ]),
  identifier: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
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

type EnergyAnalyticsSummary = {
  displayName?: string;
  serialNumber: string;
  siteTimezone: string;
  rangeStart: string;
  rangeEnd: string;
  preset?: "today" | "yesterday" | "last_7_days" | "this_week" | "last_week" | "this_month" | "last_month";
  requestedStartDate?: string;
  requestedEndDate?: string;
  dayCount: number;
  energyKwh?: number;
  averageDailyKwh?: number;
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

function normalizeVietnameseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function extractIdentifier(question: string): string | undefined {
  const identifierMatch = question.match(/\b([A-Fa-f0-9]{8,}|[A-Za-z]{2}\d{3,}|SN\d+)\b/);
  return identifierMatch?.[1];
}

function cleanIdentifierCandidate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const cleaned = value
    .replace(/^(?:cua|device|thiet bi)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || undefined;
}

function extractNamedDeviceFromEnergyQuestion(text: string) {
  const patterns = [
    /^(?:hom nay|hom qua|7 ngay qua|bay ngay qua|tuan nay|tuan truoc|thang nay|thang truoc)\s+(.+?)\s+(?:dung bao nhieu dien|xai bao nhieu dien|tieu thu bao nhieu dien|tieu thu bao nhieu|bao nhieu dien|bao nhieu kwh)$/,
    /^tu(?: ngay)?\s+\d{1,2}\/\d{1,2}(?:\/\d{4})?\s+den(?: ngay)?\s+\d{1,2}\/\d{1,2}(?:\/\d{4})?\s+(.+?)\s+(?:dung bao nhieu dien|xai bao nhieu dien|tieu thu bao nhieu dien|tieu thu bao nhieu|bao nhieu dien|bao nhieu kwh)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const cleaned = cleanIdentifierCandidate(match?.[1]);
    if (cleaned) {
      return cleaned;
    }
  }

  return undefined;
}

function extractDateMatches(text: string) {
  return Array.from(text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/g));
}

function formatIsoDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function resolveDateToken(dayText: string, monthText: string, yearText: string | undefined, now = new Date()) {
  const day = Number(dayText);
  const month = Number(monthText);
  const year = yearText ? Number(yearText) : now.getFullYear();
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return undefined;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
    return undefined;
  }

  return formatIsoDate(year, month, day);
}

function fallbackParseAnalyticsIntent(question: string): AnalyticsIntent {
  const text = normalizeVietnameseText(question);
  const identifier = extractIdentifier(question) ?? extractNamedDeviceFromEnergyQuestion(text);
  const dateMatches = extractDateMatches(text);

  if ((text.includes("tu ngay") || text.includes("tu ")) && text.includes(" den ") && dateMatches.length >= 2) {
    const startDate = resolveDateToken(dateMatches[0][1], dateMatches[0][2], dateMatches[0][3]);
    const endDate = resolveDateToken(dateMatches[1][1], dateMatches[1][2], dateMatches[1][3]);
    if (startDate && endDate) {
      return { intent: "get_date_range_energy", identifier, startDate, endDate, confidence: 0.6 };
    }
  }

  if ((text.includes("7 ngay qua") || text.includes("bay ngay qua") || text.includes("7 days")) && asksEnergy(text)) {
    return { intent: "get_last_7_days_energy", identifier, confidence: 0.6 };
  }

  if (text.includes("tuan truoc") && asksEnergy(text)) {
    return { intent: "get_last_week_energy", identifier, confidence: 0.6 };
  }

  if (text.includes("tuan nay") && asksEnergy(text)) {
    return { intent: "get_this_week_energy", identifier, confidence: 0.6 };
  }

  if (text.includes("thang truoc") && asksEnergy(text)) {
    return { intent: "get_last_month_energy", identifier, confidence: 0.6 };
  }

  if (text.includes("thang nay") && asksEnergy(text)) {
    return { intent: "get_this_month_energy", identifier, confidence: 0.6 };
  }

  if ((text.includes("hom qua") || text.includes("yesterday")) && asksEnergy(text)) {
    return { intent: "get_yesterday_energy", identifier, confidence: 0.6 };
  }

  if ((text.includes("hom nay") || text.includes("today")) && asksEnergy(text)) {
    return { intent: "get_today_energy", identifier, confidence: 0.6 };
  }

  if ((text.includes("gio nao") || text.includes("khung gio") || text.includes("when")) && (text.includes("nhieu nhat") || text.includes("cao nhat") || text.includes("peak"))) {
    return { intent: "get_peak_hour", identifier, confidence: 0.5 };
  }

  if (
    identifier &&
    (text.includes("gia tri hien tai") || text.includes("hien tai cua") || text.includes("current value"))
  ) {
    return { intent: "get_current_summary", identifier, confidence: 0.5 };
  }

  if (text.includes("dien ap") && (text.includes("cong suat") || text.includes("bao nhieu"))) {
    return { intent: "get_current_summary", identifier, confidence: 0.5 };
  }

  if (text.includes("dong dien") || text.includes("ampe") || text.includes("ampere") || text.includes("current")) {
    return { intent: "get_current_current", identifier, confidence: 0.5 };
  }

  if (text.includes("dien ap")) {
    return { intent: "get_current_voltage", identifier, confidence: 0.5 };
  }

  if (text.includes("cong suat") || text.includes("power")) {
    return { intent: "get_current_power", identifier, confidence: 0.5 };
  }

  return { intent: "unknown", confidence: 0 };
}

function asksEnergy(text: string) {
  return (
    text.includes("bao nhieu dien") ||
    text.includes("dung bao nhieu") ||
    text.includes("tieu thu") ||
    text.includes("kwh") ||
    text.includes("dien nang") ||
    text.includes("xai bao nhieu")
  );
}

export async function parseAnalyticsIntent(question: string): Promise<AnalyticsIntent> {
  const fallback = fallbackParseAnalyticsIntent(question);
  if (!config.GROQ_API_KEY) {
    return fallback;
  }

  try {
    const content = await requestGroq([
      {
        role: "system",
        content:
          "You classify natural-language analytics questions for an IoT power meter assistant. Return only one JSON object with keys: intent, identifier, startDate, endDate, confidence. Valid intents are get_today_energy, get_yesterday_energy, get_last_7_days_energy, get_this_week_energy, get_last_week_energy, get_this_month_energy, get_last_month_energy, get_date_range_energy, get_peak_hour, get_current_voltage, get_current_current, get_current_power, get_current_summary, unknown. Use get_date_range_energy only when user explicitly gives start and end dates. Dates must use YYYY-MM-DD. If user gives dd/mm without year, use current year. Use get_current_summary for generic requests like current value or current readings. Only set identifier when user clearly names serial number, device ID, or display name. Do not invent data.",
      },
      {
        role: "user",
        content: `Question: ${question}`,
      },
    ]);

    if (!content) {
      return fallback;
    }

    return analyticsIntentSchema.parse(JSON.parse(extractJsonObject(content)));
  } catch {
    return fallback;
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
  const asksManagedScope = text.includes("quản lý") || text.includes("quan ly") || text.includes("my devices") || text.includes("managed devices");

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

function formatDateRangeLabel(summary: EnergyAnalyticsSummary) {
  if (summary.preset === "today") {
    return "hom nay tu 00:00 den hien tai";
  }
  if (summary.preset === "yesterday") {
    return "hom qua";
  }
  if (summary.preset === "last_7_days") {
    return "7 ngay qua";
  }
  if (summary.preset === "this_week") {
    return "tuan nay";
  }
  if (summary.preset === "last_week") {
    return "tuan truoc";
  }
  if (summary.preset === "this_month") {
    return "thang nay";
  }
  if (summary.preset === "last_month") {
    return "thang truoc";
  }

  if (summary.requestedStartDate && summary.requestedEndDate) {
    const [startYear, startMonth, startDay] = summary.requestedStartDate.split("-");
    const [endYear, endMonth, endDay] = summary.requestedEndDate.split("-");
    return `tu ${startDay}/${startMonth}/${startYear} den ${endDay}/${endMonth}/${endYear}`;
  }

  return "khoang da chon";
}

function buildAnalyticsFacts(intent: AnalyticsIntent["intent"], summary: AnalyticsSummary | EnergyAnalyticsSummary) {
  const label = summary.displayName ?? summary.serialNumber;
  switch (intent) {
    case "get_today_energy":
    case "get_yesterday_energy":
    case "get_this_week_energy":
    case "get_this_month_energy":
    case "get_last_7_days_energy":
    case "get_last_week_energy":
    case "get_last_month_energy":
    case "get_date_range_energy": {
      const energySummary = summary as EnergyAnalyticsSummary;
      const labelRange = formatDateRangeLabel(energySummary);
      if (energySummary.energyKwh === undefined) {
        return `${label}: chua du du lieu tin cay de tinh dien nang cho ${labelRange}. Mui gio ${energySummary.siteTimezone}.`;
      }

      const withAverage =
        energySummary.preset === "last_7_days" ||
        energySummary.preset === "last_week" ||
        energySummary.preset === "last_month" ||
        (!energySummary.preset && energySummary.averageDailyKwh !== undefined);

      return withAverage && energySummary.averageDailyKwh !== undefined
        ? `${label}: ${labelRange} da dung ${energySummary.energyKwh.toFixed(3)} kWh, trung binh ${energySummary.averageDailyKwh.toFixed(3)} kWh/ngay. Mui gio ${energySummary.siteTimezone}.`
        : `${label}: ${labelRange} da dung ${energySummary.energyKwh.toFixed(3)} kWh. Mui gio ${energySummary.siteTimezone}.`;
    }
    case "get_peak_hour": {
      const analyticsSummary = summary as AnalyticsSummary;
      if (!analyticsSummary.peakHourStart || !analyticsSummary.peakHourEnd || analyticsSummary.peakHourAveragePower === undefined) {
        return `${label}: chưa đủ dữ liệu để xác định khung giờ có công suất trung bình cao nhất hôm nay theo múi giờ ${analyticsSummary.siteTimezone}. ${analyticsSummary.messages.join(" ")}`.trim();
      }
      return `${label}: hôm nay khung giờ có công suất trung bình cao nhất là ${formatTimeRange(analyticsSummary.peakHourStart, analyticsSummary.peakHourEnd, analyticsSummary.siteTimezone)} theo múi giờ ${analyticsSummary.siteTimezone}, với công suất trung bình ${analyticsSummary.peakHourAveragePower.toFixed(1)} W.`;
    }
    case "get_current_voltage": {
      const analyticsSummary = summary as AnalyticsSummary;
      return `${label}: điện áp hiện tại là ${analyticsSummary.currentVoltage?.toFixed(1) ?? "không rõ"} V.`;
    }
    case "get_current_current": {
      const analyticsSummary = summary as AnalyticsSummary;
      return `${label}: dòng điện hiện tại là ${analyticsSummary.currentCurrent?.toFixed(3) ?? "không rõ"} A.`;
    }
    case "get_current_power": {
      const analyticsSummary = summary as AnalyticsSummary;
      return `${label}: công suất hiện tại là ${analyticsSummary.currentPower?.toFixed(1) ?? "không rõ"} W.`;
    }
    case "get_current_summary": {
      const analyticsSummary = summary as AnalyticsSummary;
      return `${label}: điện áp hiện tại là ${analyticsSummary.currentVoltage?.toFixed(1) ?? "không rõ"} V, dòng điện hiện tại là ${analyticsSummary.currentCurrent?.toFixed(3) ?? "không rõ"} A và công suất hiện tại là ${analyticsSummary.currentPower?.toFixed(1) ?? "không rõ"} W.`;
    }
    default:
      return `${label}: ${summary.messages.join(" ")}`.trim();
  }
}

export async function renderAnalyticsAnswer(question: string, intent: AnalyticsIntent["intent"], summary: unknown): Promise<string | null> {
  const facts = buildAnalyticsFacts(intent, summary as AnalyticsSummary | EnergyAnalyticsSummary);
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
