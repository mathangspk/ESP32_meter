import { setTimeout as delay } from "node:timers/promises";
import { backendClient } from "./backend-client";
import { config } from "./config";
import { logger } from "./logger";
import { getUpdates, sendMessage } from "./telegram";
import { processMessage } from "./message-processor";

const telegramEnabled = !config.TELEGRAM_BOT_TOKEN.includes("placeholder");

async function pollTelegramLoop(): Promise<never> {
  if (!telegramEnabled) {
    logger.warn("Telegram polling disabled because TELEGRAM_BOT_TOKEN is a placeholder");
    while (true) await delay(config.TELEGRAM_POLL_INTERVAL_MS);
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
    while (true) await delay(config.NOTIFICATION_POLL_INTERVAL_MS);
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
