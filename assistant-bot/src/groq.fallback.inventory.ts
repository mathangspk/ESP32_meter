import { InventoryIntent } from "./groq.types";

export function fallbackParseInventoryIntent(question: string): InventoryIntent {
  const text = question.toLowerCase();
  const asksSpecificDeviceDetail =
    text.includes("thông tin thiết bị") ||
    text.includes("thong tin thiet bi") ||
    text.includes("thông tin device") ||
    text.includes("thong tin device") ||
    text.includes("xem thiết bị") ||
    text.includes("xem thiet bi") ||
    text.startsWith("xem ") ||
    text.startsWith("toi muon xem ");
  const asksMeasurement =
    text.includes("giá trị") ||
    text.includes("gia tri") ||
    text.includes("hiện tại") ||
    text.includes("hien tai") ||
    text.includes("điện áp") ||
    text.includes("dien ap") ||
    text.includes("công suất") ||
    text.includes("cong suat") ||
    text.includes("dòng") ||
    text.includes("dong") ||
    text.includes("current") ||
    text.includes("power") ||
    text.includes("voltage");
  const asksCount = text.includes("bao nhiêu thiết bị") || text.includes("bao nhieu thiet bi") || text.includes("how many devices");
  const asksNames =
    text.includes("tên gì") ||
    text.includes("ten gi") ||
    text.includes("thiết bị nào") ||
    text.includes("thiet bi nao") ||
    text.includes("danh sách thiết bị") ||
    text.includes("danh sach thiet bi") ||
    text.includes("list devices") ||
    text.includes("device names");
  const asksManagedScope = text.includes("quản lý") || text.includes("quan ly") || text.includes("my devices") || text.includes("managed devices");

  if (asksMeasurement || asksSpecificDeviceDetail) {
    return { intent: "unknown", confidence: 0 };
  }

  if ((asksCount && asksNames) || (asksManagedScope && asksNames)) {
    return { intent: "get_managed_device_summary", confidence: 0.5 };
  }

  if (asksNames) {
    return { intent: "get_managed_device_list", confidence: 0.5 };
  }

  if (asksCount || asksManagedScope) {
    return { intent: "get_managed_device_count", confidence: 0.5 };
  }

  return { intent: "unknown", confidence: 0 };
}
