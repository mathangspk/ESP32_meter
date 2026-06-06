import { Collection } from "mongodb";
import { TelemetryPayload } from "../types";
import { DeviceRecord, DeviceStateRecord, TelemetryRecord, DeviceAssignmentRecord, AuditEventRecord } from "./types";
import { upsertDeviceFromTelemetry } from "./telemetry.reconcile";

export async function insertTelemetry(
  telemetry: Collection<TelemetryRecord>,
  payload: TelemetryPayload,
): Promise<void> {
  await telemetry.insertOne({
    deviceId: payload.device_id,
    serialNumber: payload.serial_number,
    timestamp: new Date(payload.timestamp),
    voltage: payload.voltage,
    current: payload.current,
    power: payload.power,
    energy: payload.energy,
    ipAddress: payload.ip_address,
    firmwareVersion: payload.firmware_version,
    macAddress: payload.mac_address,
    chipFamily: payload.chip_family,
    chipModel: payload.chip_model,
    boardType: payload.board_type,
    receivedAt: new Date(),
  });
}

export async function upsertDeviceState(
  ctx: {
    deviceStates: Collection<DeviceStateRecord>;
    devices: Collection<DeviceRecord>;
    deviceAssignments: Collection<DeviceAssignmentRecord>;
    auditEvents: Collection<AuditEventRecord>;
  },
  payload: TelemetryPayload,
): Promise<DeviceStateRecord | null> {
  await upsertDeviceFromTelemetry(ctx, payload);

  const now = new Date();
  return ctx.deviceStates.findOneAndUpdate(
    { deviceId: payload.device_id },
    {
      $set: {
        serialNumber: payload.serial_number,
        lastSeenAt: now,
        lastTelemetryAt: new Date(payload.timestamp),
        lastVoltage: payload.voltage,
        lastCurrent: payload.current,
        lastPower: payload.power,
        lastFirmwareVersion: payload.firmware_version,
        updatedAt: now,
      },
      $setOnInsert: {
        deviceId: payload.device_id,
        isOffline: false,
      },
    },
    { upsert: true, returnDocument: "before" },
  );
}
