import { backendClient, Membership } from "../backend-client";
import { logger } from "../logger";
import { sendMessage } from "../telegram";
import { previewText } from "../formatters";
import { resolveAccessibleDevice } from "../device-resolver";
import { looksLikeFirmwareVersionQuestion, parseFirmwareQuestionIdentifier, asksLatestAvailableFirmware, asksFirmwareUpgradeNeed } from "../nlu";

export async function handleFirmwareVersionQuestion(
  chatId: number,
  text: string,
  user: { userId: string; defaultTenantId?: string },
  memberships: Membership[]
): Promise<boolean> {
  if (!looksLikeFirmwareVersionQuestion(text)) return false;

  const identifier = parseFirmwareQuestionIdentifier(text);
  const asksLatest = asksLatestAvailableFirmware(text);
  const asksUpgrade = asksFirmwareUpgradeNeed(text);

  logger.info({ event: "telegram.firmware_question", chatId, userId: user.userId, identifier, asksLatest, asksUpgrade, textPreview: previewText(text) }, "Parsed firmware question");

  if (!identifier && asksLatest) {
    try {
      const releases = await backendClient.getFirmwareReleases(1);
      const latest = releases[0];
      if (!latest) {
        await sendMessage(chatId, "Hien he thong chua co firmware release nao trong catalog.");
        return true;
      }
      await sendMessage(
        chatId,
        `Firmware moi nhat tren he thong hien la ${latest.version}. Support ${latest.supportStatus}. Muc do ${latest.severity}.`
      );
      return true;
    } catch (error) {
      logger.error({ err: error, chatId, userId: user.userId }, "Failed to answer latest firmware release question");
      await sendMessage(chatId, "Minh chua lay duoc firmware moi nhat tu he thong luc nay.");
      return true;
    }
  }

  const { devices, device } = await resolveAccessibleDevice(identifier, user, memberships);
  if (devices.length === 0) {
    await sendMessage(chatId, "Khong tim thay thiet bi nao trong pham vi ban co quyen xem.");
    return true;
  }

  if (!device) {
    await sendMessage(
      chatId,
      identifier
        ? "Minh chua xac dinh duoc chinh xac thiet bi ban muon hoi firmware. Hay gui lai serial, device ID, hoac ten thiet bi dung hon."
        : `Ban muon hoi firmware cua thiet bi nao? Hien co: ${devices.map((candidate) => candidate.displayName ?? candidate.serialNumber).join(", ")}`
    );
    return true;
  }

  logger.info(
    {
      event: "telegram.firmware_resolved_device",
      chatId,
      userId: user.userId,
      requestedIdentifier: identifier,
      resolvedDeviceId: device.deviceId,
      resolvedSerialNumber: device.serialNumber,
      resolvedDisplayName: device.displayName,
    },
    "Resolved device for firmware question"
  );

  if (asksLatest || asksUpgrade) {
    const policy = await backendClient.getFirmwarePolicy(device.serialNumber);
    const latestVersion = policy.latestVersion ?? "khong ro";
    const updateAnswer = policy.updateAvailable ? "co" : "khong";
    await sendMessage(
      chatId,
      `${device.displayName ?? device.serialNumber}: firmware hien tai la ${policy.currentVersion ?? "khong ro"}. Firmware moi nhat phu hop la ${latestVersion}. Can nang cap: ${updateAnswer}.`
    );
    return true;
  }

  const details = await backendClient.getDeviceHealth(device.serialNumber);
  const firmware = details.lastFirmwareVersion ?? details.state?.lastFirmwareVersion ?? "khong ro";
  await sendMessage(chatId, `${details.displayName ?? details.serialNumber}: firmware hien tai la ${firmware}.`);
  return true;
}
