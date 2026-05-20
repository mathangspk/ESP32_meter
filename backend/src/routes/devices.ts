import { Router } from "express";
import { ZodError } from "zod";
import { mongoService } from "../mongodb";
import { performDeviceAction } from "../device-actions";
import { createOtaJobFromRelease } from "../ota";
import { deviceActionRequestSchema, otaReleaseRequestSchema } from "../types";
import { parseLimit } from "./utils";

const energyAnalyticsPresets = new Set([
  "today", "yesterday", "last_7_days", "this_week", "last_week", "this_month", "last_month",
]);

export const devicesRouter = Router();

devicesRouter.get("/", async (req, res) => {
  const devices = await mongoService.getDevices(parseLimit(req.query.limit, 50));
  res.json(devices);
});

devicesRouter.post("/claim", async (req, res) => {
  const body = req.body as {
    serialNumber?: string; tenantId?: string; siteId?: string;
    ownerUserId?: string; displayName?: string;
  };
  if (!body.serialNumber || !body.tenantId || !body.siteId || !body.ownerUserId || !body.displayName) {
    res.status(400).json({ error: "serialNumber, tenantId, siteId, ownerUserId, and displayName are required" });
    return;
  }
  try {
    const device = await mongoService.claimDevice({
      serialNumber: body.serialNumber,
      tenantId: body.tenantId,
      siteId: body.siteId,
      ownerUserId: body.ownerUserId,
      displayName: body.displayName,
    });
    res.json(device);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to claim device" });
  }
});

devicesRouter.get("/:deviceId/health", async (req, res) => {
  const device = await mongoService.getDeviceHealth(req.params.deviceId);
  if (!device) { res.status(404).json({ error: "Device not found" }); return; }
  res.json(device);
});

devicesRouter.get("/:deviceId/firmware-policy", async (req, res) => {
  const policy = await mongoService.evaluateFirmwarePolicyForDevice(req.params.deviceId);
  if (!policy) { res.status(404).json({ error: "Device not found" }); return; }
  res.json(policy);
});

devicesRouter.get("/:deviceId/analytics/summary", async (req, res) => {
  const summary = await mongoService.getDeviceAnalyticsSummary(req.params.deviceId);
  if (!summary) { res.status(404).json({ error: "Device not found" }); return; }
  res.json(summary);
});

devicesRouter.get("/:deviceId/analytics/energy", async (req, res) => {
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
      ? await mongoService.getDeviceEnergyAnalytics(req.params.deviceId, {
          preset: String(preset) as "today" | "yesterday" | "last_7_days" | "this_week" | "last_week" | "this_month" | "last_month",
        })
      : await mongoService.getDeviceEnergyAnalytics(req.params.deviceId, {
          startDate: String(startDate),
          endDate: String(endDate),
        });
    if (!summary) { res.status(404).json({ error: "Device not found" }); return; }
    res.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get device energy analytics";
    res.status(400).json({ error: message });
  }
});

devicesRouter.post("/:deviceId/actions", async (req, res) => {
  try {
    const input = deviceActionRequestSchema.parse(req.body);
    const result = await performDeviceAction(req.params.deviceId, input);
    res.status(input.action === "remove" ? 200 : 202).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid device action", details: error.flatten() });
      return;
    }
    const message = error instanceof Error ? error.message : "Failed to perform device action";
    res.status(message === "Device not found" ? 404 : 400).json({ error: message });
  }
});

devicesRouter.post("/:deviceId/ota", async (req, res) => {
  try {
    const input = otaReleaseRequestSchema.parse(req.body);
    const job = await createOtaJobFromRelease(req.params.deviceId, input.version);
    res.status(202).json(job);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid OTA release request", details: error.flatten() });
      return;
    }
    const message = error instanceof Error ? error.message : "Failed to create OTA job from release";
    res.status(message === "Device not found" ? 404 : 400).json({ error: message });
  }
});

devicesRouter.get("/:deviceId/analytics/peak-day", async (req, res) => {
  const summary = await mongoService.getPeakDayLast7Days(String(req.params.deviceId));
  if (!summary) { res.status(404).json({ error: "Device not found" }); return; }
  res.json(summary);
});

devicesRouter.get("/:deviceId/analytics/hourly", async (req, res) => {
  const dateParam = Array.isArray(req.query.date) ? req.query.date[0] : req.query.date;
  const date = String(dateParam || "today");
  try {
    const summary = await mongoService.getHourlyBreakdown(String(req.params.deviceId), date);
    if (!summary) { res.status(404).json({ error: "Device not found" }); return; }
    res.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get hourly breakdown";
    res.status(400).json({ error: message });
  }
});
