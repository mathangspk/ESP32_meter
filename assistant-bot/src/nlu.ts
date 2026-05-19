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

export function parseDeviceDetailIdentifier(question: string): string | undefined {
  const trimmed = question.trim();
  const directMatch = trimmed.match(/\b([A-Fa-f0-9]{8,}|[A-Za-z]{2}\d{3,}|SN\d+|\d+)\b/);
  return directMatch?.[1];
}

export function parseDeviceDetailReference(question: string): string | undefined {
  const explicitIdentifier = parseDeviceDetailIdentifier(question);
  if (explicitIdentifier) {
    return explicitIdentifier;
  }

  const text = normalizeVietnameseText(question);
  const patterns = [
    /^(?:thong tin thiet bi|thong tin device|device info|device detail|xem thiet bi|xem device)\s+(.+)$/,
    /^(?:toi muon xem|xem)\s+(.+)$/,
    /^(?:serial cua|firmware cua|phien ban hien tai cua)\s+(.+)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

export function looksLikeFirmwareVersionQuestion(question: string): boolean {
  const text = normalizeVietnameseText(question);
  return (
    text.includes("phien ban") ||
    text.includes("firmware") ||
    text.includes("version")
  );
}

export function parseFirmwareQuestionIdentifier(question: string): string | undefined {
  const explicitIdentifier = parseDeviceDetailIdentifier(question);
  if (explicitIdentifier) {
    return explicitIdentifier;
  }

  const text = normalizeVietnameseText(question);
  const patterns = [
    /^(?:phien ban firmware|phien ban hien tai cua|firmware cua)\s+(.+?)(?:\s+co can nang cap khong|\s+la bao nhieu|\s+la gi|\?|$)/,
    /^(.+?)\s+(?:dang chay firmware nao|co can nang cap khong)$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate) {
      return candidate;
    }
  }

  return parseDeviceDetailReference(question);
}

export function asksLatestAvailableFirmware(question: string): boolean {
  const text = normalizeVietnameseText(question);
  return (
    (text.includes("moi nhat") || text.includes("latest")) &&
    (text.includes("tren he thong") || text.includes("server") || text.includes("release") || text.includes("firmware"))
  );
}

export function asksFirmwareUpgradeNeed(question: string): boolean {
  const text = normalizeVietnameseText(question);
  return text.includes("co can nang cap khong") || text.includes("can nang cap khong") || text.includes("co update khong");
}

export function parseNaturalLanguageDeviceAction(question: string):
  | {
      action: "remove" | "reboot" | "factory_reset";
      identifier?: string;
    }
  | undefined {
  const text = normalizeVietnameseText(question);

  const patterns: Array<{
    action: "remove" | "reboot" | "factory_reset";
    match: RegExp;
  }> = [
    {
      action: "factory_reset",
      match: /^(?:factory\s*reset|reset\s+factory|khoi\s+phuc\s+cai\s+dat\s+goc|xoa\s+cai\s+dat\s+goc)\s+(?:device\s+|thiet\s+bi\s+)?(.+)$/,
    },
    { action: "remove", match: /^(?:remove|xoa|go\s+bo)\s+(?:device\s+|thiet\s+bi\s+)?(.+)$/ },
    { action: "reboot", match: /^(?:reboot|restart|khoi\s+dong\s+lai)\s+(?:device\s+|thiet\s+bi\s+)?(.+)$/ },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.match);
    if (!match) {
      continue;
    }

    const identifier = match[1]?.trim();
    return {
      action: pattern.action,
      identifier: identifier && identifier.length > 0 ? identifier : undefined,
    };
  }

  if (text === "factory reset" || text === "remove device" || text === "reboot device") {
    return {
      action: text === "factory reset" ? "factory_reset" : text === "reboot device" ? "reboot" : "remove",
    };
  }

  return undefined;
}

export function looksLikeDeviceDetailQuestion(question: string): boolean {
  const text = normalizeVietnameseText(question);
  return (
    text.includes("chi tiet") ||
    text.includes("thong tin device") ||
    text.includes("thong tin thiet bi") ||
    text.includes("thong tin cua") ||
    text.includes("xem thiet bi") ||
    text.startsWith("xem ") ||
    text.startsWith("toi muon xem ") ||
    text.includes("device info") ||
    text.includes("device detail")
  );
}
