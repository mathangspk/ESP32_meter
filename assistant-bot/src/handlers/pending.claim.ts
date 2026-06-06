import { backendClient } from "../backend-client";
import { sendMessage } from "../telegram";
import { getPendingState, setPendingState, clearPendingState } from "../session";
import { handleConfirmClaimStage } from "./pending.claim.confirm";

export async function handleClaimFlow(chatId: number, text: string): Promise<boolean> {
  const pendingState = await getPendingState(chatId);
  if (!pendingState || text.trim().startsWith("/")) return false;

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

      const siteMsg = [
        `Serial number received: ${serialNumber}`,
        "Choose a site by sending its number or site ID:",
        ...sites.map((site, index) => `${index + 1}. ${site.name} (${site.siteId})`),
      ].join("\n");
      await sendMessage(chatId, siteMsg);
    } catch {
      await clearPendingState(chatId);
      await sendMessage(chatId, "Could not continue the claim flow right now. Please try /add_device again.");
    }
    return true;
  }

  if (pendingState.kind === "awaiting_claim_site") {
    const trimmed = text.trim();
    const index = Number(trimmed);
    let selectedSiteId: string | undefined;
    if (Number.isFinite(index) && index >= 1 && index <= pendingState.sites.length) {
      selectedSiteId = pendingState.sites[index - 1].siteId;
    } else {
      const matchedSite = pendingState.sites.find((site: any) => site.siteId === trimmed);
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
    const confirmMsg = [
      "Confirm device claim:",
      `Serial: ${pendingState.serialNumber}`,
      `Site: ${pendingState.siteId}`,
      `Name: ${displayName}`,
      "Send CONFIRM to claim this device, or CANCEL to stop.",
    ].join("\n");
    await sendMessage(chatId, confirmMsg);
    return true;
  }

  if (pendingState.kind === "confirming_claim") {
    return handleConfirmClaimStage(chatId, text, pendingState);
  }

  return false;
}
