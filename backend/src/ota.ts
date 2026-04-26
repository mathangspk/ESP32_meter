import { randomUUID } from "node:crypto";
import { logger } from "./logger";
import { mongoService } from "./mongodb";
import { mqttService } from "./mqtt";
import { OtaCommandPayload, OtaCommandRequest } from "./types";

function getOtaCommandTopic(serialNumber: string): string {
  return `firmwareUpdateOTA/device/${serialNumber}`;
}

async function resolveFirmwareDownloadUrl(url: string): Promise<string> {
  const parsed = new URL(url);
  const shouldResolveGithubRelease =
    parsed.hostname === "github.com" && parsed.pathname.includes("/releases/download/");

  if (!shouldResolveGithubRelease) {
    return url;
  }

  const response = await fetch(url, {
    method: "HEAD",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to resolve firmware URL: HTTP ${response.status}`);
  }

  return response.url;
}

export async function createOtaJob(input: OtaCommandRequest) {
  const jobId = randomUUID();
  const commandTopic = getOtaCommandTopic(input.serial_number);
  const resolvedUrl = await resolveFirmwareDownloadUrl(input.url);
  const commandPayload: OtaCommandPayload = {
    job_id: jobId,
    device_id: input.device_id,
    serial_number: input.serial_number,
    version: input.version,
    url: resolvedUrl,
    sha256: input.sha256,
  };

  await mongoService.createOtaJob({
    jobId,
    deviceId: input.device_id,
    serialNumber: input.serial_number,
    commandTopic,
    targetVersion: input.version,
    url: resolvedUrl,
    sha256: input.sha256,
  });

  try {
    await mqttService.publish(commandTopic, JSON.stringify(commandPayload));
    await mongoService.markOtaJobPublished(jobId);
    logger.info({ jobId, deviceId: input.device_id, commandTopic }, "Published OTA command");
  } catch (error) {
    await mongoService.markOtaJobFailed(jobId, error instanceof Error ? error.message : "Failed to publish OTA command");
    throw error;
  }

  return mongoService.getOtaJob(jobId);
}

export async function createOtaJobFromRelease(identifier: string, version: string) {
  const device = await mongoService.getDeviceHealth(identifier);
  if (!device) {
    throw new Error("Device not found");
  }

  const release = await mongoService.getFirmwareReleaseForDevice(identifier, version);
  if (!release) {
    throw new Error("Firmware release is not compatible with this device or does not exist");
  }
  if (!release.url) {
    throw new Error("Firmware release does not have a downloadable URL");
  }
  if (release.supportStatus === "unsupported") {
    throw new Error("Cannot install an unsupported firmware release");
  }

  return createOtaJob({
    device_id: device.deviceId,
    serial_number: device.serialNumber,
    version: release.version,
    url: release.url,
    sha256: release.sha256,
  });
}
