export function parseLimit(query: unknown, defaultVal: number): number {
  const raw = Array.isArray(query) ? (query as unknown[])[0] : query;
  const n = Number(raw ?? defaultVal);
  return Number.isFinite(n) && n > 0 ? n : defaultVal;
}
