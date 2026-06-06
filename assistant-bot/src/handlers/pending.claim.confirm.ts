import { backendClient } from "../backend-client";
import { sendMessage } from "../telegram";
import { clearPendingState } from "../session";

export async function handleConfirmClaimStage(
  chatId: number,
  text: string,
  pendingState: {
    userId: string;
    tenantId: string;
    serialNumber: string;
    siteId: string;
    displayName: string;
  }
): Promise<boolean> {
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
      `Device claimed successfully: ${device?.displayName ?? pendingState.displayName} (${pendingState.serialNumber}) is now active in site ${pendingState.siteId}.`
    );
  } catch (error) {
    await clearPendingState(chatId);
    await sendMessage(chatId, error instanceof Error ? error.message : "Failed to claim device.");
  }
  return true;
}
