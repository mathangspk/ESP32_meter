import { config } from "./config";

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
};

type TelegramGetUpdatesResponse = {
  ok: boolean;
  result: TelegramUpdate[];
};

const baseUrl = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;

export async function getUpdates(offset?: number): Promise<TelegramUpdate[]> {
  const url = new URL(`${baseUrl}/getUpdates`);
  url.searchParams.set("timeout", "25");
  if (offset !== undefined) {
    url.searchParams.set("offset", String(offset));
  }

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Telegram getUpdates failed: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as TelegramGetUpdatesResponse;
  if (!json.ok) {
    throw new Error("Telegram getUpdates returned ok=false");
  }

  return json.result;
}

export async function sendMessage(chatId: string | number, text: string): Promise<void> {
  const response = await fetch(`${baseUrl}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram sendMessage failed: ${response.status} ${await response.text()}`);
  }
}
