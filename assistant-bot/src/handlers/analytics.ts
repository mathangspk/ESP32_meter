import { backendClient, Membership } from "../backend-client";
import { parseAnalyticsIntent, renderAnalyticsAnswer } from "../groq";
import { logger } from "../logger";
import { sendMessage } from "../telegram";
import { previewText } from "../formatters";
import { resolveAccessibleDevice } from "../device-resolver";

function formatAnalyticsFallback(summary: Awaited<ReturnType<typeof backendClient.getDeviceAnalyticsSummary>>): string {
  const label = summary.displayName ?? summary.serialNumber;
  const parts = [
    `${label} dang dung mui gio ${summary.siteTimezone}.`,
    summary.currentVoltage !== undefined ? `Dien ap hien tai khoang ${summary.currentVoltage.toFixed(1)} V.` : undefined,
    summary.currentPower !== undefined ? `Cong suat hien tai khoang ${summary.currentPower.toFixed(1)} W.` : undefined,
    summary.todayEnergyKwh !== undefined ? `Hom nay da dung khoang ${summary.todayEnergyKwh.toFixed(3)} kWh.` : undefined,
    summary.peakHourStart && summary.peakHourEnd && summary.peakHourAveragePower !== undefined
      ? `Khung gio dung dien nhieu nhat hom nay la ${new Date(summary.peakHourStart).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: summary.siteTimezone })}-${new Date(summary.peakHourEnd).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: summary.siteTimezone })}, cong suat trung binh khoang ${summary.peakHourAveragePower.toFixed(1)} W.`
      : undefined,
    ...summary.messages,
  ];

  return parts.filter(Boolean).join(" ");
}

function formatEnergyAnalyticsFallback(summary: Awaited<ReturnType<typeof backendClient.getDeviceEnergyAnalytics>>): string {
  const label = summary.displayName ?? summary.serialNumber;
  const labelRange = summary.requestedStartDate && summary.requestedEndDate
    ? `Tu ${summary.requestedStartDate} den ${summary.requestedEndDate}`
    : summary.preset === "today"
      ? "Hom nay tu 00:00 den hien tai"
      : summary.preset === "yesterday"
        ? "Hom qua"
        : summary.preset === "last_7_days"
          ? "7 ngay qua"
          : summary.preset === "this_week"
            ? "Tuan nay"
            : summary.preset === "last_week"
              ? "Tuan truoc"
              : summary.preset === "this_month"
                ? "Thang nay"
                : summary.preset === "last_month"
                  ? "Thang truoc"
                  : "Khoang da chon";

  if (summary.energyKwh === undefined) {
    return `${label}: chua du du lieu tin cay de tinh dien nang cho ${labelRange.toLowerCase()}. Mui gio ${summary.siteTimezone}.`;
  }

  const withAverage =
    summary.preset === "last_7_days" ||
    summary.preset === "last_week" ||
    summary.preset === "last_month" ||
    (!summary.preset && summary.averageDailyKwh !== undefined);

  return withAverage && summary.averageDailyKwh !== undefined
    ? `${label}: ${labelRange.toLowerCase()} da dung ${summary.energyKwh.toFixed(3)} kWh, trung binh ${summary.averageDailyKwh.toFixed(3)} kWh/ngay. Mui gio ${summary.siteTimezone}.`
    : `${label}: ${labelRange.toLowerCase()} da dung ${summary.energyKwh.toFixed(3)} kWh. Mui gio ${summary.siteTimezone}.`;
}

function isEnergyRangeIntent(intent: Awaited<ReturnType<typeof parseAnalyticsIntent>>["intent"]) {
  return [
    "get_today_energy",
    "get_yesterday_energy",
    "get_last_7_days_energy",
    "get_this_week_energy",
    "get_last_week_energy",
    "get_this_month_energy",
    "get_last_month_energy",
    "get_date_range_energy",
  ].includes(intent);
}

function toEnergyQuery(intent: Awaited<ReturnType<typeof parseAnalyticsIntent>>) {
  switch (intent.intent) {
    case "get_today_energy":
      return { preset: "today" as const };
    case "get_yesterday_energy":
      return { preset: "yesterday" as const };
    case "get_last_7_days_energy":
      return { preset: "last_7_days" as const };
    case "get_this_week_energy":
      return { preset: "this_week" as const };
    case "get_last_week_energy":
      return { preset: "last_week" as const };
    case "get_this_month_energy":
      return { preset: "this_month" as const };
    case "get_last_month_energy":
      return { preset: "last_month" as const };
    case "get_date_range_energy":
      return intent.startDate && intent.endDate ? { startDate: intent.startDate, endDate: intent.endDate } : undefined;
    default:
      return undefined;
  }
}

export async function handleAnalyticsQuestion(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
  const intent = await parseAnalyticsIntent(text);
  if (intent.intent === "unknown") {
    return false;
  }

  logger.info(
    {
      event: "telegram.analytics_intent",
      chatId,
      userId: user.userId,
      intent: intent.intent,
      identifier: intent.identifier,
      startDate: intent.startDate,
      endDate: intent.endDate,
      textPreview: previewText(text),
    },
    "Parsed analytics intent",
  );

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

  logger.info(
    {
      event: "telegram.analytics_resolved_device",
      chatId,
      userId: user.userId,
      intent: intent.intent,
      requestedIdentifier: intent.identifier,
      resolvedDeviceId: device.deviceId,
      resolvedSerialNumber: device.serialNumber,
      resolvedDisplayName: device.displayName,
    },
    "Resolved device for analytics question",
  );

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

  const summary = await backendClient.getDeviceAnalyticsSummary(device.serialNumber);
  const answer = await renderAnalyticsAnswer(text, intent.intent, summary);
  await sendMessage(chatId, answer ?? formatAnalyticsFallback(summary));
  return true;
}
