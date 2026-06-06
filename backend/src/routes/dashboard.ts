import { Router } from "express";
import { authMiddleware, hashPassword, requirePlatformAdmin, type JwtPayload } from "../auth";
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

dashboardRouter.get("/users", authMiddleware, requirePlatformAdmin, async (_req, res) => {
  const users = await mongoService.listWebUsers(200);
  const safe = users.map(({ passwordHash: _ph, ...u }) => u);
  res.json(safe);
});

dashboardRouter.post("/users", authMiddleware, requirePlatformAdmin, async (req, res) => {
  const { username, password, displayName, systemRole, tenantId } = req.body as {
    username?: string; password?: string; displayName?: string; systemRole?: string; tenantId?: string;
  };
  if (!username || !password || !displayName) {
    res.status(400).json({ error: "username, password, displayName are required" });
    return;
  }
  const role = systemRole === "platform_admin" ? "platform_admin" : "user";
  const passwordHash = await hashPassword(password);
  const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const user = await mongoService.createWebUser({ userId, username, passwordHash, displayName, systemRole: role, defaultTenantId: tenantId });
  const { passwordHash: _ph, ...safe } = user;
  res.status(201).json(safe);
});

dashboardRouter.put("/users/:userId", authMiddleware, requirePlatformAdmin, async (req, res) => {
  const { displayName, systemRole, status } = req.body as {
    displayName?: string; systemRole?: string; status?: string;
  };
  const patch: Record<string, unknown> = {};
  if (displayName) patch.displayName = displayName;
  if (systemRole === "platform_admin" || systemRole === "user") patch.systemRole = systemRole;
  if (status === "active" || status === "suspended") patch.status = status;
  await mongoService.updateWebUser(String(req.params.userId), patch as Parameters<typeof mongoService.updateWebUser>[1]);
  res.status(204).end();
});

dashboardRouter.delete("/users/:userId", authMiddleware, requirePlatformAdmin, async (req, res) => {
  await mongoService.deleteWebUser(String(req.params.userId));
  res.status(204).end();
});

dashboardRouter.get("/tenants", authMiddleware, requirePlatformAdmin, async (_req, res) => {
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
