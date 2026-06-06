import { Collection } from "mongodb";
import { DeviceAction } from "../types";
import { AuditEventRecord, DeviceCommandRecord, DeviceRecord } from "./types";

export async function createDeviceCommand(
  col: { devices: Collection<DeviceRecord>; deviceCommands: Collection<DeviceCommandRecord>; auditEvents: Collection<AuditEventRecord> },
  input: { commandId: string; action: DeviceAction; identifier: string; commandTopic: string; actorUserId: string; reason?: string }
): Promise<DeviceCommandRecord> {
  const now = new Date();
  const device = await col.devices.findOne({ $or: [{ serialNumber: input.identifier }, { deviceId: input.identifier }] });
  if (!device) throw new Error("Device not found");

  const command: DeviceCommandRecord = {
    commandId: input.commandId,
    action: input.action,
    deviceId: device.deviceId,
    serialNumber: device.serialNumber,
    commandTopic: input.commandTopic,
    status: "queued",
    actorUserId: input.actorUserId,
    reason: input.reason,
    createdAt: now,
    updatedAt: now,
  };

  await col.deviceCommands.insertOne(command);
  await col.auditEvents.insertOne({
    eventType: `device.command.${input.action}.queued`,
    actorUserId: input.actorUserId,
    tenantId: device.tenantId,
    deviceSerialNumber: device.serialNumber,
    deviceId: device.deviceId,
    payload: { commandId: input.commandId, reason: input.reason, commandTopic: input.commandTopic },
    createdAt: now,
  });

  return command;
}

export async function markDeviceCommandPublished(deviceCommands: Collection<DeviceCommandRecord>, commandId: string): Promise<void> {
  await deviceCommands.updateOne({ commandId }, { $set: { status: "published", updatedAt: new Date() } });
}

export async function markDeviceCommandFailed(deviceCommands: Collection<DeviceCommandRecord>, commandId: string, errorMessage: string): Promise<void> {
  await deviceCommands.updateOne({ commandId }, { $set: { status: "failed", errorMessage, updatedAt: new Date() } });
}

export async function getDeviceCommands(deviceCommands: Collection<DeviceCommandRecord>, limit = 50): Promise<DeviceCommandRecord[]> {
  return deviceCommands.find({}, { sort: { createdAt: -1 }, limit }).toArray();
}
