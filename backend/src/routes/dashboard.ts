import { Router } from "express";
import { authMiddleware, hashPassword, requirePlatformAdmin } from "../auth";
import { mongoService } from "../mongodb";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", authMiddleware, async (_req, res) => {
  const stats = await mongoService.getDashboardStats();
  res.json(stats);
});

dashboardRouter.get("/devices", authMiddleware, async (_req, res) => {
  const devices = await mongoService.getDevices(200);
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
  const { username, password, displayName, systemRole } = req.body as {
    username?: string; password?: string; displayName?: string; systemRole?: string;
  };
  if (!username || !password || !displayName) {
    res.status(400).json({ error: "username, password, displayName are required" });
    return;
  }
  const role = systemRole === "platform_admin" ? "platform_admin" : "user";
  const passwordHash = await hashPassword(password);
  const userId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const user = await mongoService.createWebUser({ userId, username, passwordHash, displayName, systemRole: role });
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
