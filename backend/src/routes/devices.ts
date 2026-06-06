import { Router, type Request, type Response, type NextFunction } from "express";
import { mongoService } from "../mongodb";
import { parseLimit } from "./utils";
import type { JwtPayload } from "../auth";

export const devicesRouter = Router();

export async function checkDeviceAccess(req: Request, res: Response, next: NextFunction) {
  const { systemRole, tenantId } = (req as Request & { user: JwtPayload }).user;
  if (systemRole === "platform_admin") return next();
  const deviceId = req.params.deviceId as string;
  if (!deviceId) return res.status(400).json({ error: "Device identifier is required" });
  const device = await mongoService.getDeviceHealth(deviceId);
  if (!device) return res.status(404).json({ error: "Device not found" });
  if (device.claimStatus !== "claimed" || device.tenantId !== tenantId) {
    return res.status(403).json({ error: "Forbidden: You do not have access to this device" });
  }
  next();
}

devicesRouter.get("/", async (req, res) => {
  const { systemRole, tenantId } = (req as Request & { user: JwtPayload }).user;
  if (systemRole === "platform_admin") {
    return res.json(await mongoService.getDevices(parseLimit(req.query.limit, 50)));
  }
  if (!tenantId) return res.json([]);
  res.json(await mongoService.getDevicesForTenant(tenantId, parseLimit(req.query.limit, 50)));
});

devicesRouter.post("/claim", async (req, res) => {
  const { systemRole, tenantId } = (req as Request & { user: JwtPayload }).user;
  const body = req.body as { serialNumber?: string; tenantId?: string; siteId?: string; ownerUserId?: string; displayName?: string };
  if (!body.serialNumber || !body.tenantId || !body.siteId || !body.ownerUserId || !body.displayName) {
    return res.status(400).json({ error: "serialNumber, tenantId, siteId, ownerUserId, and displayName are required" });
  }
  if (systemRole !== "platform_admin" && (!tenantId || body.tenantId !== tenantId)) {
    return res.status(403).json({ error: "Forbidden: You can only claim devices to your own tenant" });
  }
  try {
    res.json(await mongoService.claimDevice({
      serialNumber: body.serialNumber,
      tenantId: body.tenantId,
      siteId: body.siteId,
      ownerUserId: body.ownerUserId,
      displayName: body.displayName,
    }));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to claim device" });
  }
});

devicesRouter.put("/:deviceId", checkDeviceAccess, async (req, res) => {
  const { displayName } = req.body as { displayName?: string };
  if (!displayName || typeof displayName !== "string" || !displayName.trim()) {
    return res.status(400).json({ error: "displayName is required and must be a non-empty string" });
  }
  const cleanName = displayName.trim();
  if (cleanName.length > 50) return res.status(400).json({ error: "displayName cannot exceed 50 characters" });
  const { userId } = (req as Request & { user: JwtPayload }).user;
  try {
    res.json(await mongoService.updateDeviceDisplayName(req.params.deviceId as string, cleanName, userId));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Failed to rename device" });
  }
});

import "./devices.actions";
import "./devices.analytics";
