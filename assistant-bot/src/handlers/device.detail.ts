import { backendClient, Membership } from "../backend-client";
import { sendMessage } from "../telegram";
import { formatSingleDevice } from "../formatters";
import { resolveAccessibleDevice } from "../device-resolver";
import { looksLikeDeviceDetailQuestion, parseDeviceDetailReference } from "../nlu";

export async function handleDeviceDetailQuestion(
  chatId: number,
  text: string,
  user: { userId: string; defaultTenantId?: string },
  memberships: Membership[]
): Promise<boolean> {
  if (!looksLikeDeviceDetailQuestion(text)) return false;

  const identifier = parseDeviceDetailReference(text);
  const { devices, device } = await resolveAccessibleDevice(identifier, user, memberships);

  if (devices.length === 0) {
    await sendMessage(chatId, "Khong tim thay thiet bi nao trong pham vi ban co quyen xem.");
    return true;
  }

  if (!device) {
    await sendMessage(
      chatId,
      identifier
        ? "Minh chua xac dinh duoc chinh xac thiet bi ban muon xem. Hay gui lai serial, device ID, hoac ten thiet bi dung hon."
        : `Ban muon xem thiet bi nao? Hien co: ${devices.map((candidate) => candidate.displayName ?? candidate.serialNumber).join(", ")}`
    );
    return true;
  }

  const details = await backendClient.getDeviceHealth(device.serialNumber);
  await sendMessage(chatId, formatSingleDevice(details));
  return true;
}
