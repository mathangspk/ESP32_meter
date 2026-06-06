import { z } from "zod";

export const analyticsIntentSchema = z.object({
  intent: z.enum([
    "get_today_energy",
    "get_yesterday_energy",
    "get_last_7_days_energy",
    "get_this_week_energy",
    "get_last_week_energy",
    "get_this_month_energy",
    "get_last_month_energy",
    "get_date_range_energy",
    "get_peak_day",
    "get_hourly_breakdown",
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
  targetDate: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const inventoryIntentSchema = z.object({
  intent: z.enum(["get_managed_device_count", "get_managed_device_list", "get_managed_device_summary", "unknown"]),
  confidence: z.number().min(0).max(1).optional(),
});

export type AnalyticsIntent = z.infer<typeof analyticsIntentSchema>;
export type InventoryIntent = z.infer<typeof inventoryIntentSchema>;

export type AnalyticsSummary = {
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

export type EnergyAnalyticsSummary = {
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

export type PeakDaySummary = {
  displayName?: string;
  serialNumber: string;
  siteTimezone: string;
  peakDate?: string;
  peakDayEnergyKwh?: number;
  dailyBreakdown: Array<{ date: string; energyKwh?: number; dataStatus: string }>;
  dataStatus: string;
  messages: string[];
};

export type HourlyBreakdown = {
  displayName?: string;
  serialNumber: string;
  siteTimezone: string;
  date: string;
  hours: Array<{
    localHour: number;
    energyKwh?: number;
    avgPower: number;
    maxPower: number;
    counterReset: boolean;
  }>;
  totalEnergyKwh?: number;
  dataStatus: string;
  messages: string[];
};
