import { EnergyAnalyticsPreset } from "./types";
import { TimeRange } from "./analytics";
import {
  getLocalDayBounds,
  addLocalDays,
  getLocalWeekStart,
  getLocalMonthStart,
  getInclusiveLocalDayCount,
  zonedDateTimeToUtc,
  getTimeZoneParts,
} from "./analytics.timezone";

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
