import { backendClient, Membership } from "../backend-client";
import { askGroq } from "../groq";
import { logger } from "../logger";
import { sendMessage } from "../telegram";
import { isPlatformAdmin, resolveCommandDeviceIdentifier, canManageDevice, getAccessibleDevices } from "../device-resolver";
import { setPendingState } from "../session";
import {
  formatMemberships,
  formatFleetSummary,
  formatUserSummary,
  formatDeviceList,
  formatSingleDevice,
  formatFirmwarePolicy,
  formatFleetFirmwarePolicy,
  getActionLabel,
  buildDeviceActionConfirmation,
} from "../formatters";
import { ensureDefaultTenant } from "./pending";
import { handleNaturalLanguageDeviceAction, handleFirmwareVersionQuestion, handleDeviceDetailQuestion, handleInventoryQuestion } from "./device";
import { handleAnalyticsQuestion } from "./analytics";

export async function handleNaturalLanguage(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
  if (await handleNaturalLanguageDeviceAction(chatId, text, user, memberships)) {
    return;
  }

  if (await handleFirmwareVersionQuestion(chatId, text, user, memberships)) {
    return;
  }

  if (await handleDeviceDetailQuestion(chatId, text, user, memberships)) {
    return;
  }

  if (await handleAnalyticsQuestion(chatId, text, user, memberships)) {
    return;
  }

  if (await handleInventoryQuestion(chatId, text, user, memberships)) {
    return;
  }

  const context = isPlatformAdmin(memberships)
    ? { fleetSummary: await backendClient.getFleetSummary() }
    : {
        tenantId: user.defaultTenantId,
        devices: user.defaultTenantId ? await backendClient.getDevicesForTenant(user.defaultTenantId, 20) : [],
      };

  try {
    const answer = await askGroq(text, context);
    await sendMessage(chatId, answer ?? "I could not generate an answer from the available context.");
  } catch (error) {
    logger.error({ err: error }, "Failed to answer with Groq");
    await sendMessage(chatId, "I could not answer that question right now. Please try a direct command such as /devices or /fleet_summary.");
  }
}

export async function handleCommand(chatId: number, text: string, userId: string, memberships: Membership[]) {
  const membershipPayload = await backendClient.getUserMemberships(userId);
  const user = membershipPayload.user;
  const refreshedMemberships = membershipPayload.memberships;

  if (!user.defaultTenantId) {
    const ready = await ensureDefaultTenant(chatId, userId, refreshedMemberships);
    if (!ready) {
      return;
    }
  }

  const [command, ...args] = text.split(/\s+/);
  switch (command) {
    case "/start": {
      if (refreshedMemberships.length === 0) {
        await sendMessage(chatId, "Your Telegram account is registered, but no tenant membership was found yet. Please contact the platform admin.");
        return;
      }

      if (user.defaultTenantId && refreshedMemberships.length > 1) {
        await sendMessage(chatId, `Welcome back. Your default tenant is ${user.defaultTenantId}. Use /set_default_tenant to change it.`);
        return;
      }

      await sendMessage(chatId, `Welcome back. Your default tenant is ${user.defaultTenantId ?? refreshedMemberships[0].tenantId}.`);
      return;
    }

    case "/set_default_tenant": {
      await setPendingState(chatId, {
        kind: "awaiting_default_tenant",
        userId,
        memberships: refreshedMemberships,
      });
      await sendMessage(chatId, `Choose a new default tenant:\n${formatMemberships(refreshedMemberships)}`);
      return;
    }

    case "/add_device": {
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
            ].join("\n"),
          );
          return;
        } catch {
          await sendMessage(chatId, "Could not continue the claim flow right now. Please try /add_device again.");
          return;
        }
      }

      await setPendingState(chatId, {
        kind: "awaiting_claim_serial",
        userId,
        tenantId: user.defaultTenantId,
      });
      await sendMessage(chatId, "Send the serial number of the device you want to claim.");
      return;
    }

    case "/fleet_summary": {
      if (!isPlatformAdmin(refreshedMemberships)) {
        await sendMessage(chatId, "You do not have permission to view the global fleet summary.");
        return;
      }

      const summary = await backendClient.getFleetSummary();
      await sendMessage(chatId, formatFleetSummary(summary));
      return;
    }

    case "/unclaimed_devices": {
      if (!isPlatformAdmin(refreshedMemberships)) {
        await sendMessage(chatId, "You do not have permission to view unclaimed devices.");
        return;
      }

      const devices = await backendClient.getUnclaimedDevices(false);
      await sendMessage(chatId, formatDeviceList("Unclaimed devices", devices));
      return;
    }

    case "/online_unclaimed": {
      if (!isPlatformAdmin(refreshedMemberships)) {
        await sendMessage(chatId, "You do not have permission to view online unclaimed devices.");
        return;
      }

      const devices = await backendClient.getUnclaimedDevices(true);
      await sendMessage(chatId, formatDeviceList("Online unclaimed devices", devices));
      return;
    }

    case "/active_users": {
      if (!isPlatformAdmin(refreshedMemberships)) {
        await sendMessage(chatId, "You do not have permission to view user summary.");
        return;
      }

      const summary = await backendClient.getUserSummary();
      await sendMessage(chatId, formatUserSummary(summary));
      return;
    }

    case "/tenants": {
      if (!isPlatformAdmin(refreshedMemberships)) {
        await sendMessage(chatId, "You do not have permission to view tenants.");
        return;
      }

      const tenants = await backendClient.getAdminTenants();
      await sendMessage(
        chatId,
        tenants.length === 0 ? "No tenants found." : ["Tenants:", ...tenants.map((tenant) => `- ${tenant.name} (${tenant.tenantId})`)].join("\n"),
      );
      return;
    }

    case "/sites": {
      if (!isPlatformAdmin(refreshedMemberships)) {
        await sendMessage(chatId, "You do not have permission to view sites.");
        return;
      }

      const sites = await backendClient.getAdminSites();
      await sendMessage(
        chatId,
        sites.length === 0 ? "No sites found." : ["Sites:", ...sites.map((site) => `- ${site.name} (${site.siteId}) in tenant ${site.tenantId}`)].join("\n"),
      );
      return;
    }

    case "/devices": {
      if (!user.defaultTenantId) {
        await sendMessage(chatId, "Please set your default tenant first with /set_default_tenant.");
        return;
      }

      const devices = await backendClient.getDevicesForTenant(user.defaultTenantId, 20);
      await sendMessage(chatId, formatDeviceList(`Devices in tenant ${user.defaultTenantId}`, devices));
      return;
    }

    case "/device": {
      const identifier = args.join(" ").trim();
      if (!identifier) {
        await sendMessage(chatId, "Usage: /device <serial_number_or_device_id>");
        return;
      }

      try {
        const resolvedIdentifier = await resolveCommandDeviceIdentifier(identifier, user, refreshedMemberships, chatId, "xem");
        if (!resolvedIdentifier) {
          return;
        }

        const device = await backendClient.getDeviceHealth(resolvedIdentifier);
        await sendMessage(chatId, formatSingleDevice(device));
      } catch {
        await sendMessage(chatId, "Device not found.");
      }
      return;
    }

    case "/firmware_policy": {
      const identifier = args.join(" ").trim();
      if (identifier) {
        try {
          const resolvedIdentifier = await resolveCommandDeviceIdentifier(identifier, user, refreshedMemberships, chatId, "xem firmware");
          if (!resolvedIdentifier) {
            return;
          }

          const policy = await backendClient.getFirmwarePolicy(resolvedIdentifier);
          await sendMessage(chatId, formatFirmwarePolicy(policy));
        } catch {
          await sendMessage(chatId, "Device not found.");
        }
        return;
      }

      if (!isPlatformAdmin(refreshedMemberships)) {
        await sendMessage(chatId, "Usage: /firmware_policy <serial_number_or_device_id>");
        return;
      }

      const policies = await backendClient.getFleetFirmwarePolicy(20);
      await sendMessage(chatId, formatFleetFirmwarePolicy(policies));
      return;
    }

    case "/remove_device":
    case "/reboot_device":
    case "/factory_reset": {
      const identifier = args.join(" ").trim();
      if (!identifier) {
        await sendMessage(chatId, `Usage: ${command} <serial_number_or_device_id> [reason]`);
        return;
      }

      const action = command === "/remove_device" ? "remove" : command === "/reboot_device" ? "reboot" : "factory_reset";
      try {
        const resolvedIdentifier = await resolveCommandDeviceIdentifier(identifier, user, refreshedMemberships, chatId, getActionLabel(action));
        if (!resolvedIdentifier) {
          return;
        }

        const allowed = await canManageDevice(resolvedIdentifier, user.defaultTenantId, refreshedMemberships);
        if (!allowed) {
          await sendMessage(chatId, "You do not have permission to manage this device.");
          return;
        }

        const device = await backendClient.getDeviceHealth(resolvedIdentifier);
        const reason = undefined;
        await setPendingState(chatId, {
          kind: "confirming_device_action",
          userId,
          identifier: resolvedIdentifier,
          action,
          reason,
        });

        await sendMessage(chatId, buildDeviceActionConfirmation(device, action));
      } catch {
        await sendMessage(chatId, "Device not found.");
      }
      return;
    }

    case "/ota_update": {
      const version = args[args.length - 1]?.trim();
      const identifier = args.slice(0, -1).join(" ").trim();
      if (!identifier || !version) {
        await sendMessage(chatId, "Usage: /ota_update <serial_number_or_device_id> <firmware_version>");
        return;
      }

      try {
        const resolvedIdentifier = await resolveCommandDeviceIdentifier(identifier, user, refreshedMemberships, chatId, "cap nhat OTA");
        if (!resolvedIdentifier) {
          return;
        }

        const allowed = await canManageDevice(resolvedIdentifier, user.defaultTenantId, refreshedMemberships);
        if (!allowed) {
          await sendMessage(chatId, "You do not have permission to update this device.");
          return;
        }

        const device = await backendClient.getDeviceHealth(resolvedIdentifier);
        const policy = await backendClient.getFirmwarePolicy(resolvedIdentifier);
        await setPendingState(chatId, {
          kind: "confirming_ota",
          userId,
          identifier: resolvedIdentifier,
          version,
        });

        await sendMessage(
          chatId,
          [
            "Confirm OTA update:",
            `Device: ${device.displayName ?? device.serialNumber}`,
            `Serial: ${device.serialNumber}`,
            `Current firmware: ${policy.currentVersion ?? "unknown"}`,
            `Target firmware: ${version}`,
            "The backend will only start this if the target version exists in the compatible firmware release catalog and has a URL.",
            "Send CONFIRM to continue, or CANCEL to stop.",
          ].join("\n"),
        );
      } catch {
        await sendMessage(chatId, "Device not found.");
      }
      return;
    }

    default:
      await handleNaturalLanguage(chatId, text, user, refreshedMemberships);
  }
}
