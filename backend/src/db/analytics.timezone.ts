export const DEFAULT_SITE_TIMEZONE = "Asia/Ho_Chi_Minh";

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
