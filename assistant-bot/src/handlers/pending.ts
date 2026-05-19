import { backendClient, Membership } from "../backend-client";
import { sendMessage } from "../telegram";
import { formatMemberships, getActionLabel } from "../formatters";
import { getPendingState, setPendingState, clearPendingState } from "../session";

export async function ensureDefaultTenant(chatId: number, userId: string, memberships: Membership[]): Promise<boolean> {
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

export async function handleDefaultTenantSelection(chatId: number, text: string): Promise<boolean> {
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

export async function handleClaimFlow(chatId: number, text: string): Promise<boolean> {
  const pendingState = await getPendingState(chatId);
  if (!pendingState) {
    return false;
  }

  if (text.trim().startsWith("/")) {
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

export async function handleDeviceActionConfirmation(chatId: number, text: string): Promise<boolean> {
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

export async function handleOtaConfirmation(chatId: number, text: string): Promise<boolean> {
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
