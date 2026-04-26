import { setTimeout as delay } from "node:timers/promises";
import { backendClient, Membership } from "./backend-client";
import { config } from "./config";
import { askGroq, parseAnalyticsIntent, renderAnalyticsAnswer } from "./groq";
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
  | {
      kind: "confirming_claim";
      userId: string;
      tenantId: string;
      serialNumber: string;
      siteId: string;
      displayName: string;
    }
  | {
      kind: "confirming_device_action";
      userId: string;
      identifier: string;
      action: "remove" | "reboot" | "factory_reset";
      reason?: string;
    }
  | {
      kind: "confirming_ota";
      userId: string;
      identifier: string;
      version: string;
    }
  | undefined;

const telegramEnabled = !config.TELEGRAM_BOT_TOKEN.includes("placeholder");

type ActivePendingState = Exclude<PendingState, undefined>;

async function getPendingState(chatId: number): Promise<PendingState> {
  const session = await backendClient.getBotSession(chatId);
  return session?.state as ActivePendingState | undefined;
}

async function setPendingState(chatId: number, state: ActivePendingState): Promise<void> {
  await backendClient.saveBotSession(chatId, state);
}

async function clearPendingState(chatId: number): Promise<void> {
  await backendClient.deleteBotSession(chatId);
}

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

function getActionLabel(action: "remove" | "reboot" | "factory_reset"): string {
  if (action === "factory_reset") {
    return "factory reset";
  }
  return action;
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

async function getAccessibleDevices(user: { defaultTenantId?: string }, memberships: Membership[]) {
  if (isPlatformAdmin(memberships)) {
    return backendClient.getDevices(100);
  }

  if (!user.defaultTenantId) {
    return [];
  }

  return backendClient.getDevicesForTenant(user.defaultTenantId, 100);
}

async function resolveAccessibleDevice(identifier: string | undefined, user: { defaultTenantId?: string }, memberships: Membership[]) {
  const devices = await getAccessibleDevices(user, memberships);
  if (devices.length === 0) {
    return { devices, device: undefined };
  }

  if (!identifier) {
    return { devices, device: devices.length === 1 ? devices[0] : undefined };
  }

  const normalizedIdentifier = normalizeIdentifier(identifier);
  const exactMatch = devices.find(
    (device) =>
      normalizeIdentifier(device.serialNumber) === normalizedIdentifier ||
      normalizeIdentifier(device.deviceId) === normalizedIdentifier ||
      normalizeIdentifier(device.displayName ?? "") === normalizedIdentifier,
  );
  if (exactMatch) {
    return { devices, device: exactMatch };
  }

  const partialMatches = devices.filter((device) => normalizeIdentifier(device.displayName ?? "").includes(normalizedIdentifier));
  return { devices, device: partialMatches.length === 1 ? partialMatches[0] : undefined };
}

function formatAnalyticsFallback(summary: Awaited<ReturnType<typeof backendClient.getDeviceAnalyticsSummary>>): string {
  const label = summary.displayName ?? summary.serialNumber;
  const parts = [
    `${label} dang dung mui gio ${summary.siteTimezone}.`,
    summary.currentVoltage !== undefined ? `Dien ap hien tai khoang ${summary.currentVoltage.toFixed(1)} V.` : undefined,
    summary.currentPower !== undefined ? `Cong suat hien tai khoang ${summary.currentPower.toFixed(1)} W.` : undefined,
    summary.todayEnergyKwh !== undefined ? `Hom nay da dung khoang ${summary.todayEnergyKwh.toFixed(3)} kWh.` : undefined,
    summary.peakHourStart && summary.peakHourEnd && summary.peakHourAveragePower !== undefined
      ? `Khung gio dung dien nhieu nhat hom nay la ${new Date(summary.peakHourStart).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: summary.siteTimezone })}-${new Date(summary.peakHourEnd).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: summary.siteTimezone })}, cong suat trung binh khoang ${summary.peakHourAveragePower.toFixed(1)} W.`
      : undefined,
    ...summary.messages,
  ];

  return parts.filter(Boolean).join(" ");
}

async function handleAnalyticsQuestion(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
  const intent = await parseAnalyticsIntent(text);
  if (intent.intent === "unknown") {
    return false;
  }

  const { devices, device } = await resolveAccessibleDevice(intent.identifier, user, memberships);
  if (devices.length === 0) {
    await sendMessage(chatId, "Khong tim thay thiet bi nao trong pham vi ban co quyen xem.");
    return true;
  }

  if (!device) {
    await sendMessage(
      chatId,
      intent.identifier
        ? "Minh chua xac dinh duoc chinh xac thiet bi ban muon hoi. Hay gui lai serial, device ID, hoac ten thiet bi dung hon."
        : `Ban muon hoi thiet bi nao? Hien co: ${devices.map((candidate) => candidate.displayName ?? candidate.serialNumber).join(", ")}`,
    );
    return true;
  }

  const summary = await backendClient.getDeviceAnalyticsSummary(device.serialNumber);
  const answer = await renderAnalyticsAnswer(text, intent.intent, summary);
  await sendMessage(chatId, answer ?? formatAnalyticsFallback(summary));
  return true;
}

async function canManageDevice(identifier: string, userDefaultTenantId: string | undefined, memberships: Membership[]): Promise<boolean> {
  if (isPlatformAdmin(memberships)) {
    return true;
  }

  if (!userDefaultTenantId) {
    return false;
  }

  const device = await backendClient.getDeviceHealth(identifier);
  return device.tenantId === userDefaultTenantId;
}

async function ensureDefaultTenant(chatId: number, userId: string, memberships: Membership[]): Promise<boolean> {
  if (memberships.length <= 1) {
    return true;
  }

  await setPendingState(chatId, {
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
  const pendingState = await getPendingState(chatId);
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
  await clearPendingState(chatId);
  await sendMessage(chatId, `Default tenant set to ${selectedTenantId}. You can now use bot commands.`);
  return true;
}

async function handleClaimFlow(chatId: number, text: string): Promise<boolean> {
  const pendingState = await getPendingState(chatId);
  if (!pendingState) {
    return false;
  }

  if (pendingState.kind === "awaiting_claim_serial") {
    const serialNumber = text.trim();
    try {
      const sites = await backendClient.getSitesForTenant(pendingState.tenantId);
      if (sites.length === 0) {
        await clearPendingState(chatId);
        await sendMessage(chatId, "No active site is available in your default tenant. Please contact your tenant admin.");
        return true;
      }

      await setPendingState(chatId, {
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
      await clearPendingState(chatId);
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

    await setPendingState(chatId, {
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

    await setPendingState(chatId, {
      kind: "confirming_claim",
      userId: pendingState.userId,
      tenantId: pendingState.tenantId,
      serialNumber: pendingState.serialNumber,
      siteId: pendingState.siteId,
      displayName,
    });
    await sendMessage(
      chatId,
      [
        "Confirm device claim:",
        `Serial: ${pendingState.serialNumber}`,
        `Site: ${pendingState.siteId}`,
        `Name: ${displayName}`,
        "Send CONFIRM to claim this device, or CANCEL to stop.",
      ].join("\n"),
    );
    return true;
  }

  if (pendingState.kind === "confirming_claim") {
    const answer = text.trim().toUpperCase();
    if (answer === "CANCEL") {
      await clearPendingState(chatId);
      await sendMessage(chatId, "Claim cancelled.");
      return true;
    }
    if (answer !== "CONFIRM") {
      await sendMessage(chatId, "Please send CONFIRM to claim this device, or CANCEL to stop.");
      return true;
    }

    try {
      const device = await backendClient.claimDevice({
        serialNumber: pendingState.serialNumber,
        tenantId: pendingState.tenantId,
        siteId: pendingState.siteId,
        ownerUserId: pendingState.userId,
        displayName: pendingState.displayName,
      });
      await clearPendingState(chatId);
      await sendMessage(
        chatId,
        `Device claimed successfully: ${device?.displayName ?? pendingState.displayName} (${pendingState.serialNumber}) is now active in site ${pendingState.siteId}.`,
      );
      return true;
    } catch (error) {
      await clearPendingState(chatId);
      await sendMessage(chatId, error instanceof Error ? error.message : "Failed to claim device.");
      return true;
    }
  }

  return false;
}

async function handleDeviceActionConfirmation(chatId: number, text: string): Promise<boolean> {
  const pendingState = await getPendingState(chatId);
  if (!pendingState || pendingState.kind !== "confirming_device_action") {
    return false;
  }

  const answer = text.trim().toUpperCase();
  if (answer === "CANCEL") {
    await clearPendingState(chatId);
    await sendMessage(chatId, `${getActionLabel(pendingState.action)} cancelled.`);
    return true;
  }
  if (answer !== "CONFIRM") {
    await sendMessage(chatId, `Please send CONFIRM to ${getActionLabel(pendingState.action)} this device, or CANCEL to stop.`);
    return true;
  }

  try {
    await backendClient.performDeviceAction(pendingState.identifier, {
      action: pendingState.action,
      actorUserId: pendingState.userId,
      reason: pendingState.reason,
    });
    await clearPendingState(chatId);
    await sendMessage(chatId, `Device ${getActionLabel(pendingState.action)} accepted for ${pendingState.identifier}.`);
  } catch (error) {
    await clearPendingState(chatId);
    await sendMessage(chatId, error instanceof Error ? error.message : `Failed to ${getActionLabel(pendingState.action)} device.`);
  }

  return true;
}

async function handleOtaConfirmation(chatId: number, text: string): Promise<boolean> {
  const pendingState = await getPendingState(chatId);
  if (!pendingState || pendingState.kind !== "confirming_ota") {
    return false;
  }

  const answer = text.trim().toUpperCase();
  if (answer === "CANCEL") {
    await clearPendingState(chatId);
    await sendMessage(chatId, "OTA update cancelled.");
    return true;
  }
  if (answer !== "CONFIRM") {
    await sendMessage(chatId, "Please send CONFIRM to start OTA from the release catalog, or CANCEL to stop.");
    return true;
  }

  try {
    const job = await backendClient.createOtaFromRelease(pendingState.identifier, {
      version: pendingState.version,
      actorUserId: pendingState.userId,
    });
    await clearPendingState(chatId);
    await sendMessage(chatId, `OTA job accepted: ${job?.jobId ?? "unknown"} targeting ${pendingState.version}.`);
  } catch (error) {
    await clearPendingState(chatId);
    await sendMessage(chatId, error instanceof Error ? error.message : "Failed to start OTA update.");
  }

  return true;
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

    case "/remove_device":
    case "/reboot_device":
    case "/factory_reset": {
      const identifier = args[0]?.trim();
      if (!identifier) {
        await sendMessage(chatId, `Usage: ${command} <serial_number_or_device_id> [reason]`);
        return;
      }

      const action = command === "/remove_device" ? "remove" : command === "/reboot_device" ? "reboot" : "factory_reset";
      try {
        const allowed = await canManageDevice(identifier, user.defaultTenantId, refreshedMemberships);
        if (!allowed) {
          await sendMessage(chatId, "You do not have permission to manage this device.");
          return;
        }

        const device = await backendClient.getDeviceHealth(identifier);
        const reason = args.slice(1).join(" ").trim() || undefined;
        await setPendingState(chatId, {
          kind: "confirming_device_action",
          userId,
          identifier,
          action,
          reason,
        });

        await sendMessage(
          chatId,
          [
            `Confirm ${getActionLabel(action)}:`,
            `Device: ${device.displayName ?? device.serialNumber}`,
            `Serial: ${device.serialNumber}`,
            `Device ID: ${device.deviceId}`,
            action === "remove" ? "This will unclaim the device immediately and keep history." : "This will publish a remote command to the device over MQTT.",
            action === "factory_reset" ? "Factory reset will wipe app config and Wi-Fi settings, then reboot into AP/bootstrap mode." : undefined,
            "Send CONFIRM to continue, or CANCEL to stop.",
          ]
            .filter(Boolean)
            .join("\n"),
        );
      } catch {
        await sendMessage(chatId, "Device not found.");
      }
      return;
    }

    case "/ota_update": {
      const identifier = args[0]?.trim();
      const version = args[1]?.trim();
      if (!identifier || !version) {
        await sendMessage(chatId, "Usage: /ota_update <serial_number_or_device_id> <firmware_version>");
        return;
      }

      try {
        const allowed = await canManageDevice(identifier, user.defaultTenantId, refreshedMemberships);
        if (!allowed) {
          await sendMessage(chatId, "You do not have permission to update this device.");
          return;
        }

        const device = await backendClient.getDeviceHealth(identifier);
        const policy = await backendClient.getFirmwarePolicy(identifier);
        await setPendingState(chatId, {
          kind: "confirming_ota",
          userId,
          identifier,
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

async function handleNaturalLanguage(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
  if (await handleAnalyticsQuestion(chatId, text, user, memberships)) {
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

  if (await handleDeviceActionConfirmation(chatId, text)) {
    return;
  }

  if (await handleOtaConfirmation(chatId, text)) {
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
