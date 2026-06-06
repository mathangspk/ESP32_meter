import { backendClient, Membership } from "../backend-client";
import { sendMessage } from "../telegram";
import { getActionLabel, buildDeviceActionConfirmation } from "../formatters";
import { resolveAccessibleDevice, canPerformDeviceAction } from "../device-resolver";
import { setPendingState } from "../session";
import { parseNaturalLanguageDeviceAction } from "../nlu";

export async function handleNaturalLanguageDeviceAction(
  chatId: number,
  text: string,
  user: { userId: string; defaultTenantId?: string },
  memberships: Membership[]
): Promise<boolean> {
  const parsed = parseNaturalLanguageDeviceAction(text);
  if (!parsed) return false;

  const { devices, device } = await resolveAccessibleDevice(parsed.identifier, user, memberships);
  if (devices.length === 0) {
    await sendMessage(chatId, "Khong tim thay thiet bi nao trong pham vi ban co quyen quan ly.");
    return true;
  }

  if (!device) {
    await sendMessage(
      chatId,
      parsed.identifier
        ? `Minh chua xac dinh duoc chinh xac thiet bi ban muon ${getActionLabel(parsed.action)}. Hay gui lai serial, device ID, hoac ten thiet bi dung hon.`
        : `Ban muon ${getActionLabel(parsed.action)} thiet bi nao? Hien co: ${devices.map((candidate) => candidate.displayName ?? candidate.serialNumber).join(", ")}`
    );
    return true;
  }

  const allowed = await canPerformDeviceAction(parsed.action, device.serialNumber, user.defaultTenantId, memberships);
  if (!allowed) {
    await sendMessage(chatId, "Ban khong co quyen thuc hien thao tac nay voi thiet bi.");
    return true;
  }

  const details = await backendClient.getDeviceHealth(device.serialNumber);
  await setPendingState(chatId, {
    kind: "confirming_device_action",
    userId: user.userId,
    identifier: device.serialNumber,
    action: parsed.action,
  });

  await sendMessage(chatId, buildDeviceActionConfirmation(details, parsed.action));
  return true;
}
