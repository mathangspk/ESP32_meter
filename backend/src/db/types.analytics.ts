export * from "./types.analytics.db";
export * from "./types.analytics.fleet";

export type DeviceAnalyticsSummary = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  tenantId?: string;
  siteId?: string;
  siteTimezone: string;
  dayStart: Date;
  dayEnd: Date;
  currentVoltage?: number;
  currentCurrent?: number;
  currentPower?: number;
  currentSeenAt?: Date;
  todayEnergyKwh?: number;
  peakHourStart?: Date;
  peakHourEnd?: Date;
  peakHourAveragePower?: number;
  sampleCount: number;
  dataStatus: "ok" | "insufficient_data" | "counter_reset_detected";
  messages: string[];
};

export type EnergyAnalyticsPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month";

export type DeviceEnergyAnalyticsSummary = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  tenantId?: string;
  siteId?: string;
  siteTimezone: string;
  rangeStart: Date;
  rangeEnd: Date;
  preset?: EnergyAnalyticsPreset;
  requestedStartDate?: string;
  requestedEndDate?: string;
  dayCount: number;
  energyKwh?: number;
  averageDailyKwh?: number;
  sampleCount: number;
  dataStatus: "ok" | "insufficient_data" | "counter_reset_detected";
  messages: string[];
};

export type DevicePeakDaySummary = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  tenantId?: string;
  siteId?: string;
  siteTimezone: string;
  rangeStart: Date;
  rangeEnd: Date;
  peakDate?: string;
  peakDayStart?: Date;
  peakDayEnd?: Date;
  peakDayEnergyKwh?: number;
  dailyBreakdown: Array<{ date: string; energyKwh?: number; dataStatus: string }>;
  dataStatus: "ok" | "insufficient_data" | "counter_reset_detected" | "no_valid_days";
  messages: string[];
};
