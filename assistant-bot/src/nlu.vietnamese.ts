export function normalizeVietnameseText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function normalizeIdentifier(value: string): string {
  return normalizeVietnameseText(value).replace(/\s+/g, "");
}
