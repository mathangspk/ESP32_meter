import { backendClient, Membership } from "../backend-client";
import { parseInventoryIntent } from "../groq";
import { logger } from "../logger";
import { sendMessage } from "../telegram";
import { previewText, formatSingleDevice, formatFirmwarePolicy, getActionLabel, buildDeviceActionConfirmation } from "../formatters";
import { resolveAccessibleDevice, getAccessibleDevices, canPerformDeviceAction } from "../device-resolver";
import { setPendingState } from "../session";
import {
  looksLikeDeviceDetailQuestion,
  parseDeviceDetailReference,
  looksLikeFirmwareVersionQuestion,
  parseFirmwareQuestionIdentifier,
  asksLatestAvailableFirmware,
  asksFirmwareUpgradeNeed,
  parseNaturalLanguageDeviceAction,
} from "../nlu";

function formatManagedDeviceLabel(device: Awaited<ReturnType<typeof backendClient.getDevices>>[number]) {
  const label = device.displayName ?? device.serialNumber;
  return `${label} (${device.serialNumber})`;
}

export async function handleDeviceDetailQuestion(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
  if (!looksLikeDeviceDetailQuestion(text)) {
    return false;
  }

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
        : `Ban muon xem thiet bi nao? Hien co: ${devices.map((candidate) => candidate.displayName ?? candidate.serialNumber).join(", ")}`,
    );
    return true;
  }

  const details = await backendClient.getDeviceHealth(device.serialNumber);
  await sendMessage(chatId, formatSingleDevice(details));
  return true;
}

export async function handleFirmwareVersionQuestion(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
  if (!looksLikeFirmwareVersionQuestion(text)) {
    return false;
  }

  const identifier = parseFirmwareQuestionIdentifier(text);
  const asksLatest = asksLatestAvailableFirmware(text);
  const asksUpgrade = asksFirmwareUpgradeNeed(text);
  logger.info(
    {
      event: "telegram.firmware_question",
      chatId,
      userId: user.userId,
      identifier,
      asksLatest,
      asksUpgrade,
      textPreview: previewText(text),
    },
    "Parsed firmware question",
  );

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
        `Firmware moi nhat tren he thong hien la ${latest.version}. Support ${latest.supportStatus}. Muc do ${latest.severity}.`,
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
        : `Ban muon hoi firmware cua thiet bi nao? Hien co: ${devices.map((candidate) => candidate.displayName ?? candidate.serialNumber).join(", ")}`,
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
    "Resolved device for firmware question",
  );

  if (asksLatest || asksUpgrade) {
    const policy = await backendClient.getFirmwarePolicy(device.serialNumber);
    const latestVersion = policy.latestVersion ?? "khong ro";
    const updateAnswer = policy.updateAvailable ? "co" : "khong";
    await sendMessage(
      chatId,
      `${device.displayName ?? device.serialNumber}: firmware hien tai la ${policy.currentVersion ?? "khong ro"}. Firmware moi nhat phu hop la ${latestVersion}. Can nang cap: ${updateAnswer}.`,
    );
    return true;
  }

  const details = await backendClient.getDeviceHealth(device.serialNumber);
  const firmware = details.lastFirmwareVersion ?? details.state?.lastFirmwareVersion ?? "khong ro";
  await sendMessage(chatId, `${details.displayName ?? details.serialNumber}: firmware hien tai la ${firmware}.`);
  return true;
}

export async function handleNaturalLanguageDeviceAction(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
  const parsed = parseNaturalLanguageDeviceAction(text);
  if (!parsed) {
    return false;
  }

  const { devices, device } = await resolveAccessibleDevice(parsed.identifier, user, memberships);
  if (devices.length === 0) {
    await sendMessage(chatId, "Khong tim thay thiet bi nao trong pham vi ban co quyen quan ly.");
    return true;
  }

  if (!device) {
    await sendMessage(
      chatId,
      parsed.identifier
        ? `Minh chua xac dinh duoc chinh xac thiet bi ban muon ${getActionLabel(parsed.action)}. Hay gui lai serial, device ID, hoac ten thiet bi dung hon.`
        : `Ban muon ${getActionLabel(parsed.action)} thiet bi nao? Hien co: ${devices.map((candidate) => candidate.displayName ?? candidate.serialNumber).join(", ")}`,
    );
    return true;
  }

  const allowed = await canPerformDeviceAction(parsed.action, device.serialNumber, user.defaultTenantId, memberships);
  if (!allowed) {
    await sendMessage(chatId, "Ban khong co quyen thuc hien thao tac nay voi thiet bi.");
    return true;
  }

  const details = await backendClient.getDeviceHealth(device.serialNumber);
  await setPendingState(chatId, {
    kind: "confirming_device_action",
    userId: user.userId,
    identifier: device.serialNumber,
    action: parsed.action,
  });
  await sendMessage(chatId, buildDeviceActionConfirmation(details, parsed.action));
  return true;
}

export async function handleInventoryQuestion(chatId: number, text: string, user: { userId: string; defaultTenantId?: string }, memberships: Membership[]) {
  const intent = await parseInventoryIntent(text);
  if (intent.intent === "unknown") {
    return false;
  }

  const devices = await getAccessibleDevices(user, memberships);
  const count = devices.length;
  const names = devices.map(formatManagedDeviceLabel);

  if (count === 0) {
    await sendMessage(chatId, "Hiện bạn chưa quản lý thiết bị nào trong phạm vi tài khoản này.");
    return true;
  }

  if (intent.intent === "get_managed_device_count") {
    await sendMessage(chatId, `Hiện bạn đang quản lý ${count} thiết bị.`);
    return true;
  }

  if (intent.intent === "get_managed_device_list") {
    await sendMessage(chatId, `Các thiết bị bạn đang quản lý: ${names.join(", ")}.`);
    return true;
  }

  await sendMessage(chatId, `Hiện bạn đang quản lý ${count} thiết bị: ${names.join(", ")}.`);
  return true;
}
