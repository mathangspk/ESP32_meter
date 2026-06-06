import { config } from "./config";

export async function requestGroq(
  messages: Array<{ role: "system" | "user"; content: string }>
): Promise<string | null> {
  if (!config.GROQ_API_KEY) {
    return null;
  }

  const response = await fetch(`${config.GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.GROQ_MODEL,
      temperature: 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq request failed: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  return json.choices?.[0]?.message?.content?.trim() ?? null;
}
