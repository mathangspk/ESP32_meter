import { backendClient } from "./backend-client";
import { logger } from "./logger";
import { sendMessage, TelegramUpdate } from "./telegram";
import { previewText } from "./formatters";
import { getPendingState } from "./session";
import { ensureDefaultTenant, handleDefaultTenantSelection, handleClaimFlow, handleDeviceActionConfirmation, handleOtaConfirmation } from "./handlers/pending";
import { handleCommand } from "./handlers/commands";

export async function processMessage(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.from) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const displayName = [message.from.first_name, message.from.last_name].filter(Boolean).join(" ") || message.from.username;
  const pendingState = await getPendingState(chatId);

  logger.info({
    event: "telegram.inbound", updateId: update.update_id, chatId, fromId: message.from.id,
    username: message.from.username, displayName, pendingKind: pendingState?.kind,
    textPreview: previewText(text), textLength: text.length,
  }, "Received Telegram message");

  if (await handleDefaultTenantSelection(chatId, text)) return;
  if (await handleClaimFlow(chatId, text)) return;
  if (await handleDeviceActionConfirmation(chatId, text)) return;
  if (await handleOtaConfirmation(chatId, text)) return;

  const identity = await backendClient.identifyTelegramUser({
    externalId: String(chatId), displayName, username: message.from.username,
  });

  if (identity.memberships.length === 0) {
    await sendMessage(chatId, "Your account is registered, but no tenant membership is configured yet. Please contact the platform administrator.");
    return;
  }

  if (identity.requiresDefaultTenantSelection) {
    const ready = await ensureDefaultTenant(chatId, identity.user.userId, identity.memberships);
    if (!ready) return;
  }

  await handleCommand(chatId, text, identity.user.userId, identity.memberships);
}
