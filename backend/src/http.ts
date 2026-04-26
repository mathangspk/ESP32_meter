import express from "express";
import { ObjectId } from "mongodb";
import { ZodError } from "zod";
import { logger } from "./logger";
import { mongoService } from "./mongodb";
import { performDeviceAction } from "./device-actions";
import { createOtaJob } from "./ota";
import { HealthSnapshot } from "./types";
import { deviceActionRequestSchema } from "./types";
import { firmwareReleaseRequestSchema } from "./types";
import { otaCommandRequestSchema } from "./types";

export function createHttpApp(getHealthSnapshot: () => HealthSnapshot) {
  const app = express();
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    const health = getHealthSnapshot();
    const statusCode = health.status === "ok" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  app.get("/ota/jobs", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 20);
    const jobs = await mongoService.getOtaJobs(Number.isFinite(limit) && limit > 0 ? limit : 20);
    res.json(jobs);
  });

  app.get("/ota/jobs/:jobId", async (req, res) => {
    const job = await mongoService.getOtaJob(req.params.jobId);
    if (!job) {
      res.status(404).json({ error: "OTA job not found" });
      return;
    }

    res.json(job);
  });

  app.post("/ota/jobs", async (req, res) => {
    try {
      const input = otaCommandRequestSchema.parse(req.body);
      const job = await createOtaJob(input);
      res.status(202).json(job);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Invalid OTA request", details: error.flatten() });
        return;
      }

      logger.error({ err: error }, "Failed to create OTA job");
      res.status(500).json({ error: "Failed to create OTA job" });
    }
  });

  app.get("/devices", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 50);
    const devices = await mongoService.getDevices(Number.isFinite(limit) && limit > 0 ? limit : 50);
    res.json(devices);
  });

  app.get("/devices/:deviceId/health", async (req, res) => {
    const device = await mongoService.getDeviceHealth(req.params.deviceId);
    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    res.json(device);
  });

  app.get("/devices/:deviceId/firmware-policy", async (req, res) => {
    const policy = await mongoService.evaluateFirmwarePolicyForDevice(req.params.deviceId);
    if (!policy) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    res.json(policy);
  });

  app.post("/devices/claim", async (req, res) => {
    const body = req.body as {
      serialNumber?: string;
      tenantId?: string;
      siteId?: string;
      ownerUserId?: string;
      displayName?: string;
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

  app.post("/devices/:deviceId/actions", async (req, res) => {
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

  app.get("/admin/fleet/summary", async (_req, res) => {
    const summary = await mongoService.getFleetSummary();
    res.json(summary);
  });

  app.get("/admin/devices/unclaimed", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 50);
    const devices = await mongoService.getUnclaimedDevices({
      onlineOnly: false,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
    });
    res.json(devices);
  });

  app.get("/admin/devices/online-unclaimed", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 50);
    const devices = await mongoService.getUnclaimedDevices({
      onlineOnly: true,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
    });
    res.json(devices);
  });

  app.get("/admin/users/summary", async (_req, res) => {
    const summary = await mongoService.getUserSummary();
    res.json(summary);
  });

  app.get("/admin/tenants", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 100);
    const tenants = await mongoService.getTenants(Number.isFinite(limit) && limit > 0 ? limit : 100);
    res.json(tenants);
  });

  app.get("/admin/sites", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 100);
    const sites = await mongoService.getSites(Number.isFinite(limit) && limit > 0 ? limit : 100);
    res.json(sites);
  });

  app.get("/admin/firmware/releases", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 50);
    const releases = await mongoService.getFirmwareReleases(Number.isFinite(limit) && limit > 0 ? limit : 50);
    res.json(releases);
  });

  app.post("/admin/firmware/releases", async (req, res) => {
    try {
      const input = firmwareReleaseRequestSchema.parse(req.body);
      const release = await mongoService.createFirmwareRelease(input);
      res.status(201).json(release);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Invalid firmware release", details: error.flatten() });
        return;
      }

      logger.error({ err: error }, "Failed to save firmware release");
      res.status(500).json({ error: "Failed to save firmware release" });
    }
  });

  app.get("/admin/firmware/policy", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 50);
    const policy = await mongoService.evaluateFirmwarePolicyForFleet(Number.isFinite(limit) && limit > 0 ? limit : 50);
    res.json(policy);
  });

  app.get("/admin/device-commands", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 50);
    const commands = await mongoService.getDeviceCommands(Number.isFinite(limit) && limit > 0 ? limit : 50);
    res.json(commands);
  });

  app.post("/internal/telegram/identify", async (req, res) => {
    const body = req.body as {
      externalId?: string;
      displayName?: string;
      username?: string;
    };

    if (!body.externalId) {
      res.status(400).json({ error: "externalId is required" });
      return;
    }

    const result = await mongoService.identifyTelegramUser(body as { externalId: string; displayName?: string; username?: string });
    res.json(result);
  });

  app.get("/internal/users/:userId/memberships", async (req, res) => {
    const user = await mongoService.getUserById(req.params.userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const memberships = await mongoService.getMembershipsForUser(req.params.userId);
    res.json({ user, memberships });
  });

  app.post("/internal/users/:userId/default-tenant", async (req, res) => {
    const body = req.body as { tenantId?: string };
    if (!body.tenantId) {
      res.status(400).json({ error: "tenantId is required" });
      return;
    }

    try {
      const user = await mongoService.setUserDefaultTenant(req.params.userId, body.tenantId);
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to set default tenant" });
    }
  });

  app.get("/internal/users/:userId/tenants", async (req, res) => {
    const tenants = await mongoService.getTenantListForUser(req.params.userId);
    res.json(tenants);
  });

  app.get("/internal/tenants/:tenantId/sites", async (req, res) => {
    const sites = await mongoService.getSitesForTenant(req.params.tenantId);
    res.json(sites);
  });

  app.get("/internal/tenants/:tenantId/devices", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 50);
    const devices = await mongoService.getDevicesForTenant(req.params.tenantId, Number.isFinite(limit) && limit > 0 ? limit : 50);
    res.json(devices);
  });

  app.get("/internal/notifications/pending", async (req, res) => {
    const rawLimit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const limit = Number(rawLimit ?? 50);
    const notifications = await mongoService.getPendingNotifications(Number.isFinite(limit) && limit > 0 ? limit : 50);
    res.json(notifications);
  });

  app.post("/internal/notifications/:notificationId/processing", async (req, res) => {
    await mongoService.markNotificationProcessing(new ObjectId(req.params.notificationId));
    res.status(204).end();
  });

  app.post("/internal/notifications/:notificationId/sent", async (req, res) => {
    await mongoService.markNotificationSent(new ObjectId(req.params.notificationId));
    res.status(204).end();
  });

  app.post("/internal/notifications/:notificationId/failed", async (req, res) => {
    const body = req.body as { error?: string };
    await mongoService.markNotificationFailed(new ObjectId(req.params.notificationId), body.error ?? "Unknown notification error");
    res.status(204).end();
  });

  return app;
}
