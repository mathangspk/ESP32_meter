import { backendClient, Membership } from "./backend-client";
import { sendMessage } from "./telegram";
import { normalizeIdentifier } from "./nlu";

export function isPlatformAdmin(memberships: Membership[]): boolean {
  return memberships.some((membership) => membership.role === "platform_admin");
}

export async function getAccessibleDevices(user: { defaultTenantId?: string }, memberships: Membership[]) {
  if (isPlatformAdmin(memberships)) {
    return backendClient.getDevices(100);
  }

  if (!user.defaultTenantId) {
    return [];
  }

  return backendClient.getDevicesForTenant(user.defaultTenantId, 100);
}

export async function resolveAccessibleDevice(identifier: string | undefined, user: { defaultTenantId?: string }, memberships: Membership[]) {
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

export async function resolveCommandDeviceIdentifier(
  rawIdentifier: string,
  user: { userId: string; defaultTenantId?: string },
  memberships: Membership[],
  chatId: number,
  intentLabel: string,
): Promise<string | undefined> {
  const { devices, device } = await resolveAccessibleDevice(rawIdentifier, user, memberships);
  if (devices.length === 0) {
    await sendMessage(chatId, "Khong tim thay thiet bi nao trong pham vi ban co quyen xem.");
    return undefined;
  }

  if (!device) {
    await sendMessage(
      chatId,
      `Minh chua xac dinh duoc chinh xac thiet bi ban muon ${intentLabel}. Hay gui lai serial, device ID, hoac ten thiet bi dung hon.`,
    );
    return undefined;
  }

  return device.serialNumber;
}

export async function canManageDevice(identifier: string, userDefaultTenantId: string | undefined, memberships: Membership[]): Promise<boolean> {
  if (isPlatformAdmin(memberships)) {
    return true;
  }

  if (!userDefaultTenantId) {
    return false;
  }

  const device = await backendClient.getDeviceHealth(identifier);
  return device.tenantId === userDefaultTenantId;
}
