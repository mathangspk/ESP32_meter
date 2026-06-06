export function normalizeVietnameseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function cleanIdentifierCandidate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.replace(/^(?:cua|device|thiet bi)\s+/i, "").replace(/\s+/g, " ").trim() || undefined;
}

export function extractNamedDeviceFromEnergyQuestion(text: string): string | undefined {
  const patterns = [
    /^(?:hom nay|hom qua|7 ngay qua|bay ngay qua|tuan nay|tuan truoc|thang nay|thang truoc)\s+(.+?)\s+(?:dung bao nhieu dien|xai bao nhieu dien|tieu thu bao nhieu dien|tieu thu bao nhieu|bao nhieu dien|bao nhieu kwh)$/,
    /^tu(?: ngay)?\s+\d{1,2}\/\d{1,2}(?:\/\d{4})?\s+den(?: ngay)?\s+\d{1,2}\/\d{1,2}(?:\/\d{4})?\s+(.+?)\s+(?:dung bao nhieu dien|xai bao nhieu dien|tieu thu bao nhieu dien|tieu thu bao nhieu|bao nhieu dien|bao nhieu kwh)$/,
    /^(?:tong dien tieu thu|dien nang)\s+(.+?)\s+(?:cua)\s+(.+)$/,
    /^(?:tong dien tieu thu|dien nang)\s+(.+?)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const cleaned = cleanIdentifierCandidate(match?.[1]);
    if (cleaned) return cleaned;
  }

  const ofMatch = text.match(/(?:cua|cho)\s+(.+)$/);
  if (ofMatch) {
    const cleaned = cleanIdentifierCandidate(ofMatch[1]);
    if (cleaned) return cleaned;
  }
  return undefined;
}

export function extractDateMatches(text: string) {
  return Array.from(text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/g));
}

export function formatIsoDate(year: number, month: number, day: number): string {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function resolveDateToken(dayText: string, monthText: string, yearText: string | undefined, now = new Date()): string | undefined {
  const day = Number(dayText);
  const month = Number(monthText);
  const year = yearText ? Number(yearText) : now.getFullYear();
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (candidate.getUTCFullYear() !== year || candidate.getUTCMonth() !== month - 1 || candidate.getUTCDate() !== day) {
    return undefined;
  }
  return formatIsoDate(year, month, day);
}

export function asksEnergy(text: string): boolean {
  return (
    text.includes("bao nhieu dien") ||
    text.includes("dung bao nhieu") ||
    text.includes("tieu thu") ||
    text.includes("kwh") ||
    text.includes("ky dien") ||
    text.includes("dien nang") ||
    text.includes("xai bao nhieu")
  );
}
