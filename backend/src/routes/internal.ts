import { Router } from "express";
import { ObjectId } from "mongodb";
import { mongoService } from "../mongodb";
import { parseLimit } from "./utils";

export const internalRouter = Router();

internalRouter.post("/telegram/identify", async (req, res) => {
  const body = req.body as { externalId?: string; displayName?: string; username?: string };
  if (!body.externalId) {
    res.status(400).json({ error: "externalId is required" });
    return;
  }
  const result = await mongoService.identifyTelegramUser(body as { externalId: string; displayName?: string; username?: string });
  res.json(result);
});

internalRouter.get("/users/:userId/memberships", async (req, res) => {
  const user = await mongoService.getUserById(req.params.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const memberships = await mongoService.getMembershipsForUser(req.params.userId);
  res.json({ user, memberships });
});

internalRouter.post("/users/:userId/default-tenant", async (req, res) => {
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

internalRouter.get("/users/:userId/tenants", async (req, res) => {
  const tenants = await mongoService.getTenantListForUser(req.params.userId);
  res.json(tenants);
});

internalRouter.get("/tenants/:tenantId/sites", async (req, res) => {
  const sites = await mongoService.getSitesForTenant(req.params.tenantId);
  res.json(sites);
});

internalRouter.get("/tenants/:tenantId/devices", async (req, res) => {
  const devices = await mongoService.getDevicesForTenant(req.params.tenantId, parseLimit(req.query.limit, 50));
  res.json(devices);
});

internalRouter.get("/notifications/pending", async (req, res) => {
  const notifications = await mongoService.getPendingNotifications(parseLimit(req.query.limit, 50));
  res.json(notifications);
});

internalRouter.get("/bot-sessions/:chatId", async (req, res) => {
  const session = await mongoService.getBotSession(req.params.chatId);
  if (!session) { res.status(404).json({ error: "Bot session not found" }); return; }
  res.json(session);
});

internalRouter.put("/bot-sessions/:chatId", async (req, res) => {
  const body = req.body as { state?: Record<string, unknown> };
  if (!body.state || typeof body.state !== "object") {
    res.status(400).json({ error: "state object is required" });
    return;
  }
  const session = await mongoService.upsertBotSession(req.params.chatId, body.state);
  res.json(session);
});

internalRouter.delete("/bot-sessions/:chatId", async (req, res) => {
  await mongoService.deleteBotSession(req.params.chatId);
  res.status(204).end();
});

internalRouter.post("/notifications/:notificationId/processing", async (req, res) => {
  await mongoService.markNotificationProcessing(new ObjectId(req.params.notificationId));
  res.status(204).end();
});

internalRouter.post("/notifications/:notificationId/sent", async (req, res) => {
  await mongoService.markNotificationSent(new ObjectId(req.params.notificationId));
  res.status(204).end();
});

internalRouter.post("/notifications/:notificationId/failed", async (req, res) => {
  const body = req.body as { error?: string };
  await mongoService.markNotificationFailed(
    new ObjectId(req.params.notificationId),
    body.error ?? "Unknown notification error",
  );
  res.status(204).end();
});
