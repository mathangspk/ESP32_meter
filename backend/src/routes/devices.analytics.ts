import { devicesRouter, checkDeviceAccess } from "./devices";
import { mongoService } from "../mongodb";

const energyAnalyticsPresets = new Set([
  "today", "yesterday", "last_7_days", "this_week", "last_week", "this_month", "last_month",
]);

devicesRouter.get("/:deviceId/analytics/summary", checkDeviceAccess, async (req, res) => {
  const summary = await mongoService.getDeviceAnalyticsSummary(req.params.deviceId as string);
  if (!summary) { res.status(404).json({ error: "Device not found" }); return; }
  res.json(summary);
});

devicesRouter.get("/:deviceId/analytics/energy", checkDeviceAccess, async (req, res) => {
  const preset = Array.isArray(req.query.preset) ? req.query.preset[0] : req.query.preset;
  const startDate = Array.isArray(req.query.startDate) ? req.query.startDate[0] : req.query.startDate;
  const endDate = Array.isArray(req.query.endDate) ? req.query.endDate[0] : req.query.endDate;

  try {
    if (!preset && !(startDate && endDate)) {
      res.status(400).json({ error: "preset or startDate/endDate is required" });
      return;
    }
    if (preset && !energyAnalyticsPresets.has(String(preset))) {
      res.status(400).json({ error: "Invalid preset" });
      return;
    }
    const summary = preset
      ? await mongoService.getDeviceEnergyAnalytics(req.params.deviceId as string, {
          preset: String(preset) as "today" | "yesterday" | "last_7_days" | "this_week" | "last_week" | "this_month" | "last_month",
        })
      : await mongoService.getDeviceEnergyAnalytics(req.params.deviceId as string, {
          startDate: String(startDate),
          endDate: String(endDate),
        });
    if (!summary) { res.status(404).json({ error: "Device not found" }); return; }
    res.json(summary);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get device energy analytics" });
  }
});

devicesRouter.get("/:deviceId/analytics/peak-day", checkDeviceAccess, async (req, res) => {
  const preset = req.query.preset ? String(req.query.preset) : undefined;
  const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

  try {
    const options = preset ? { preset: preset as any } : startDate && endDate ? { startDate, endDate } : undefined;
    const summary = await mongoService.getPeakDayAnalytics(String(req.params.deviceId), options);
    if (!summary) { res.status(404).json({ error: "Device not found" }); return; }
    res.json(summary);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get daily energy breakdown" });
  }
});

devicesRouter.get("/:deviceId/analytics/hourly", checkDeviceAccess, async (req, res) => {
  const dateParam = Array.isArray(req.query.date) ? req.query.date[0] : req.query.date;
  const date = String(dateParam || "today");
  try {
    const device = await mongoService.getDeviceHealth(String(req.params.deviceId));
    if (!device) { res.status(404).json({ error: "Device not found" }); return; }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (date === "today" || date === todayStr) {
      const now = new Date();
      const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      await mongoService.rollupTelemetryForDevice(device.serialNumber, device.deviceId, startOfToday, now);
    }

    const summary = await mongoService.getHourlyBreakdown(String(req.params.deviceId), date);
    res.json(summary);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to get hourly breakdown" });
  }
});
