import { backendClient, Membership } from "../backend-client";
import { parseInventoryIntent } from "../groq";
import { sendMessage } from "../telegram";
import { getAccessibleDevices } from "../device-resolver";

function formatManagedDeviceLabel(device: Awaited<ReturnType<typeof backendClient.getDevices>>[number]): string {
  const label = device.displayName ?? device.serialNumber;
  return `${label} (${device.serialNumber})`;
}

export async function handleInventoryQuestion(
  chatId: number,
  text: string,
  user: { userId: string; defaultTenantId?: string },
  memberships: Membership[]
): Promise<boolean> {
  const intent = await parseInventoryIntent(text);
  if (intent.intent === "unknown") return false;

  const devices = await getAccessibleDevices(user, memberships);
  const count = devices.length;
  const names = devices.map(formatManagedDeviceLabel);

  if (count === 0) {
    await sendMessage(chatId, "Hiện bạn chưa quản lý thiết bị nào trong phạm vi tài khoản này.");
    return true;
  }

  if (intent.intent === "get_managed_device_count") {
    await sendMessage(chatId, `Hiện bạn đang quản lý ${count} thiết bị.`);
    return true;
  }

  if (intent.intent === "get_managed_device_list") {
    await sendMessage(chatId, `Các thiết bị bạn đang quản lý: ${names.join(", ")}.`);
    return true;
  }

  await sendMessage(chatId, `Hiện bạn đang quản lý ${count} thiết bị: ${names.join(", ")}.`);
  return true;
}
