import { z } from "zod";
import { request } from "./backend-client.request";
import { config } from "./config";
import { notificationSchema, botSessionSchema } from "./backend-client.types.user";

export const sessionClient = {
  getPendingNotifications: (limit = 20) =>
    request(`/internal/notifications/pending?limit=${limit}`, { method: "GET" }, z.array(notificationSchema)),

  getBotSession: async (chatId: number) => {
    const response = await fetch(
      `${config.BACKEND_BASE_URL}/internal/bot-sessions/${encodeURIComponent(String(chatId))}`,
      {
        method: "GET",
        headers: { "X-Internal-Key": config.JWT_SECRET },
      }
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Failed to get bot session: ${response.status}`);
    return botSessionSchema.parse(await response.json());
  },

  saveBotSession: (chatId: number, state: unknown) =>
    request(
      `/internal/bot-sessions/${encodeURIComponent(String(chatId))}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      },
      botSessionSchema.nullable()
    ),

  deleteBotSession: async (chatId: number) => {
    const response = await fetch(
      `${config.BACKEND_BASE_URL}/internal/bot-sessions/${encodeURIComponent(String(chatId))}`,
      {
        method: "DELETE",
        headers: { "X-Internal-Key": config.JWT_SECRET },
      }
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete bot session: ${response.status}`);
    }
  },

  markNotificationProcessing: async (notificationId: string) => {
    const response = await fetch(
      `${config.BACKEND_BASE_URL}/internal/notifications/${notificationId}/processing`,
      {
        method: "POST",
        headers: { "X-Internal-Key": config.JWT_SECRET },
      }
    );
    if (!response.ok) throw new Error(`Failed to mark notification processing: ${response.status}`);
  },

  markNotificationSent: async (notificationId: string) => {
    const response = await fetch(
      `${config.BACKEND_BASE_URL}/internal/notifications/${notificationId}/sent`,
      {
        method: "POST",
        headers: { "X-Internal-Key": config.JWT_SECRET },
      }
    );
    if (!response.ok) throw new Error(`Failed to mark notification sent: ${response.status}`);
  },

  markNotificationFailed: async (notificationId: string, error: string) => {
    const response = await fetch(
      `${config.BACKEND_BASE_URL}/internal/notifications/${notificationId}/failed`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": config.JWT_SECRET,
        },
        body: JSON.stringify({ error }),
      }
    );
    if (!response.ok) throw new Error(`Failed to mark notification failed: ${response.status}`);
  },
};
