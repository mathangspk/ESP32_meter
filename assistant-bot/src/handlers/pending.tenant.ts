import { backendClient, Membership } from "../backend-client";
import { sendMessage } from "../telegram";
import { formatMemberships } from "../formatters";
import { getPendingState, setPendingState, clearPendingState } from "../session";

export async function ensureDefaultTenant(chatId: number, userId: string, memberships: Membership[]): Promise<boolean> {
  if (memberships.length <= 1) return true;

  await setPendingState(chatId, {
    kind: "awaiting_default_tenant",
    userId,
    memberships,
  });

  await sendMessage(
    chatId,
    `Please choose your default tenant by sending its number or tenant ID:\n${formatMemberships(memberships)}`
  );
  return false;
}

export async function handleDefaultTenantSelection(chatId: number, text: string): Promise<boolean> {
  const pendingState = await getPendingState(chatId);
  if (!pendingState || pendingState.kind !== "awaiting_default_tenant") return false;

  const trimmed = text.trim();
  const index = Number(trimmed);
  let selectedTenantId: string | undefined;

  if (Number.isFinite(index) && index >= 1 && index <= pendingState.memberships.length) {
    selectedTenantId = pendingState.memberships[index - 1].tenantId;
  } else {
    const matchedMembership = pendingState.memberships.find((m) => m.tenantId === trimmed);
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
