import { normalizeVietnameseText } from "./nlu.vietnamese";

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
    if (!match) continue;

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
