import { Collection } from "mongodb";
import { FirmwareReleaseRecord, FirmwarePolicyEvaluation, DeviceRecord } from "./types";
import { getCompatibleFirmwareReleases } from "./ota.releases";

export async function evaluateFirmwarePolicy(
  firmwareReleases: Collection<FirmwareReleaseRecord>,
  device: DeviceRecord,
): Promise<FirmwarePolicyEvaluation> {
  const releases = await getCompatibleFirmwareReleases(firmwareReleases, device);
  const currentVersion = device.lastFirmwareVersion;
  const release = currentVersion ? releases.find((c) => c.version === currentVersion) : undefined;
  const recommendedRelease = releases[0];

  if (!currentVersion) {
    return {
      serialNumber: device.serialNumber, deviceId: device.deviceId,
      supportStatus: "unsupported", severity: "required", updateAvailable: Boolean(recommendedRelease),
      latestVersion: recommendedRelease?.version, recommendedRelease,
      message: "Device has not reported a firmware version yet.",
    };
  }

  if (!release) {
    return {
      serialNumber: device.serialNumber, deviceId: device.deviceId, currentVersion,
      supportStatus: "unsupported", severity: "required",
      updateAvailable: Boolean(recommendedRelease && recommendedRelease.version !== currentVersion),
      latestVersion: recommendedRelease?.version, recommendedRelease,
      message: `Firmware ${currentVersion} is not present in the release catalog.`,
    };
  }

  const updateAvailable = Boolean(recommendedRelease && recommendedRelease.version !== currentVersion);
  const severity = updateAvailable && recommendedRelease ? recommendedRelease.severity : release.severity;

  return {
    serialNumber: device.serialNumber, deviceId: device.deviceId, currentVersion,
    supportStatus: release.supportStatus, severity, updateAvailable, latestVersion: recommendedRelease?.version,
    release, recommendedRelease: updateAvailable ? recommendedRelease : undefined,
    message: updateAvailable
      ? `Firmware ${currentVersion} can be updated to ${recommendedRelease?.version}.`
      : `Firmware ${currentVersion} is the latest compatible release.`,
  };
}

export async function evaluateFirmwarePolicyForDevice(
  devices: Collection<DeviceRecord>,
  firmwareReleases: Collection<FirmwareReleaseRecord>,
  identifier: string,
): Promise<FirmwarePolicyEvaluation | null> {
  const device = await devices.findOne({ $or: [{ serialNumber: identifier }, { deviceId: identifier }] });
  if (!device) return null;
  return evaluateFirmwarePolicy(firmwareReleases, device);
}

export async function getFirmwareReleaseForDevice(
  devices: Collection<DeviceRecord>,
  firmwareReleases: Collection<FirmwareReleaseRecord>,
  identifier: string,
  version: string,
): Promise<FirmwareReleaseRecord | null> {
  const device = await devices.findOne({ $or: [{ serialNumber: identifier }, { deviceId: identifier }] });
  if (!device) throw new Error("Device not found");
  const releases = await getCompatibleFirmwareReleases(firmwareReleases, device);
  return releases.find((release) => release.version === version) ?? null;
}

export async function evaluateFirmwarePolicyForFleet(
  devices: Collection<DeviceRecord>,
  firmwareReleases: Collection<FirmwareReleaseRecord>,
  limit = 50,
): Promise<FirmwarePolicyEvaluation[]> {
  const deviceList = await devices.find({}, { sort: { updatedAt: -1 }, limit }).toArray();
  return Promise.all(deviceList.map((device) => evaluateFirmwarePolicy(firmwareReleases, device)));
}
