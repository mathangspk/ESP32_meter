import { Router, type Request, type Response, type NextFunction } from "express";
import { ZodError } from "zod";
import { mongoService } from "../mongodb";
import { performDeviceAction } from "../device-actions";
import { createOtaJobFromRelease } from "../ota";
import { deviceActionRequestSchema, otaReleaseRequestSchema } from "../types";
import { parseLimit } from "./utils";
import type { JwtPayload } from "../auth";

const energyAnalyticsPresets = new Set([
  "today", "yesterday", "last_7_days", "this_week", "last_week", "this_month", "last_month",
]);

export const devicesRouter = Router();

// Middleware to verify device access for tenant users
async function checkDeviceAccess(req: Request, res: Response, next: NextFunction) {
  const { systemRole, tenantId } = (req as Request & { user: JwtPayload }).user;
  if (systemRole === "platform_admin") {
    return next();
  }
  const deviceId = req.params.deviceId as string;
  if (!deviceId) {
    res.status(400).json({ error: "Device identifier is required" });
    return;
  }
  const device = await mongoService.getDeviceHealth(deviceId);
  if (!device) {
    res.status(404).json({ error: "Device not found" });
    return;
  }
  if (device.claimStatus !== "claimed" || device.tenantId !== tenantId) {
    res.status(403).json({ error: "Forbidden: You do not have access to this device" });
    return;
  }
  next();
}

devicesRouter.get("/", async (req, res) => {
  const { systemRole, tenantId } = (req as Request & { user: JwtPayload }).user;
  if (systemRole === "platform_admin") {
    const devices = await mongoService.getDevices(parseLimit(req.query.limit, 50));
    res.json(devices);
    return;
  }
  if (!tenantId) {
    res.json([]);
    return;
  }
  const devices = await mongoService.getDevicesForTenant(tenantId, parseLimit(req.query.limit, 50));
  res.json(devices);
});

devicesRouter.post("/claim", async (req, res) => {
  const { systemRole, tenantId } = (req as Request & { user: JwtPayload }).user;
  const body = req.body as {
    serialNumber?: string; tenantId?: string; siteId?: string;
    ownerUserId?: string; displayName?: string;
  };
  if (!body.serialNumber || !body.tenantId || !body.siteId || !body.ownerUserId || !body.displayName) {
    res.status(400).json({ error: "serialNumber, tenantId, siteId, ownerUserId, and displayName are required" });
    return;
  }
  if (systemRole !== "platform_admin") {
    if (!tenantId || body.tenantId !== tenantId) {
      res.status(403).json({ error: "Forbidden: You can only claim devices to your own tenant" });
      return;
    }
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

devicesRouter.get("/:deviceId/health", checkDeviceAccess, async (req, res) => {
  const device = await mongoService.getDeviceHealth(req.params.deviceId as string);
  if (!device) { res.status(404).json({ error: "Device not found" }); return; }
  res.json(device);
});

devicesRouter.get("/:deviceId/firmware-policy", checkDeviceAccess, async (req, res) => {
  const policy = await mongoService.evaluateFirmwarePolicyForDevice(req.params.deviceId as string);
  if (!policy) { res.status(404).json({ error: "Device not found" }); return; }
  res.json(policy);
});

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
    const message = error instanceof Error ? error.message : "Failed to get device energy analytics";
    res.status(400).json({ error: message });
  }
});

devicesRouter.post("/:deviceId/actions", checkDeviceAccess, async (req, res) => {
  try {
    const input = deviceActionRequestSchema.parse(req.body);
    const result = await performDeviceAction(req.params.deviceId as string, input);
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

devicesRouter.post("/:deviceId/ota", checkDeviceAccess, async (req, res) => {
  try {
    const input = otaReleaseRequestSchema.parse(req.body);
    const job = await createOtaJobFromRelease(req.params.deviceId as string, input.version);
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

devicesRouter.get("/:deviceId/analytics/peak-day", checkDeviceAccess, async (req, res) => {
  const preset = req.query.preset ? String(req.query.preset) : undefined;
  const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
  const endDate = req.query.endDate ? String(req.query.endDate) : undefined;

  try {
    const options = preset
      ? { preset: preset as any }
      : startDate && endDate
      ? { startDate, endDate }
      : undefined;

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
    const summary = await mongoService.getHourlyBreakdown(String(req.params.deviceId), date);
    if (!summary) { res.status(404).json({ error: "Device not found" }); return; }
    res.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get hourly breakdown";
    res.status(400).json({ error: message });
  }
});

devicesRouter.put("/:deviceId", checkDeviceAccess, async (req, res) => {
  const { displayName } = req.body as { displayName?: string };
  if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
    res.status(400).json({ error: "displayName is required and must be a non-empty string" });
    return;
  }
  const cleanName = displayName.trim();
  if (cleanName.length > 50) {
    res.status(400).json({ error: "displayName cannot exceed 50 characters" });
    return;
  }
  const { userId } = (req as Request & { user: JwtPayload }).user;
  try {
    const updated = await mongoService.updateDeviceDisplayName(req.params.deviceId as string, cleanName, userId);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to rename device" });
  }
});
