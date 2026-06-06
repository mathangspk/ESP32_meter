import { backendClient } from "../backend-client";
import { sendMessage } from "../telegram";
import { setPendingState } from "../session";

export async function handleAddDeviceCommand(
  chatId: number,
  args: string[],
  userId: string,
  user: { userId: string; defaultTenantId?: string }
): Promise<void> {
  if (!user.defaultTenantId) {
    await sendMessage(chatId, "Please set your default tenant first with /set_default_tenant.");
    return;
  }

  const providedSerial = args.join(" ").trim();
  if (providedSerial) {
    try {
      const sites = await backendClient.getSitesForTenant(user.defaultTenantId);
      if (sites.length === 0) {
        await sendMessage(chatId, "No active site is available in your default tenant. Please contact your tenant admin.");
        return;
      }

      await setPendingState(chatId, {
        kind: "awaiting_claim_site",
        userId,
        tenantId: user.defaultTenantId,
        serialNumber: providedSerial,
        sites,
      });

      await sendMessage(
        chatId,
        [
          `Serial number received: ${providedSerial}`,
          "Choose a site by sending its number or site ID:",
          ...sites.map((site, index) => `${index + 1}. ${site.name} (${site.siteId})`),
        ].join("\n")
      );
    } catch {
      await sendMessage(chatId, "Could not continue the claim flow right now. Please try /add_device again.");
    }
    return;
  }

  await setPendingState(chatId, {
    kind: "awaiting_claim_serial",
    userId,
    tenantId: user.defaultTenantId,
  });
  await sendMessage(chatId, "Send the serial number of the device you want to claim.");
}
