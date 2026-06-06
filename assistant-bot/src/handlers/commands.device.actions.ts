import { backendClient, Membership } from "../backend-client";
import { sendMessage } from "../telegram";
import { setPendingState } from "../session";
import { getActionLabel, buildDeviceActionConfirmation } from "../formatters";
import { resolveCommandDeviceIdentifier, canPerformDeviceAction, canPerformOta } from "../device-resolver";

export async function handleDeviceActionCommand(
  chatId: number,
  command: string,
  args: string[],
  userId: string,
  user: { userId: string; defaultTenantId?: string },
  refreshedMemberships: Membership[]
): Promise<boolean> {
  if (command === "/remove_device" || command === "/reboot_device" || command === "/factory_reset") {
    const identifier = args.join(" ").trim();
    if (!identifier) {
      await sendMessage(chatId, `Usage: ${command} <serial_number_or_device_id> [reason]`);
      return true;
    }

    const action = command === "/remove_device" ? "remove" : command === "/reboot_device" ? "reboot" : "factory_reset";
    try {
      const resolvedIdentifier = await resolveCommandDeviceIdentifier(identifier, user, refreshedMemberships, chatId, getActionLabel(action));
      if (!resolvedIdentifier) return true;

      const allowed = await canPerformDeviceAction(action, resolvedIdentifier, user.defaultTenantId, refreshedMemberships);
      if (!allowed) {
        const denialMessage = action === "factory_reset" ? "Chi platform admin moi co the thuc hien factory reset." : action === "remove" ? "Can quyen tenant admin tro len de xoa thiet bi." : "Ban can quyen site operator tro len de reboot thiet bi.";
        await sendMessage(chatId, denialMessage);
        return true;
      }

      const device = await backendClient.getDeviceHealth(resolvedIdentifier);
      await setPendingState(chatId, { kind: "confirming_device_action", userId, identifier: resolvedIdentifier, action, reason: undefined });
      await sendMessage(chatId, buildDeviceActionConfirmation(device, action));
    } catch {
      await sendMessage(chatId, "Device not found.");
    }
    return true;
  }

  if (command === "/ota_update") {
    const version = args[args.length - 1]?.trim();
    const identifier = args.slice(0, -1).join(" ").trim();
    if (!identifier || !version) {
      await sendMessage(chatId, "Usage: /ota_update <serial_number_or_device_id> <firmware_version>");
      return true;
    }

    try {
      const resolvedIdentifier = await resolveCommandDeviceIdentifier(identifier, user, refreshedMemberships, chatId, "cap nhat OTA");
      if (!resolvedIdentifier) return true;

      if (!canPerformOta(refreshedMemberships)) {
        await sendMessage(chatId, "Chi platform admin moi co the cap nhat firmware.");
        return true;
      }

      const device = await backendClient.getDeviceHealth(resolvedIdentifier);
      const policy = await backendClient.getFirmwarePolicy(resolvedIdentifier);
      await setPendingState(chatId, { kind: "confirming_ota", userId, identifier: resolvedIdentifier, version });

      const otaMessage = [
        "Confirm OTA update:",
        `Device: ${device.displayName ?? device.serialNumber}`,
        `Serial: ${device.serialNumber}`,
        `Current firmware: ${policy.currentVersion ?? "unknown"}`,
        `Target firmware: ${version}`,
        "The backend will only start this if the target version exists in the compatible firmware release catalog and has a URL.",
        "Send CONFIRM to continue, or CANCEL to stop.",
      ].join("\n");
      await sendMessage(chatId, otaMessage);
    } catch {
      await sendMessage(chatId, "Device not found.");
    }
    return true;
  }

  return false;
}
