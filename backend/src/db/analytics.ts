import { EnergyAnalyticsPreset } from "./types";

export { DEFAULT_SITE_TIMEZONE } from "./analytics.timezone";
export * from "./analytics.timezone";
export * from "./analytics.range";

export const BOUNDARY_MAX_GAP_MS = 5 * 60 * 1000;
export const MIN_VALID_VOLTAGE = 50;

export type TimeRange = {
  rangeStart: Date;
  rangeEnd: Date;
  dayCount: number;
};

export type EnergyRangeOptions = { preset: EnergyAnalyticsPreset } | { startDate: string; endDate: string };
