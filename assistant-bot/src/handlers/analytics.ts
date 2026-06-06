import { backendClient, Membership } from "../backend-client";
import { parseAnalyticsIntent, renderAnalyticsAnswer } from "../groq";
import { logger } from "../logger";
import { sendMessage } from "../telegram";
import { previewText } from "../formatters";
import { resolveAccessibleDevice } from "../device-resolver";
import {
  formatAnalyticsFallback,
  formatEnergyAnalyticsFallback,
  formatPeakDayFallback,
  formatHourlyBreakdownFallback,
} from "./analytics.format";

function isEnergyRangeIntent(intent: Awaited<ReturnType<typeof parseAnalyticsIntent>>["intent"]) {
  return [
    "get_today_energy", "get_yesterday_energy", "get_last_7_days_energy", "get_this_week_energy",
    "get_last_week_energy", "get_this_month_energy", "get_last_month_energy", "get_date_range_energy",
  ].includes(intent);
}

function toEnergyQuery(intent: Awaited<ReturnType<typeof parseAnalyticsIntent>>) {
  switch (intent.intent) {
    case "get_today_energy": return { preset: "today" as const };
    case "get_yesterday_energy": return { preset: "yesterday" as const };
    case "get_last_7_days_energy": return { preset: "last_7_days" as const };
    case "get_this_week_energy": return { preset: "this_week" as const };
    case "get_last_week_energy": return { preset: "last_week" as const };
    case "get_this_month_energy": return { preset: "this_month" as const };
    case "get_last_month_energy": return { preset: "last_month" as const };
    case "get_date_range_energy":
      return intent.startDate && intent.endDate ? { startDate: intent.startDate, endDate: intent.endDate } : undefined;
    default: return undefined;
  }
}

export async function handleAnalyticsQuestion(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
  const intent = await parseAnalyticsIntent(text);
  if (intent.intent === "unknown") return false;

  logger.info({
    event: "telegram.analytics_intent", chatId, userId: user.userId, intent: intent.intent,
    identifier: intent.identifier, startDate: intent.startDate, endDate: intent.endDate, textPreview: previewText(text),
  }, "Parsed analytics intent");

  const { devices, device } = await resolveAccessibleDevice(intent.identifier, user, memberships);
  if (devices.length === 0) {
    await sendMessage(chatId, "Khong tim thay thiet bi nao trong pham vi ban co quyen xem.");
    return true;
  }

  if (!device) {
    await sendMessage(
      chatId,
      intent.identifier
        ? "Minh chua xac dinh duoc chinh xac thiet bi ban muon hoi. Hay gui lai serial, device ID, hoac ten thiet bi dung hon."
        : `Ban muon hoi thiet bi nao? Hien co: ${devices.map((candidate) => candidate.displayName ?? candidate.serialNumber).join(", ")}`,
    );
    return true;
  }

  logger.info({
    event: "telegram.analytics_resolved_device", chatId, userId: user.userId, intent: intent.intent,
    requestedIdentifier: intent.identifier, resolvedDeviceId: device.deviceId,
    resolvedSerialNumber: device.serialNumber, resolvedDisplayName: device.displayName,
  }, "Resolved device for analytics question");

  if (isEnergyRangeIntent(intent.intent)) {
    const energyQuery = toEnergyQuery(intent);
    if (!energyQuery) {
      await sendMessage(chatId, "Minh chua hieu ro khoang thoi gian ban muon thong ke. Hay gui lai theo dang tu ngay dd/mm den dd/mm.");
      return true;
    }
    const summary = await backendClient.getDeviceEnergyAnalytics(device.serialNumber, energyQuery);
    const answer = await renderAnalyticsAnswer(text, intent.intent, summary);
    await sendMessage(chatId, answer ?? formatEnergyAnalyticsFallback(summary));
    return true;
  }

  if (intent.intent === "get_peak_day") {
    const summary = await backendClient.getDevicePeakDaySummary(device.serialNumber);
    const answer = await renderAnalyticsAnswer(text, intent.intent, summary);
    await sendMessage(chatId, answer ?? formatPeakDayFallback(summary));
    return true;
  }

  if (intent.intent === "get_hourly_breakdown") {
    const targetDate = intent.targetDate ?? "today";
    const summary = await backendClient.getDeviceHourlyBreakdown(device.serialNumber, targetDate);
    const answer = await renderAnalyticsAnswer(text, intent.intent, summary);
    await sendMessage(chatId, answer ?? formatHourlyBreakdownFallback(summary));
    return true;
  }

  const summary = await backendClient.getDeviceAnalyticsSummary(device.serialNumber);
  const answer = await renderAnalyticsAnswer(text, intent.intent, summary);
  await sendMessage(chatId, answer ?? formatAnalyticsFallback(summary));
  return true;
}
