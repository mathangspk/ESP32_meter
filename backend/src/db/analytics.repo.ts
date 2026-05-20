import { Collection, Db } from "mongodb";
import {
  DEFAULT_SITE_TIMEZONE,
  BOUNDARY_MAX_GAP_MS,
  MIN_VALID_VOLTAGE,
  EnergyRangeOptions,
  TimeRange,
  buildRangeSegments,
  getLocalDayBounds,
  addLocalDays,
  getTimeZoneParts,
  zonedDateTimeToUtc,
  resolveEnergyPresetRange,
  resolveCustomDateRange,
} from "./analytics";
import { DeviceRepo } from "./device.repo";
import {
  DeviceAnalyticsSummary,
  DeviceEnergyAnalyticsSummary,
  DevicePeakDaySummary,
  DeviceHourlyBreakdown,
  DeviceStateRecord,
  SiteRecord,
  TelemetryHourlyRecord,
  TelemetryRecord,
} from "./types";

type BoundaryTelemetrySnapshot = Pick<TelemetryRecord, "timestamp" | "energy" | "voltage" | "current" | "power">;

type BoundaryResolution =
  | { status: "ok"; sample: BoundaryTelemetrySnapshot; mode: "at_or_before" | "after_fallback" | "hourly_fallback" }
  | { status: "missing"; reason: string };

export class AnalyticsRepo {
  private telemetry: Collection<TelemetryRecord>;
  private deviceStates: Collection<DeviceStateRecord>;
  private sites: Collection<SiteRecord>;
  private telemetryHourly: Collection<TelemetryHourlyRecord>;
  private deviceRepo: DeviceRepo;

  constructor(db: Db, deviceRepo: DeviceRepo) {
    this.telemetry = db.collection<TelemetryRecord>("telemetry");
    this.deviceStates = db.collection<DeviceStateRecord>("device_states");
    this.sites = db.collection<SiteRecord>("sites");
    this.telemetryHourly = db.collection<TelemetryHourlyRecord>("telemetry_hourly");
    this.deviceRepo = deviceRepo;
  }

  async getDeviceAnalyticsSummary(identifier: string): Promise<DeviceAnalyticsSummary | null> {
    const device = await this.deviceRepo.getDeviceHealth(identifier);
    if (!device) return null;

    const site = device.siteId ? await this.sites.findOne({ siteId: device.siteId }) : null;
    const siteTimezone = site?.timezone || DEFAULT_SITE_TIMEZONE;
    const { dayStart, dayEnd } = getLocalDayBounds(new Date(), siteTimezone);

    const [firstTelemetry, lastTelemetry, peakHourRows, sampleCount] = await Promise.all([
      this.telemetry.findOne(
        { serialNumber: device.serialNumber, timestamp: { $gte: dayStart, $lt: dayEnd } },
        { sort: { timestamp: 1 } },
      ),
      this.telemetry.findOne(
        { serialNumber: device.serialNumber, timestamp: { $gte: dayStart, $lt: dayEnd } },
        { sort: { timestamp: -1 } },
      ),
      this.telemetry
        .aggregate<{ hourStart: Date; averagePower: number }>([
          { $match: { serialNumber: device.serialNumber, timestamp: { $gte: dayStart, $lt: dayEnd } } },
          {
            $group: {
              _id: { $dateTrunc: { date: "$timestamp", unit: "hour", timezone: siteTimezone } },
              averagePower: { $avg: "$power" },
            },
          },
          { $project: { _id: 0, hourStart: "$_id", averagePower: 1 } },
          { $sort: { averagePower: -1, hourStart: 1 } },
          { $limit: 1 },
        ])
        .toArray(),
      this.telemetry.countDocuments({
        serialNumber: device.serialNumber,
        timestamp: { $gte: dayStart, $lt: dayEnd },
      }),
    ]);

    const messages: string[] = [];
    let todayEnergyKwh: number | undefined;
    let dataStatus: DeviceAnalyticsSummary["dataStatus"] = "ok";

    if (!firstTelemetry || !lastTelemetry || sampleCount < 2) {
      dataStatus = "insufficient_data";
      messages.push("Not enough telemetry samples are available for today yet.");
    } else {
      const delta = lastTelemetry.energy - firstTelemetry.energy;
      if (delta < 0) {
        dataStatus = "counter_reset_detected";
        messages.push("Energy counter appears to have reset during the selected day.");
      } else {
        todayEnergyKwh = Number(delta.toFixed(3));
      }
    }

    if (!site?.timezone) {
      messages.push(`Site timezone is missing, so analytics used the fallback timezone ${DEFAULT_SITE_TIMEZONE}.`);
    }

    const peakHour = peakHourRows[0];
    return {
      serialNumber: device.serialNumber,
      deviceId: device.deviceId,
      displayName: device.displayName,
      tenantId: device.tenantId,
      siteId: device.siteId,
      siteTimezone,
      dayStart,
      dayEnd,
      currentVoltage: device.state?.lastVoltage,
      currentCurrent: device.state?.lastCurrent,
      currentPower: device.state?.lastPower,
      currentSeenAt: device.state?.lastSeenAt,
      todayEnergyKwh,
      peakHourStart: peakHour?.hourStart,
      peakHourEnd: peakHour ? new Date(peakHour.hourStart.getTime() + 60 * 60 * 1000) : undefined,
      peakHourAveragePower: peakHour ? Number(peakHour.averagePower.toFixed(1)) : undefined,
      sampleCount,
      dataStatus,
      messages,
    };
  }

  async getDeviceEnergyAnalytics(
    identifier: string,
    options: EnergyRangeOptions,
  ): Promise<DeviceEnergyAnalyticsSummary | null> {
    const device = await this.deviceRepo.getDeviceHealth(identifier);
    if (!device) return null;

    const site = device.siteId ? await this.sites.findOne({ siteId: device.siteId }) : null;
    const siteTimezone = site?.timezone || DEFAULT_SITE_TIMEZONE;
    const now = new Date();
    const range = "preset" in options
      ? resolveEnergyPresetRange(options.preset, now, siteTimezone)
      : resolveCustomDateRange(options.startDate, options.endDate, siteTimezone);

    const [sampleCount, computed] = await Promise.all([
      this.telemetry.countDocuments({
        serialNumber: device.serialNumber,
        timestamp: { $gte: range.rangeStart, $lt: range.rangeEnd },
      }),
      this.computeEnergyForRange(device.serialNumber, range, siteTimezone),
    ]);

    const messages = [...computed.messages];
    if (!site?.timezone) {
      messages.push(`Site timezone is missing, so analytics used the fallback timezone ${DEFAULT_SITE_TIMEZONE}.`);
    }

    return {
      serialNumber: device.serialNumber,
      deviceId: device.deviceId,
      displayName: device.displayName,
      tenantId: device.tenantId,
      siteId: device.siteId,
      siteTimezone,
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      preset: "preset" in options ? options.preset : undefined,
      requestedStartDate: "startDate" in options ? options.startDate : undefined,
      requestedEndDate: "endDate" in options ? options.endDate : undefined,
      dayCount: range.dayCount,
      energyKwh: computed.energyKwh,
      averageDailyKwh: computed.averageDailyKwh,
      sampleCount,
      dataStatus: computed.dataStatus,
      messages,
    };
  }

  private async getValidTelemetryAtOrBefore(serialNumber: string, boundary: Date) {
    return this.telemetry.findOne(
      { serialNumber, timestamp: { $lte: boundary }, voltage: { $gt: MIN_VALID_VOLTAGE } },
      { sort: { timestamp: -1 }, projection: { _id: 0, timestamp: 1, energy: 1, voltage: 1, current: 1, power: 1 } },
    );
  }

  private async getValidTelemetryAfter(serialNumber: string, boundary: Date) {
    return this.telemetry.findOne(
      {
        serialNumber,
        timestamp: { $gt: boundary, $lte: new Date(boundary.getTime() + BOUNDARY_MAX_GAP_MS) },
        voltage: { $gt: MIN_VALID_VOLTAGE },
      },
      { sort: { timestamp: 1 }, projection: { _id: 0, timestamp: 1, energy: 1, voltage: 1, current: 1, power: 1 } },
    );
  }

  private async resolveBoundaryTelemetry(serialNumber: string, boundary: Date): Promise<BoundaryResolution> {
    const beforeSample = await this.getValidTelemetryAtOrBefore(serialNumber, boundary);
    if (beforeSample && boundary.getTime() - beforeSample.timestamp.getTime() <= BOUNDARY_MAX_GAP_MS) {
      return { status: "ok", sample: beforeSample, mode: "at_or_before" };
    }

    const afterSample = await this.getValidTelemetryAfter(serialNumber, boundary);
    if (afterSample) return { status: "ok", sample: afterSample, mode: "after_fallback" };

    const hourlySample = await this.getHourlyBoundary(serialNumber, boundary);
    if (hourlySample) return { status: "ok", sample: hourlySample, mode: "hourly_fallback" };

    return {
      status: "missing",
      reason: `Missing valid telemetry within ${Math.floor(BOUNDARY_MAX_GAP_MS / 60000)} minutes of boundary ${boundary.toISOString()}.`,
    };
  }

  private async computeEnergyDeltaForSegment(serialNumber: string, start: Date, end: Date) {
    const [startBoundary, endBoundary] = await Promise.all([
      this.resolveBoundaryTelemetry(serialNumber, start),
      this.resolveBoundaryTelemetry(serialNumber, end),
    ]);

    if (startBoundary.status === "missing") {
      return {
        status: "insufficient_data" as const,
        message: `Missing start boundary for segment ${start.toISOString()} -> ${end.toISOString()}. ${startBoundary.reason}`,
      };
    }

    if (endBoundary.status === "missing") {
      return {
        status: "insufficient_data" as const,
        message: `Missing end boundary for segment ${start.toISOString()} -> ${end.toISOString()}. ${endBoundary.reason}`,
      };
    }

    const delta = endBoundary.sample.energy - startBoundary.sample.energy;
    if (delta < 0) {
      return {
        status: "counter_reset_detected" as const,
        message: `Energy counter moved backwards for segment ${start.toISOString()} -> ${end.toISOString()}.`,
      };
    }

    return {
      status: "ok" as const,
      delta,
      startMode: startBoundary.mode,
      endMode: endBoundary.mode,
    };
  }

  private async computeEnergyForRange(serialNumber: string, range: TimeRange, timeZone: string) {
    const segments = buildRangeSegments(range.rangeStart, range.rangeEnd, timeZone);
    if (segments.length === 0) {
      return {
        dataStatus: "insufficient_data" as const,
        messages: ["Selected range does not contain any time segment."],
        energyKwh: undefined,
        averageDailyKwh: undefined,
      };
    }

    let total = 0;
    const messages: string[] = [];
    const segmentResults = await Promise.all(
      segments.map((segment) => this.computeEnergyDeltaForSegment(serialNumber, segment.start, segment.end)),
    );

    for (const [i, result] of segmentResults.entries()) {
      const segment = segments[i];
      if (result.status === "insufficient_data") {
        messages.push(result.message);
        return { dataStatus: "insufficient_data" as const, messages, energyKwh: undefined, averageDailyKwh: undefined };
      }
      if (result.status === "counter_reset_detected") {
        messages.push(result.message);
        return {
          dataStatus: "counter_reset_detected" as const,
          messages,
          energyKwh: undefined,
          averageDailyKwh: undefined,
        };
      }

      total += result.delta;
      if (result.startMode === "after_fallback" || result.endMode === "after_fallback") {
        messages.push(
          `Used after-boundary fallback for segment ${segment.start.toISOString()} -> ${segment.end.toISOString()}.`,
        );
      }
      if (result.startMode === "hourly_fallback" || result.endMode === "hourly_fallback") {
        messages.push(
          `Used hourly aggregate boundary for segment ${segment.start.toISOString()} -> ${segment.end.toISOString()}.`,
        );
      }
    }

    const energyKwh = Number(total.toFixed(3));
    return {
      dataStatus: "ok" as const,
      messages,
      energyKwh,
      averageDailyKwh: Number((energyKwh / range.dayCount).toFixed(3)),
    };
  }

  private async getHourlyBoundary(serialNumber: string, boundary: Date): Promise<BoundaryTelemetrySnapshot | null> {
    const MAX_HOURLY_GAP_MS = 2 * 60 * 60 * 1000;

    const before = await this.telemetryHourly.findOne(
      { serialNumber, hourStart: { $lte: boundary }, counterReset: false },
      { sort: { hourStart: -1 } },
    );

    if (before) {
      const gapMs = boundary.getTime() - before.lastTimestamp.getTime();
      if (gapMs >= 0 && gapMs <= MAX_HOURLY_GAP_MS) {
        return {
          timestamp: before.lastTimestamp,
          energy: before.lastEnergy,
          voltage: before.avgVoltage,
          current: before.avgCurrent,
          power: before.avgPower,
        };
      }
    }

    const after = await this.telemetryHourly.findOne(
      { serialNumber, hourStart: { $gt: boundary }, counterReset: false },
      { sort: { hourStart: 1 } },
    );

    if (after) {
      const gapMs = after.firstTimestamp.getTime() - boundary.getTime();
      if (gapMs >= 0 && gapMs <= MAX_HOURLY_GAP_MS) {
        return {
          timestamp: after.firstTimestamp,
          energy: after.firstEnergy,
          voltage: after.avgVoltage,
          current: after.avgCurrent,
          power: after.avgPower,
        };
      }
    }

    return null;
  }

  async getPeakDayLast7Days(identifier: string): Promise<DevicePeakDaySummary | null> {
    const device = await this.deviceRepo.getDeviceHealth(identifier);
    if (!device) return null;

    const site = device.siteId ? await this.sites.findOne({ siteId: device.siteId }) : null;
    const siteTimezone = site?.timezone || DEFAULT_SITE_TIMEZONE;
    const now = new Date();

    const { dayStart: todayStart, dayEnd: todayEnd } = getLocalDayBounds(now, siteTimezone);
    const rangeStart = addLocalDays(todayStart, siteTimezone, -6);
    const rangeEnd = todayEnd;

    const segments = buildRangeSegments(rangeStart, rangeEnd, siteTimezone);
    const segmentResults = await Promise.all(
      segments.map((seg) => this.computeEnergyDeltaForSegment(device.serialNumber, seg.start, seg.end)),
    );

    const messages: string[] = [];
    const dailyBreakdown: DevicePeakDaySummary["dailyBreakdown"] = [];
    let peakDate: string | undefined;
    let peakDayStart: Date | undefined;
    let peakDayEnd: Date | undefined;
    let peakDayEnergyKwh: number | undefined;
    let hasValidDays = false;

    for (const [i, result] of segmentResults.entries()) {
      const seg = segments[i];
      const parts = getTimeZoneParts(seg.start, siteTimezone);
      const dateStr = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;

      if (result.status === "ok") {
        hasValidDays = true;
        const energyKwh = Number(result.delta.toFixed(3));
        dailyBreakdown.push({ date: dateStr, energyKwh, dataStatus: "ok" });
        if (peakDayEnergyKwh === undefined || energyKwh > peakDayEnergyKwh) {
          peakDate = dateStr;
          peakDayStart = seg.start;
          peakDayEnd = seg.end;
          peakDayEnergyKwh = energyKwh;
        }
      } else {
        dailyBreakdown.push({ date: dateStr, dataStatus: result.status });
        messages.push(result.message);
      }
    }

    if (!site?.timezone) {
      messages.push(`Site timezone is missing, so analytics used the fallback timezone ${DEFAULT_SITE_TIMEZONE}.`);
    }

    return {
      serialNumber: device.serialNumber,
      deviceId: device.deviceId,
      displayName: device.displayName,
      tenantId: device.tenantId,
      siteId: device.siteId,
      siteTimezone,
      rangeStart,
      rangeEnd,
      peakDate,
      peakDayStart,
      peakDayEnd,
      peakDayEnergyKwh,
      dailyBreakdown,
      dataStatus: !hasValidDays ? "no_valid_days" : peakDate ? "ok" : "insufficient_data",
      messages,
    };
  }

  async getHourlyBreakdown(identifier: string, date: string): Promise<DeviceHourlyBreakdown | null> {
    const device = await this.deviceRepo.getDeviceHealth(identifier);
    if (!device) return null;

    const site = device.siteId ? await this.sites.findOne({ siteId: device.siteId }) : null;
    const siteTimezone = site?.timezone || DEFAULT_SITE_TIMEZONE;
    const now = new Date();

    let dayStart: Date;
    let dayEnd: Date;
    let resolvedDate: string;

    if (date === "today") {
      const bounds = getLocalDayBounds(now, siteTimezone);
      dayStart = bounds.dayStart;
      dayEnd = bounds.dayEnd;
      const parts = getTimeZoneParts(now, siteTimezone);
      resolvedDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    } else if (date === "yesterday") {
      const { dayStart: todayStart } = getLocalDayBounds(now, siteTimezone);
      dayStart = addLocalDays(todayStart, siteTimezone, -1);
      dayEnd = todayStart;
      const parts = getTimeZoneParts(dayStart, siteTimezone);
      resolvedDate = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    } else {
      const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) throw new Error("date must be YYYY-MM-DD, today, or yesterday");
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      dayStart = zonedDateTimeToUtc({ year, month, day }, siteTimezone);
      dayEnd = addLocalDays(dayStart, siteTimezone, 1);
      resolvedDate = date;
    }

    const hourlyRows = await this.telemetryHourly
      .find({ serialNumber: device.serialNumber, hourStart: { $gte: dayStart, $lt: dayEnd } })
      .sort({ hourStart: 1 })
      .toArray();

    const messages: string[] = [];
    if (!site?.timezone) {
      messages.push(`Site timezone is missing, so analytics used the fallback timezone ${DEFAULT_SITE_TIMEZONE}.`);
    }

    const hours = hourlyRows.map((row) => ({
      hourStart: row.hourStart,
      localHour: getTimeZoneParts(row.hourStart, siteTimezone).hour,
      energyKwh: row.energyKwh,
      avgPower: row.avgPower,
      maxPower: row.maxPower,
      sampleCount: row.sampleCount,
      counterReset: row.counterReset,
    }));

    const hasCounterReset = hours.some((h) => h.counterReset);
    let totalEnergyKwh: number | undefined;
    if (!hasCounterReset) {
      const sum = hours.reduce((acc, h) => acc + (h.energyKwh ?? 0), 0);
      totalEnergyKwh = Number(sum.toFixed(3));
    }

    return {
      serialNumber: device.serialNumber,
      deviceId: device.deviceId,
      displayName: device.displayName,
      tenantId: device.tenantId,
      siteId: device.siteId,
      siteTimezone,
      date: resolvedDate,
      dayStart,
      dayEnd,
      hours,
      totalEnergyKwh,
      dataStatus: hours.length === 0 ? "no_data" : hasCounterReset ? "partial_data" : "ok",
      messages,
    };
  }
}
