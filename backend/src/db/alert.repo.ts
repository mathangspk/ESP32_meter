import { Collection, Db, Document, ObjectId } from "mongodb";
import { config } from "../config";
import { AlertEventRecord, NotificationQueueRecord, NotificationType } from "./types";

export class AlertRepo {
  private alertEvents: Collection<AlertEventRecord>;
  private notificationQueue: Collection<NotificationQueueRecord>;

  constructor(db: Db) {
    this.alertEvents = db.collection<AlertEventRecord>("alert_events");
    this.notificationQueue = db.collection<NotificationQueueRecord>("notification_queue");
  }

  async recordAlert(event: AlertEventRecord): Promise<void> {
    await this.alertEvents.insertOne(event);
  }

  async enqueueTelegramNotification(
    type: NotificationType,
    text: string,
    payload?: Document,
    options?: { tenantId?: string; userId?: string; title?: string; targetExternalId?: string },
  ): Promise<void> {
    const now = new Date();
    await this.notificationQueue.insertOne({
      type,
      channel: "telegram",
      targetExternalId: options?.targetExternalId ?? config.TELEGRAM_CHAT_ID,
      tenantId: options?.tenantId,
      userId: options?.userId,
      title: options?.title,
      text,
      payload,
      status: "pending",
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getPendingNotifications(limit = 50): Promise<NotificationQueueRecord[]> {
    return this.notificationQueue
      .find(
        { $or: [{ status: "pending" }, { status: "failed", attemptCount: { $lt: 3 } }] },
        { sort: { createdAt: 1 }, limit },
      )
      .toArray();
  }

  async markNotificationProcessing(notificationId: ObjectId): Promise<void> {
    const now = new Date();
    await this.notificationQueue.updateOne(
      { _id: notificationId },
      { $set: { status: "processing", processingAt: now, updatedAt: now }, $inc: { attemptCount: 1 } },
    );
  }

  async markNotificationSent(notificationId: ObjectId): Promise<void> {
    const now = new Date();
    await this.notificationQueue.updateOne(
      { _id: notificationId },
      { $set: { status: "sent", sentAt: now, updatedAt: now } },
    );
  }

  async markNotificationFailed(notificationId: ObjectId, errorMessage: string): Promise<void> {
    const now = new Date();
    await this.notificationQueue.updateOne(
      { _id: notificationId },
      { $set: { status: "failed", lastError: errorMessage, updatedAt: now } },
    );
  }
}
