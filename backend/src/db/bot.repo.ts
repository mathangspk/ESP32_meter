import { Collection, Db, Document } from "mongodb";
import { BotSessionRecord } from "./types";

export class BotRepo {
  private botSessions: Collection<BotSessionRecord>;

  constructor(db: Db) {
    this.botSessions = db.collection<BotSessionRecord>("bot_sessions");
  }

  async getBotSession(chatId: string): Promise<BotSessionRecord | null> {
    return this.botSessions.findOne({ chatId });
  }

  async upsertBotSession(chatId: string, state: Document): Promise<BotSessionRecord | null> {
    const now = new Date();
    await this.botSessions.updateOne(
      { chatId },
      {
        $set: { state, updatedAt: now },
        $setOnInsert: { chatId, createdAt: now },
      },
      { upsert: true },
    );
    return this.getBotSession(chatId);
  }

  async deleteBotSession(chatId: string): Promise<void> {
    await this.botSessions.deleteOne({ chatId });
  }
}
