import { AnalyticsIntent } from "./groq.types";
import { extractIdentifier } from "./groq.helpers";
import { normalizeVietnameseText, extractNamedDeviceFromEnergyQuestion, extractDateMatches, resolveDateToken, asksEnergy } from "./groq.helpers.nlp";


export function fallbackParseAnalyticsIntent(question: string): AnalyticsIntent {
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

  if (text.includes("tuan qua") && asksEnergy(text)) {
    return { intent: "get_last_7_days_energy", identifier, confidence: 0.6 };
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

  if (
    (text.includes("ngay nao") || text.includes("ngay nhieu nhat") || text.includes("nhieu dien nhat")) &&
    (text.includes("tuan") || text.includes("7 ngay") || text.includes("week")) &&
    asksEnergy(text)
  ) {
    return { intent: "get_peak_day", identifier, confidence: 0.6 };
  }

  if (
    text.includes("theo gio") ||
    text.includes("bang gio") ||
    text.includes("tung gio") ||
    text.includes("hourly") ||
    text.includes("gio nao dung bao nhieu")
  ) {
    const targetDate = text.includes("hom qua") || text.includes("yesterday") ? "yesterday" : "today";
    return { intent: "get_hourly_breakdown", identifier, targetDate, confidence: 0.6 };
  }

  return { intent: "unknown", confidence: 0 };
}
