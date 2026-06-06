import { backendClient, Membership } from "../backend-client";
import { sendMessage } from "../telegram";
import { isPlatformAdmin } from "../device-resolver";
import { formatFleetSummary, formatDeviceList, formatUserSummary } from "../formatters";

export async function handleAdminCommand(
  chatId: number,
  command: string,
  memberships: Membership[]
): Promise<boolean> {
  if (!isPlatformAdmin(memberships)) {
    const adminCommands = ["/fleet_summary", "/unclaimed_devices", "/online_unclaimed", "/active_users", "/tenants", "/sites"];
    if (adminCommands.includes(command)) {
      await sendMessage(chatId, "You do not have permission to run this admin command.");
      return true;
    }
    return false;
  }

  switch (command) {
    case "/fleet_summary": {
      const summary = await backendClient.getFleetSummary();
      await sendMessage(chatId, formatFleetSummary(summary));
      return true;
    }
    case "/unclaimed_devices": {
      const devices = await backendClient.getUnclaimedDevices(false);
      await sendMessage(chatId, formatDeviceList("Unclaimed devices", devices));
      return true;
    }
    case "/online_unclaimed": {
      const devices = await backendClient.getUnclaimedDevices(true);
      await sendMessage(chatId, formatDeviceList("Online unclaimed devices", devices));
      return true;
    }
    case "/active_users": {
      const summary = await backendClient.getUserSummary();
      await sendMessage(chatId, formatUserSummary(summary));
      return true;
    }
    case "/tenants": {
      const tenants = await backendClient.getAdminTenants();
      await sendMessage(
        chatId,
        tenants.length === 0
          ? "No tenants found."
          : ["Tenants:", ...tenants.map((tenant) => `- ${tenant.name} (${tenant.tenantId})`)].join("\n")
      );
      return true;
    }
    case "/sites": {
      const sites = await backendClient.getAdminSites();
      await sendMessage(
        chatId,
        sites.length === 0
          ? "No sites found."
          : ["Sites:", ...sites.map((site) => `- ${site.name} (${site.siteId}) in tenant ${site.tenantId}`)].join("\n")
      );
      return true;
    }
  }

  return false;
}
