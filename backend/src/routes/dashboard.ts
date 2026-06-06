import { Router } from "express";
import { authMiddleware, type JwtPayload } from "../auth";
import { mongoService } from "../mongodb";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", authMiddleware, async (req, res) => {
  const { systemRole, tenantId } = (req as typeof req & { user: JwtPayload }).user;
  if (systemRole === "platform_admin") {
    const stats = await mongoService.getDashboardStats();
    res.json(stats);
    return;
  }
  if (!tenantId) {
    res.json({ totalDevices: 0, onlineDevices: 0, totalUsers: 1, totalTenants: 0 });
    return;
  }
  const devices = await mongoService.getDevicesForTenant(tenantId, 200);
  const onlineDevices = devices.filter(d => d.state?.isOffline === false).length;
  res.json({ totalDevices: devices.length, onlineDevices, totalUsers: 1, totalTenants: 1 });
});

dashboardRouter.get("/devices", authMiddleware, async (req, res) => {
  const { systemRole, tenantId } = (req as typeof req & { user: JwtPayload }).user;
  if (systemRole === "platform_admin") {
    const devices = await mongoService.getDevices(200);
    res.json(devices);
    return;
  }
  if (!tenantId) { res.json([]); return; }
  const devices = await mongoService.getDevicesForTenant(tenantId, 200);
  res.json(devices);
});

dashboardRouter.get("/devices/:serialNumber/telemetry", authMiddleware, async (req, res) => {
  const rows = await mongoService.getRecentTelemetry(String(req.params.serialNumber), 30);
  res.json(rows);
});

dashboardRouter.get("/tenants", authMiddleware, async (_req, res) => {
  const tenants = await mongoService.getTenants(200);
  res.json(tenants);
});

dashboardRouter.get("/sites", authMiddleware, async (req, res) => {
  const { systemRole, tenantId } = (req as typeof req & { user: JwtPayload }).user;
  if (systemRole === "platform_admin") {
    const targetTenantId = req.query.tenantId as string;
    if (targetTenantId) {
      const sites = await mongoService.getSitesForTenant(targetTenantId);
      res.json(sites);
    } else {
      const sites = await mongoService.getSites(200);
      res.json(sites);
    }
  } else {
    if (!tenantId) {
      res.json([]);
      return;
    }
    const sites = await mongoService.getSitesForTenant(tenantId);
    res.json(sites);
  }
});
