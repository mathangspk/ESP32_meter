import { Router } from "express";
import { authMiddleware, hashPassword, requirePlatformAdmin } from "../auth";
import { mongoService } from "../mongodb";

export const usersRouter = Router();

usersRouter.get("/", authMiddleware, requirePlatformAdmin, async (_req, res) => {
  const users = await mongoService.listWebUsers(200);
  const safe = users.map(({ passwordHash: _ph, ...u }) => u);
  res.json(safe);
});

usersRouter.post("/", authMiddleware, requirePlatformAdmin, async (req, res) => {
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

usersRouter.put("/:userId", authMiddleware, requirePlatformAdmin, async (req, res) => {
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

usersRouter.delete("/:userId", authMiddleware, requirePlatformAdmin, async (req, res) => {
  await mongoService.deleteWebUser(String(req.params.userId));
  res.status(204).end();
});
