import { z } from "zod";
import { config } from "./config";

export async function request<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("X-Internal-Key", config.JWT_SECRET);
  const response = await fetch(`${config.BACKEND_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Backend request failed: ${response.status} ${body}`);
  }

  if (response.status === 204) {
    return schema.parse(undefined);
  }

  const json = await response.json();
  return schema.parse(json);
}
