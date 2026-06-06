import { backendClient, Membership } from "../backend-client";
import { sendMessage } from "../telegram";
import { formatDeviceList, formatSingleDevice, formatFirmwarePolicy, formatFleetFirmwarePolicy } from "../formatters";
import { resolveCommandDeviceIdentifier, isPlatformAdmin } from "../device-resolver";
import { handleAddDeviceCommand } from "./commands.device.add";

export async function handleDeviceCommand(
  chatId: number,
  command: string,
  args: string[],
  userId: string,
  user: { userId: string; defaultTenantId?: string },
  refreshedMemberships: Membership[]
): Promise<boolean> {
  switch (command) {
    case "/add_device": {
      await handleAddDeviceCommand(chatId, args, userId, user);
      return true;
    }

    case "/devices": {
      if (!user.defaultTenantId) {
        await sendMessage(chatId, "Please set your default tenant first with /set_default_tenant.");
        return true;
      }
      const devices = await backendClient.getDevicesForTenant(user.defaultTenantId, 20);
      await sendMessage(chatId, formatDeviceList(`Devices in tenant ${user.defaultTenantId}`, devices));
      return true;
    }

    case "/device": {
      const identifier = args.join(" ").trim();
      if (!identifier) {
        await sendMessage(chatId, "Usage: /device <serial_number_or_device_id>");
        return true;
      }
      try {
        const resolvedIdentifier = await resolveCommandDeviceIdentifier(identifier, user, refreshedMemberships, chatId, "xem");
        if (resolvedIdentifier) {
          const device = await backendClient.getDeviceHealth(resolvedIdentifier);
          await sendMessage(chatId, formatSingleDevice(device));
        }
      } catch {
        await sendMessage(chatId, "Device not found.");
      }
      return true;
    }

    case "/firmware_policy": {
      const identifier = args.join(" ").trim();
      if (identifier) {
        try {
          const resolvedIdentifier = await resolveCommandDeviceIdentifier(identifier, user, refreshedMemberships, chatId, "xem firmware");
          if (resolvedIdentifier) {
            const policy = await backendClient.getFirmwarePolicy(resolvedIdentifier);
            await sendMessage(chatId, formatFirmwarePolicy(policy));
          }
        } catch {
          await sendMessage(chatId, "Device not found.");
        }
        return true;
      }

      if (!isPlatformAdmin(refreshedMemberships)) {
        await sendMessage(chatId, "Usage: /firmware_policy <serial_number_or_device_id>");
        return true;
      }

      const policies = await backendClient.getFleetFirmwarePolicy(20);
      await sendMessage(chatId, formatFleetFirmwarePolicy(policies));
      return true;
    }
  }

  return false;
}
