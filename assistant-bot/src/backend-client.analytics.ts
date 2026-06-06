import { request } from "./backend-client.request";
import {
  deviceAnalyticsSummarySchema,
  deviceEnergyAnalyticsSummarySchema,
  devicePeakDaySummarySchema,
  deviceHourlyBreakdownSchema,
} from "./backend-client.types.analytics";

export const analyticsClient = {
  getDeviceAnalyticsSummary: (identifier: string) =>
    request(`/devices/${encodeURIComponent(identifier)}/analytics/summary`, { method: "GET" }, deviceAnalyticsSummarySchema),

  getDeviceEnergyAnalytics: (
    identifier: string,
    query:
      | { preset: "today" | "yesterday" | "last_7_days" | "this_week" | "last_week" | "this_month" | "last_month" }
      | { startDate: string; endDate: string },
  ) =>
    request(
      `/devices/${encodeURIComponent(identifier)}/analytics/energy?${
        "preset" in query
          ? `preset=${encodeURIComponent(query.preset)}`
          : `startDate=${encodeURIComponent(query.startDate)}&endDate=${encodeURIComponent(query.endDate)}`
      }`,
      { method: "GET" },
      deviceEnergyAnalyticsSummarySchema,
    ),

  getDevicePeakDaySummary: (identifier: string) =>
    request(
      `/devices/${encodeURIComponent(identifier)}/analytics/peak-day`,
      { method: "GET" },
      devicePeakDaySummarySchema,
    ),

  getDeviceHourlyBreakdown: (identifier: string, date: string) =>
    request(
      `/devices/${encodeURIComponent(identifier)}/analytics/hourly?date=${encodeURIComponent(date)}`,
      { method: "GET" },
      deviceHourlyBreakdownSchema,
    ),
};
