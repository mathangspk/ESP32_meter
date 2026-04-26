import { setTimeout as delay } from "node:timers/promises";
import { backendClient, Membership } from "./backend-client";
import { config } from "./config";
import { askGroq } from "./groq";
import { logger } from "./logger";
import { getUpdates, sendMessage, TelegramUpdate } from "./telegram";

type PendingState =
  | {
      kind: "awaiting_default_tenant";
      userId: string;
      memberships: Membership[];
    }
  | {
      kind: "awaiting_claim_serial";
      userId: string;
      tenantId: string;
    }
  | {
      kind: "awaiting_claim_site";
      userId: string;
      tenantId: string;
      serialNumber: string;
      sites: Awaited<ReturnType<typeof backendClient.getSitesForTenant>>;
    }
  | {
      kind: "awaiting_claim_name";
      userId: string;
      tenantId: string;
      serialNumber: string;
      siteId: string;
    }
  | undefined;

const pendingStates = new Map<number, PendingState>();
const telegramEnabled = !config.TELEGRAM_BOT_TOKEN.includes("placeholder");

function isPlatformAdmin(memberships: Membership[]): boolean {
  return memberships.some((membership) => membership.role === "platform_admin");
}

function formatMemberships(memberships: Membership[]): string {
  return memberships
    .map((membership, index) => `${index + 1}. ${membership.tenantName ?? membership.tenantId} (${membership.tenantId}, ${membership.role})`)
    .join("\n");
}

function formatFleetSummary(summary: Awaited<ReturnType<typeof backendClient.getFleetSummary>>): string {
  return [
    "Fleet summary:",
    `Devices: ${summary.totals.devices}`,
    `Online devices: ${summary.totals.onlineDevices}`,
    `Claimed devices: ${summary.totals.claimedDevices}`,
    `Unclaimed devices: ${summary.totals.unclaimedDevices}`,
    `Online unclaimed devices: ${summary.totals.onlineUnclaimedDevices}`,
    `Users: ${summary.totals.users}`,
    `Active users: ${summary.totals.activeUsers}`,
    `Tenants: ${summary.totals.tenants}`,
    `Sites: ${summary.totals.sites}`,
  ].join("\n");
}

function formatUserSummary(summary: Awaited<ReturnType<typeof backendClient.getUserSummary>>): string {
  return [
    "User summary:",
    `Users: ${summary.totals.users}`,
    `Active users: ${summary.totals.activeUsers}`,
    `Invited users: ${summary.totals.invitedUsers}`,
    `Suspended users: ${summary.totals.suspendedUsers}`,
  ].join("\n");
}

function formatDeviceList(prefix: string, devices: Awaited<ReturnType<typeof backendClient.getDevicesForTenant>>): string {
  if (devices.length === 0) {
    return `${prefix}: none`;
  }

  return [
    `${prefix}:`,
    ...devices.map((device) => {
      const label = device.displayName ?? device.serialNumber;
      const power = device.state?.lastPower ?? 0;
      return `- ${label} | serial ${device.serialNumber} | lifecycle ${device.lifecycleStatus} | power ${power.toFixed(1)} W`;
    }),
  ].join("\n");
}

function formatSingleDevice(device: Awaited<ReturnType<typeof backendClient.getDeviceHealth>>): string {
  const lastSeen = device.state?.lastSeenAt ?? "unknown";
  const voltage = device.state?.lastVoltage ?? 0;
  const power = device.state?.lastPower ?? 0;
  return [
    `Device: ${device.displayName ?? device.serialNumber}`,
    `Serial: ${device.serialNumber}`,
    `Device ID: ${device.deviceId}`,
    `Lifecycle: ${device.lifecycleStatus}`,
    `Claim status: ${device.claimStatus}`,
    `Firmware: ${device.lastFirmwareVersion ?? device.state?.lastFirmwareVersion ?? "unknown"}`,
    `Last seen: ${lastSeen}`,
    `Voltage: ${voltage.toFixed(1)} V`,
    `Power: ${power.toFixed(1)} W`,
  ].join("\n");
}

function formatFirmwarePolicy(policy: Awaited<ReturnType<typeof backendClient.getFirmwarePolicy>>): string {
  return [
    `Firmware policy for ${policy.serialNumber}:`,
    `Current: ${policy.currentVersion ?? "unknown"}`,
    `Support: ${policy.supportStatus}`,
    `Severity: ${policy.severity}`,
    `Update available: ${policy.updateAvailable ? "yes" : "no"}`,
    `Latest compatible: ${policy.latestVersion ?? "unknown"}`,
    policy.message,
  ].join("\n");
}

function formatFleetFirmwarePolicy(policies: Awaited<ReturnType<typeof backendClient.getFleetFirmwarePolicy>>): string {
  if (policies.length === 0) {
    return "No firmware policy data found.";
  }

  return [
    "Fleet firmware policy:",
    ...policies.map(
      (policy) =>
        `- ${policy.serialNumber}: ${policy.currentVersion ?? "unknown"} | ${policy.supportStatus} | ${policy.severity} | latest ${policy.latestVersion ?? "unknown"}`,
    ),
  ].join("\n");
}

async function ensureDefaultTenant(chatId: number, userId: string, memberships: Membership[]): Promise<boolean> {
  if (memberships.length <= 1) {
    return true;
  }

  pendingStates.set(chatId, {
    kind: "awaiting_default_tenant",
    userId,
    memberships,
  });

  await sendMessage(
    chatId,
    `Please choose your default tenant by sending its number or tenant ID:\n${formatMemberships(memberships)}`,
  );
  return false;
}

async function handleDefaultTenantSelection(chatId: number, text: string): Promise<boolean> {
  const pendingState = pendingStates.get(chatId);
  if (!pendingState || pendingState.kind !== "awaiting_default_tenant") {
    return false;
  }

  const trimmed = text.trim();
  const index = Number(trimmed);
  let selectedTenantId: string | undefined;
  if (Number.isFinite(index) && index >= 1 && index <= pendingState.memberships.length) {
    selectedTenantId = pendingState.memberships[index - 1].tenantId;
  } else {
    const matchedMembership = pendingState.memberships.find((membership) => membership.tenantId === trimmed);
    selectedTenantId = matchedMembership?.tenantId;
  }

  if (!selectedTenantId) {
    await sendMessage(chatId, "Invalid tenant selection. Please send the number or exact tenant ID from the list.");
    return true;
  }

  await backendClient.setDefaultTenant(pendingState.userId, selectedTenantId);
  pendingStates.delete(chatId);
  await sendMessage(chatId, `Default tenant set to ${selectedTenantId}. You can now use bot commands.`);
  return true;
}

async function handleClaimFlow(chatId: number, text: string): Promise<boolean> {
  const pendingState = pendingStates.get(chatId);
  if (!pendingState) {
    return false;
  }

  if (pendingState.kind === "awaiting_claim_serial") {
    const serialNumber = text.trim();
    try {
      const sites = await backendClient.getSitesForTenant(pendingState.tenantId);
      if (sites.length === 0) {
        pendingStates.delete(chatId);
        await sendMessage(chatId, "No active site is available in your default tenant. Please contact your tenant admin.");
        return true;
      }

      pendingStates.set(chatId, {
        kind: "awaiting_claim_site",
        userId: pendingState.userId,
        tenantId: pendingState.tenantId,
        serialNumber,
        sites,
      });

      await sendMessage(
        chatId,
        [
          `Serial number received: ${serialNumber}`,
          "Choose a site by sending its number or site ID:",
          ...sites.map((site, index) => `${index + 1}. ${site.name} (${site.siteId})`),
        ].join("\n"),
      );
      return true;
    } catch {
      pendingStates.delete(chatId);
      await sendMessage(chatId, "Could not continue the claim flow right now. Please try /add_device again.");
      return true;
    }
  }

  if (pendingState.kind === "awaiting_claim_site") {
    const trimmed = text.trim();
    const index = Number(trimmed);
    let selectedSiteId: string | undefined;
    if (Number.isFinite(index) && index >= 1 && index <= pendingState.sites.length) {
      selectedSiteId = pendingState.sites[index - 1].siteId;
    } else {
      const matchedSite = pendingState.sites.find((site) => site.siteId === trimmed);
      selectedSiteId = matchedSite?.siteId;
    }

    if (!selectedSiteId) {
      await sendMessage(chatId, "Invalid site selection. Please send the number or site ID from the list.");
      return true;
    }

    pendingStates.set(chatId, {
      kind: "awaiting_claim_name",
      userId: pendingState.userId,
      tenantId: pendingState.tenantId,
      serialNumber: pendingState.serialNumber,
      siteId: selectedSiteId,
    });
    await sendMessage(chatId, "Please send the display name you want to use for this device.");
    return true;
  }

  if (pendingState.kind === "awaiting_claim_name") {
    const displayName = text.trim();
    if (!displayName) {
      await sendMessage(chatId, "Display name cannot be empty. Please send a valid device name.");
      return true;
    }

    try {
      const device = await backendClient.claimDevice({
        serialNumber: pendingState.serialNumber,
        tenantId: pendingState.tenantId,
        siteId: pendingState.siteId,
        ownerUserId: pendingState.userId,
        displayName,
      });
      pendingStates.delete(chatId);
      await sendMessage(
        chatId,
        `Device claimed successfully: ${device?.displayName ?? displayName} (${pendingState.serialNumber}) is now active in site ${pendingState.siteId}.`,
      );
      return true;
    } catch (error) {
      pendingStates.delete(chatId);
      await sendMessage(chatId, error instanceof Error ? error.message : "Failed to claim device.");
      return true;
    }
  }

  return false;
}

async function handleCommand(chatId: number, text: string, userId: string, memberships: Membership[]) {
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
      pendingStates.set(chatId, {
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

      pendingStates.set(chatId, {
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
        const device = await backendClient.getDeviceHealth(identifier);
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
          const policy = await backendClient.getFirmwarePolicy(identifier);
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

    default:
      await handleNaturalLanguage(chatId, text, user, refreshedMemberships);
  }
}

async function handleNaturalLanguage(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
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

async function processMessage(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.from) {
    return;
  }

  const chatId = message.chat.id;
  const text = message.text.trim();
  const displayName = [message.from.first_name, message.from.last_name].filter(Boolean).join(" ") || message.from.username;

  if (await handleDefaultTenantSelection(chatId, text)) {
    return;
  }

  if (await handleClaimFlow(chatId, text)) {
    return;
  }

  const identity = await backendClient.identifyTelegramUser({
    externalId: String(chatId),
    displayName,
    username: message.from.username,
  });

  if (identity.memberships.length === 0) {
    await sendMessage(chatId, "Your account is registered, but no tenant membership is configured yet. Please contact the platform administrator.");
    return;
  }

  if (identity.requiresDefaultTenantSelection) {
    const ready = await ensureDefaultTenant(chatId, identity.user.userId, identity.memberships);
    if (!ready) {
      return;
    }
  }

  await handleCommand(chatId, text, identity.user.userId, identity.memberships);
}

async function pollTelegramLoop(): Promise<never> {
  if (!telegramEnabled) {
    logger.warn("Telegram polling disabled because TELEGRAM_BOT_TOKEN is a placeholder");
    while (true) {
      await delay(config.TELEGRAM_POLL_INTERVAL_MS);
    }
  }

  let offset: number | undefined;
  while (true) {
    try {
      const updates = await getUpdates(offset);
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await processMessage(update);
        } catch (error) {
          logger.error({ err: error, updateId: update.update_id }, "Failed to process Telegram update");
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Telegram polling failed");
      await delay(config.TELEGRAM_POLL_INTERVAL_MS);
    }
  }
}

async function processNotificationQueueLoop(): Promise<never> {
  if (!telegramEnabled) {
    logger.warn("Notification delivery disabled because TELEGRAM_BOT_TOKEN is a placeholder");
    while (true) {
      await delay(config.NOTIFICATION_POLL_INTERVAL_MS);
    }
  }

  while (true) {
    try {
      const notifications = await backendClient.getPendingNotifications(20);
      for (const notification of notifications) {
        try {
          await backendClient.markNotificationProcessing(notification._id);
          const title = notification.title ? `${notification.title}\n` : "";
          await sendMessage(notification.targetExternalId, `${title}${notification.text}`);
          await backendClient.markNotificationSent(notification._id);
        } catch (error) {
          logger.error({ err: error, notificationId: notification._id }, "Failed to deliver queued notification");
          await backendClient.markNotificationFailed(
            notification._id,
            error instanceof Error ? error.message : "Unknown notification delivery error",
          );
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Notification queue polling failed");
    }

    await delay(config.NOTIFICATION_POLL_INTERVAL_MS);
  }
}

async function main(): Promise<void> {
  logger.info({ backendBaseUrl: config.BACKEND_BASE_URL }, "Assistant bot starting");
  await Promise.all([pollTelegramLoop(), processNotificationQueueLoop()]);
}

main().catch((error) => {
  logger.error({ err: error }, "Assistant bot failed to start");
  process.exit(1);
});
