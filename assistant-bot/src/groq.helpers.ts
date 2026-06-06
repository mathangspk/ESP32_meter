import { EnergyAnalyticsSummary } from "./groq.types";

export function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) return fencedMatch[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

export function extractIdentifier(question: string): string | undefined {
  const identifierMatch = question.match(/\b([A-Fa-f0-9]{8,}|[A-Za-z]{2}\d{3,}|SN\d+)\b/);
  return identifierMatch?.[1];
}

export function formatTimeRange(start: string, end: string, timeZone: string): string {
  const startLabel = new Date(start).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone });
  const endLabel = new Date(end).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone });
  return `${startLabel}-${endLabel}`;
}

export function formatDateRangeLabel(summary: EnergyAnalyticsSummary): string {
  if (summary.preset === "today") return "hom nay tu 00:00 den hien tai";
  if (summary.preset === "yesterday") return "hom qua";
  if (summary.preset === "last_7_days") return "7 ngay qua";
  if (summary.preset === "this_week") return "tuan nay";
  if (summary.preset === "last_week") return "tuan truoc";
  if (summary.preset === "this_month") return "thang nay";
  if (summary.preset === "last_month") return "thang truoc";

  if (summary.requestedStartDate && summary.requestedEndDate) {
    const [, startMonth, startDay] = summary.requestedStartDate.split("-");
    const [, endMonth, endDay] = summary.requestedEndDate.split("-");
    const startYear = summary.requestedStartDate.split("-")[0];
    const endYear = summary.requestedEndDate.split("-")[0];
    return `tu ${startDay}/${startMonth}/${startYear} den ${endDay}/${endMonth}/${endYear}`;
  }
  return "khoang da chon";
}
