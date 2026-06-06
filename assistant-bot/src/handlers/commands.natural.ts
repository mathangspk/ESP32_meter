import { backendClient, Membership } from "../backend-client";
import { askGroq } from "../groq";
import { logger } from "../logger";
import { sendMessage } from "../telegram";
import { isPlatformAdmin } from "../device-resolver";
import {
  handleNaturalLanguageDeviceAction,
  handleFirmwareVersionQuestion,
  handleDeviceDetailQuestion,
  handleInventoryQuestion,
} from "./device";
import { handleAnalyticsQuestion } from "./analytics";

export async function handleNaturalLanguage(
  chatId: number,
  text: string,
  user: { userId: string; defaultTenantId?: string },
  memberships: Membership[]
) {
  if (await handleNaturalLanguageDeviceAction(chatId, text, user, memberships)) return;
  if (await handleFirmwareVersionQuestion(chatId, text, user, memberships)) return;
  if (await handleDeviceDetailQuestion(chatId, text, user, memberships)) return;
  if (await handleAnalyticsQuestion(chatId, text, user, memberships)) return;
  if (await handleInventoryQuestion(chatId, text, user, memberships)) return;

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
    await sendMessage(
      chatId,
      "I could not answer that question right now. Please try a direct command such as /devices or /fleet_summary."
    );
  }
}
