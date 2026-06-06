import { backendClient, Membership } from "../backend-client";
import { sendMessage } from "../telegram";
import { setPendingState } from "../session";
import { formatMemberships } from "../formatters";
import { ensureDefaultTenant } from "./pending";
import { handleNaturalLanguage } from "./commands.natural";
import { handleAdminCommand } from "./commands.admin";
import { handleDeviceCommand } from "./commands.device";
import { handleDeviceActionCommand } from "./commands.device.actions";

export { handleNaturalLanguage };

export async function handleCommand(chatId: number, text: string, userId: string, memberships: Membership[]) {
  const membershipPayload = await backendClient.getUserMemberships(userId);
  const user = membershipPayload.user;
  const refreshedMemberships = membershipPayload.memberships;

  if (!user.defaultTenantId) {
    const ready = await ensureDefaultTenant(chatId, userId, refreshedMemberships);
    if (!ready) return;
  }

  const [command, ...args] = text.split(/\s+/);

  // Try Admin commands
  if (await handleAdminCommand(chatId, command, refreshedMemberships)) return;

  // Try Device query/claim commands
  if (await handleDeviceCommand(chatId, command, args, userId, user, refreshedMemberships)) return;

  // Try Device action/ota commands
  if (await handleDeviceActionCommand(chatId, command, args, userId, user, refreshedMemberships)) return;

  switch (command) {
    case "/start": {
      if (refreshedMemberships.length === 0) {
        await sendMessage(
          chatId,
          "Your Telegram account is registered, but no tenant membership was found yet. Please contact the platform admin."
        );
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

    default:
      await handleNaturalLanguage(chatId, text, user, refreshedMemberships);
  }
}
