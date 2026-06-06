import { backendClient } from "../backend-client";
import { sendMessage } from "../telegram";
import { getActionLabel } from "../formatters";
import { getPendingState, clearPendingState } from "../session";

export async function handleDeviceActionConfirmation(chatId: number, text: string): Promise<boolean> {
  const pendingState = await getPendingState(chatId);
  if (!pendingState || pendingState.kind !== "confirming_device_action") return false;

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
  if (!pendingState || pendingState.kind !== "confirming_ota") return false;

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
