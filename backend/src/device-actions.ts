import { randomUUID } from "node:crypto";
import { logger } from "./logger";
import { mongoService } from "./mongodb";
import { mqttService } from "./mqtt";
import { DeviceAction, DeviceActionRequest } from "./types";

function getControlTopic(deviceId: string): string {
  return `meter/${deviceId}/control`;
}

export async function performDeviceAction(identifier: string, input: DeviceActionRequest) {
  if (input.action === "remove") {
    return {
      action: input.action,
      device: await mongoService.unclaimDevice({ identifier, actorUserId: input.actorUserId, reason: input.reason }),
    };
  }

  return publishDeviceCommand(identifier, input.action, input.actorUserId, input.reason);
}

async function publishDeviceCommand(identifier: string, action: Exclude<DeviceAction, "remove">, actorUserId: string, reason?: string) {
  const device = await mongoService.getDeviceHealth(identifier);
  if (!device) {
    throw new Error("Device not found");
  }

  const commandId = randomUUID();
  const commandTopic = getControlTopic(device.deviceId);
  const payload = {
    command_id: commandId,
    action,
    device_id: device.deviceId,
    serial_number: device.serialNumber,
    reason,
    timestamp: new Date().toISOString(),
  };

  const command = await mongoService.createDeviceCommand({
    commandId,
    action,
    identifier,
    commandTopic,
    actorUserId,
    reason,
  });

  try {
    await mqttService.publish(commandTopic, JSON.stringify(payload), { qos: 1, retain: false });
    await mongoService.markDeviceCommandPublished(commandId);
    logger.info({ commandId, action, deviceId: device.deviceId, commandTopic }, "Published device command");
    return { ...command, status: "published" as const };
  } catch (error) {
    await mongoService.markDeviceCommandFailed(commandId, error instanceof Error ? error.message : "Failed to publish device command");
    throw error;
  }
}
