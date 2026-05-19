import { Router } from "express";
import { ZodError } from "zod";
import { logger } from "../logger";
import { mongoService } from "../mongodb";
import { firmwareReleaseRequestSchema } from "../types";
import { parseLimit } from "./utils";

export const adminRouter = Router();

adminRouter.get("/fleet/summary", async (_req, res) => {
  const summary = await mongoService.getFleetSummary();
  res.json(summary);
});

adminRouter.get("/devices/unclaimed", async (req, res) => {
  const devices = await mongoService.getUnclaimedDevices({ onlineOnly: false, limit: parseLimit(req.query.limit, 50) });
  res.json(devices);
});

adminRouter.get("/devices/online-unclaimed", async (req, res) => {
  const devices = await mongoService.getUnclaimedDevices({ onlineOnly: true, limit: parseLimit(req.query.limit, 50) });
  res.json(devices);
});

adminRouter.get("/users/summary", async (_req, res) => {
  const summary = await mongoService.getUserSummary();
  res.json(summary);
});

adminRouter.get("/tenants", async (req, res) => {
  const tenants = await mongoService.getTenants(parseLimit(req.query.limit, 100));
  res.json(tenants);
});

adminRouter.get("/sites", async (req, res) => {
  const sites = await mongoService.getSites(parseLimit(req.query.limit, 100));
  res.json(sites);
});

adminRouter.get("/firmware/releases", async (req, res) => {
  const releases = await mongoService.getFirmwareReleases(parseLimit(req.query.limit, 50));
  res.json(releases);
});

adminRouter.post("/firmware/releases", async (req, res) => {
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

adminRouter.get("/firmware/policy", async (req, res) => {
  const policy = await mongoService.evaluateFirmwarePolicyForFleet(parseLimit(req.query.limit, 50));
  res.json(policy);
});

adminRouter.get("/device-commands", async (req, res) => {
  const commands = await mongoService.getDeviceCommands(parseLimit(req.query.limit, 50));
  res.json(commands);
});
