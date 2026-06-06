import { z } from "zod";

export const deviceAnalyticsSummarySchema = z.object({
  serialNumber: z.string(),
  deviceId: z.string(),
  displayName: z.string().optional(),
  tenantId: z.string().optional(),
  siteId: z.string().optional(),
  siteTimezone: z.string(),
  dayStart: z.string(),
  dayEnd: z.string(),
  currentVoltage: z.number().optional(),
  currentCurrent: z.number().optional(),
  currentPower: z.number().optional(),
  currentSeenAt: z.string().optional(),
  todayEnergyKwh: z.number().optional(),
  peakHourStart: z.string().optional(),
  peakHourEnd: z.string().optional(),
  peakHourAveragePower: z.number().optional(),
  sampleCount: z.number(),
  dataStatus: z.enum(["ok", "insufficient_data", "counter_reset_detected"]),
  messages: z.array(z.string()),
});

export const deviceEnergyAnalyticsSummarySchema = z.object({
  serialNumber: z.string(),
  deviceId: z.string(),
  displayName: z.string().optional(),
  tenantId: z.string().optional(),
  siteId: z.string().optional(),
  siteTimezone: z.string(),
  rangeStart: z.string(),
  rangeEnd: z.string(),
  preset: z.enum(["today", "yesterday", "last_7_days", "this_week", "last_week", "this_month", "last_month"]).optional(),
  requestedStartDate: z.string().optional(),
  requestedEndDate: z.string().optional(),
  dayCount: z.number(),
  energyKwh: z.number().optional(),
  averageDailyKwh: z.number().optional(),
  sampleCount: z.number(),
  dataStatus: z.enum(["ok", "insufficient_data", "counter_reset_detected"]),
  messages: z.array(z.string()),
});

export const devicePeakDaySummarySchema = z.object({
  serialNumber: z.string(),
  deviceId: z.string(),
  displayName: z.string().optional(),
  tenantId: z.string().optional(),
  siteId: z.string().optional(),
  siteTimezone: z.string(),
  rangeStart: z.string(),
  rangeEnd: z.string(),
  peakDate: z.string().optional(),
  peakDayStart: z.string().optional(),
  peakDayEnd: z.string().optional(),
  peakDayEnergyKwh: z.number().optional(),
  dailyBreakdown: z.array(
    z.object({ date: z.string(), energyKwh: z.number().optional(), dataStatus: z.string() }),
  ),
  dataStatus: z.enum(["ok", "insufficient_data", "counter_reset_detected", "no_valid_days"]),
  messages: z.array(z.string()),
});

export const deviceHourlyBreakdownSchema = z.object({
  serialNumber: z.string(),
  deviceId: z.string(),
  displayName: z.string().optional(),
  tenantId: z.string().optional(),
  siteId: z.string().optional(),
  siteTimezone: z.string(),
  date: z.string(),
  dayStart: z.string(),
  dayEnd: z.string(),
  hours: z.array(
    z.object({
      hourStart: z.string(),
      localHour: z.number(),
      energyKwh: z.number().optional(),
      avgPower: z.number(),
      maxPower: z.number(),
      sampleCount: z.number(),
      counterReset: z.boolean(),
    }),
  ),
  totalEnergyKwh: z.number().optional(),
  dataStatus: z.enum(["ok", "no_data", "partial_data"]),
  messages: z.array(z.string()),
});

export type DevicePeakDaySummary = z.infer<typeof devicePeakDaySummarySchema>;
export type DeviceHourlyBreakdown = z.infer<typeof deviceHourlyBreakdownSchema>;
