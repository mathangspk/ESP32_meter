import { EnergyAnalyticsPreset } from "./types";

export const DEFAULT_SITE_TIMEZONE = "Asia/Ho_Chi_Minh";
export const BOUNDARY_MAX_GAP_MS = 5 * 60 * 1000;
export const MIN_VALID_VOLTAGE = 50;

export type TimeRange = {
  rangeStart: Date;
  rangeEnd: Date;
  dayCount: number;
};

export type EnergyRangeOptions = { preset: EnergyAnalyticsPreset } | { startDate: string; endDate: string };

export function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getValue = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: getValue("year"),
    month: getValue("month"),
    day: getValue("day"),
    hour: getValue("hour"),
    minute: getValue("minute"),
    second: getValue("second"),
  };
}

export function zonedDateTimeToUtc(
  parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string,
) {
  const utcGuess = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0, 0),
  );
  const zonedGuess = getTimeZoneParts(utcGuess, timeZone);
  const zonedGuessUtc = Date.UTC(
    zonedGuess.year,
    zonedGuess.month - 1,
    zonedGuess.day,
    zonedGuess.hour,
    zonedGuess.minute,
    zonedGuess.second,
    0,
  );
  return new Date(utcGuess.getTime() - (zonedGuessUtc - utcGuess.getTime()));
}

export function getLocalDayBounds(now: Date, timeZone: string) {
  const localNow = getTimeZoneParts(now, timeZone);
  const dayStart = zonedDateTimeToUtc({ year: localNow.year, month: localNow.month, day: localNow.day }, timeZone);
  const nextDaySeed = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day + 1, 0, 0, 0, 0));
  const nextDayParts = {
    year: nextDaySeed.getUTCFullYear(),
    month: nextDaySeed.getUTCMonth() + 1,
    day: nextDaySeed.getUTCDate(),
  };
  const dayEnd = zonedDateTimeToUtc(nextDayParts, timeZone);
  return { dayStart, dayEnd };
}

export function addLocalDays(date: Date, timeZone: string, amount: number) {
  const parts = getTimeZoneParts(date, timeZone);
  const seed = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount, 0, 0, 0, 0));
  return zonedDateTimeToUtc(
    { year: seed.getUTCFullYear(), month: seed.getUTCMonth() + 1, day: seed.getUTCDate() },
    timeZone,
  );
}

export function getLocalWeekStart(now: Date, timeZone: string) {
  const localNow = getTimeZoneParts(now, timeZone);
  const jsDay = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day)).getUTCDay();
  const daysSinceMonday = (jsDay + 6) % 7;
  return addLocalDays(
    zonedDateTimeToUtc({ year: localNow.year, month: localNow.month, day: localNow.day }, timeZone),
    timeZone,
    -daysSinceMonday,
  );
}

export function getLocalMonthStart(now: Date, timeZone: string) {
  const localNow = getTimeZoneParts(now, timeZone);
  return zonedDateTimeToUtc({ year: localNow.year, month: localNow.month, day: 1 }, timeZone);
}

export function getInclusiveLocalDayCount(rangeStart: Date, rangeEndExclusive: Date, timeZone: string) {
  const start = getTimeZoneParts(rangeStart, timeZone);
  const endSeed = new Date(rangeEndExclusive.getTime() - 1);
  const end = getTimeZoneParts(endSeed, timeZone);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day, 0, 0, 0, 0);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day, 0, 0, 0, 0);
  return Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1;
}

export function resolveEnergyPresetRange(preset: EnergyAnalyticsPreset, now: Date, timeZone: string): TimeRange {
  const { dayStart: todayStart } = getLocalDayBounds(now, timeZone);
  switch (preset) {
    case "today":
      return { rangeStart: todayStart, rangeEnd: now, dayCount: 1 };
    case "yesterday": {
      const yesterdayStart = addLocalDays(todayStart, timeZone, -1);
      return { rangeStart: yesterdayStart, rangeEnd: todayStart, dayCount: 1 };
    }
    case "last_7_days":
      return { rangeStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), rangeEnd: now, dayCount: 7 };
    case "this_week": {
      const weekStart = getLocalWeekStart(now, timeZone);
      return { rangeStart: weekStart, rangeEnd: now, dayCount: getInclusiveLocalDayCount(weekStart, now, timeZone) };
    }
    case "last_week": {
      const thisWeekStart = getLocalWeekStart(now, timeZone);
      const lastWeekStart = addLocalDays(thisWeekStart, timeZone, -7);
      return { rangeStart: lastWeekStart, rangeEnd: thisWeekStart, dayCount: 7 };
    }
    case "this_month": {
      const monthStart = getLocalMonthStart(now, timeZone);
      return { rangeStart: monthStart, rangeEnd: now, dayCount: getInclusiveLocalDayCount(monthStart, now, timeZone) };
    }
    case "last_month": {
      const thisMonthStart = getLocalMonthStart(now, timeZone);
      const lastMonthSeed = new Date(thisMonthStart.getTime() - 1);
      const lastMonthStart = getLocalMonthStart(lastMonthSeed, timeZone);
      return {
        rangeStart: lastMonthStart,
        rangeEnd: thisMonthStart,
        dayCount: getInclusiveLocalDayCount(lastMonthStart, thisMonthStart, timeZone),
      };
    }
  }
}

export function resolveCustomDateRange(startDate: string, endDate: string, timeZone: string): TimeRange {
  const parseDate = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error("Dates must use YYYY-MM-DD format");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
      throw new Error("Invalid date value");
    }
    return { year, month, day };
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const rangeStart = zonedDateTimeToUtc(start, timeZone);
  const endStart = zonedDateTimeToUtc(end, timeZone);
  const rangeEnd = addLocalDays(endStart, timeZone, 1);
  if (rangeEnd <= rangeStart) throw new Error("endDate must be on or after startDate");

  return {
    rangeStart,
    rangeEnd,
    dayCount: getInclusiveLocalDayCount(rangeStart, rangeEnd, timeZone),
  };
}

export function getSegmentEnd(cursor: Date, rangeEnd: Date, timeZone: string) {
  const local = getTimeZoneParts(cursor, timeZone);
  const dayStart = zonedDateTimeToUtc({ year: local.year, month: local.month, day: local.day }, timeZone);
  const nextDayStart = addLocalDays(dayStart, timeZone, 1);
  return nextDayStart < rangeEnd ? nextDayStart : rangeEnd;
}

export function buildRangeSegments(rangeStart: Date, rangeEnd: Date, timeZone: string) {
  const segments: Array<{ start: Date; end: Date }> = [];
  let cursor = rangeStart;
  while (cursor < rangeEnd) {
    const end = getSegmentEnd(cursor, rangeEnd, timeZone);
    segments.push({ start: cursor, end });
    cursor = end;
  }
  return segments;
}
