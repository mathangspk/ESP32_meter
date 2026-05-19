import { backendClient, Membership } from "./backend-client";

export type PendingState =
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

export type ActivePendingState = Exclude<PendingState, undefined>;

export async function getPendingState(chatId: number): Promise<PendingState> {
  const session = await backendClient.getBotSession(chatId);
  return session?.state as ActivePendingState | undefined;
}

export async function setPendingState(chatId: number, state: ActivePendingState): Promise<void> {
  await backendClient.saveBotSession(chatId, state);
}

export async function clearPendingState(chatId: number): Promise<void> {
  await backendClient.deleteBotSession(chatId);
}
