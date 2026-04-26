import { config } from "./config";

export async function askGroq(question: string, context: unknown): Promise<string | null> {
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
      messages: [
        {
          role: "system",
          content:
            "You are an operations assistant for an IoT power monitoring platform. Only answer using the provided context. If the context is missing information, say so directly. Keep answers concise and practical.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nContext:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
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
