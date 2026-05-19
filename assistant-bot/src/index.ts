import { setTimeout as delay } from "node:timers/promises";
import { backendClient } from "./backend-client";
import { config } from "./config";
import { logger } from "./logger";
import { getUpdates, sendMessage, TelegramUpdate } from "./telegram";
import { previewText } from "./formatters";
import { getPendingState } from "./session";
import { ensureDefaultTenant, handleDefaultTenantSelection, handleClaimFlow, handleDeviceActionConfirmation, handleOtaConfirmation } from "./handlers/pending";
import { handleCommand } from "./handlers/commands";

const telegramEnabled = !config.TELEGRAM_BOT_TOKEN.includes("placeholder");

async function processMessage(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.from) {
    return;
  }

  const chatId = message.chat.id;
  const text = message.text.trim();
  const displayName = [message.from.first_name, message.from.last_name].filter(Boolean).join(" ") || message.from.username;
  const pendingState = await getPendingState(chatId);

  logger.info(
    {
      event: "telegram.inbound",
      updateId: update.update_id,
      chatId,
      fromId: message.from.id,
      username: message.from.username,
      displayName,
      pendingKind: pendingState?.kind,
      textPreview: previewText(text),
      textLength: text.length,
    },
    "Received Telegram message",
  );

  if (await handleDefaultTenantSelection(chatId, text)) {
    return;
  }

  if (await handleClaimFlow(chatId, text)) {
    return;
  }

  if (await handleDeviceActionConfirmation(chatId, text)) {
    return;
  }

  if (await handleOtaConfirmation(chatId, text)) {
    return;
  }

  const identity = await backendClient.identifyTelegramUser({
    externalId: String(chatId),
    displayName,
    username: message.from.username,
  });

  if (identity.memberships.length === 0) {
    await sendMessage(chatId, "Your account is registered, but no tenant membership is configured yet. Please contact the platform administrator.");
    return;
  }

  if (identity.requiresDefaultTenantSelection) {
    const ready = await ensureDefaultTenant(chatId, identity.user.userId, identity.memberships);
    if (!ready) {
      return;
    }
  }

  await handleCommand(chatId, text, identity.user.userId, identity.memberships);
}

async function pollTelegramLoop(): Promise<never> {
  if (!telegramEnabled) {
    logger.warn("Telegram polling disabled because TELEGRAM_BOT_TOKEN is a placeholder");
    while (true) {
      await delay(config.TELEGRAM_POLL_INTERVAL_MS);
    }
  }

  let offset: number | undefined;
  while (true) {
    try {
      const updates = await getUpdates(offset);
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await processMessage(update);
        } catch (error) {
          logger.error({ err: error, updateId: update.update_id }, "Failed to process Telegram update");
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Telegram polling failed");
      await delay(config.TELEGRAM_POLL_INTERVAL_MS);
    }
  }
}

async function processNotificationQueueLoop(): Promise<never> {
  if (!telegramEnabled) {
    logger.warn("Notification delivery disabled because TELEGRAM_BOT_TOKEN is a placeholder");
    while (true) {
      await delay(config.NOTIFICATION_POLL_INTERVAL_MS);
    }
  }

  while (true) {
    try {
      const notifications = await backendClient.getPendingNotifications(20);
      for (const notification of notifications) {
        try {
          await backendClient.markNotificationProcessing(notification._id);
          const title = notification.title ? `${notification.title}\n` : "";
          await sendMessage(notification.targetExternalId, `${title}${notification.text}`);
          await backendClient.markNotificationSent(notification._id);
        } catch (error) {
          logger.error({ err: error, notificationId: notification._id }, "Failed to deliver queued notification");
          await backendClient.markNotificationFailed(
            notification._id,
            error instanceof Error ? error.message : "Unknown notification delivery error",
          );
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Notification queue polling failed");
    }

    await delay(config.NOTIFICATION_POLL_INTERVAL_MS);
  }
}

async function main(): Promise<void> {
  logger.info({ backendBaseUrl: config.BACKEND_BASE_URL }, "Assistant bot starting");
  await Promise.all([pollTelegramLoop(), processNotificationQueueLoop()]);
}

main().catch((error) => {
  logger.error({ err: error }, "Assistant bot failed to start");
  process.exit(1);
});
