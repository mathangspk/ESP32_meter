import { randomUUID } from "node:crypto";
import { logger } from "./logger";
import { mongoService } from "./mongodb";
import { mqttService } from "./mqtt";
import { OtaCommandPayload, OtaCommandRequest } from "./types";

function getOtaCommandTopic(serialNumber: string): string {
  return `firmwareUpdateOTA/device/${serialNumber}`;
}

export async function createOtaJob(input: OtaCommandRequest) {
  const jobId = randomUUID();
  const commandTopic = getOtaCommandTopic(input.serial_number);
  const commandPayload: OtaCommandPayload = {
    job_id: jobId,
    device_id: input.device_id,
    serial_number: input.serial_number,
    version: input.version,
    url: input.url,
    sha256: input.sha256,
  };

  await mongoService.createOtaJob({
    jobId,
    deviceId: input.device_id,
    serialNumber: input.serial_number,
    commandTopic,
    targetVersion: input.version,
    url: input.url,
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
