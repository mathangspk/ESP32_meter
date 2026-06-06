import { Collection } from "mongodb";
import { TelemetryPayload } from "../types";
import { DeviceRecord, DeviceStateRecord, DeviceAssignmentRecord, AuditEventRecord } from "./types";

interface ReconcileCtx {
  devices: Collection<DeviceRecord>;
  deviceStates: Collection<DeviceStateRecord>;
  deviceAssignments: Collection<DeviceAssignmentRecord>;
  auditEvents: Collection<AuditEventRecord>;
}

export async function upsertDeviceFromTelemetry(ctx: ReconcileCtx, payload: TelemetryPayload): Promise<void> {
  const now = new Date();
  await reconcileDeviceIdentityFromTelemetry(ctx, payload, now);

  const setFields: Partial<DeviceRecord> = {
    deviceId: payload.device_id,
    lastSeenAt: now,
    lastFirmwareVersion: payload.firmware_version,
    ipAddress: payload.ip_address,
    updatedAt: now,
  };

  if (payload.mac_address) setFields.macAddress = payload.mac_address;
  if (payload.chip_family) setFields.chipFamily = payload.chip_family;
  if (payload.chip_model) setFields.chipModel = payload.chip_model;
  if (payload.board_type) setFields.boardType = payload.board_type;

  await ctx.devices.updateOne(
    { serialNumber: payload.serial_number },
    {
      $set: setFields,
      $setOnInsert: {
        serialNumber: payload.serial_number,
        claimStatus: "unclaimed",
        lifecycleStatus: "networked_unclaimed",
        firstSeenAt: now,
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function reconcileDeviceIdentityFromTelemetry(
  ctx: ReconcileCtx,
  payload: TelemetryPayload,
  now: Date,
): Promise<void> {
  if (!payload.mac_address) return;

  const existingBySerial = await ctx.devices.findOne({ serialNumber: payload.serial_number });
  if (existingBySerial) return;

  const existingByMac = await ctx.devices.findOne({ macAddress: payload.mac_address });
  if (!existingByMac || existingByMac.serialNumber === payload.serial_number) return;

  const collision = await ctx.devices.findOne({
    serialNumber: payload.serial_number,
    macAddress: { $ne: payload.mac_address },
  });
  if (collision) return;

  const previousSerialNumber = existingByMac.serialNumber;
  const previousDeviceId = existingByMac.deviceId;

  await ctx.devices.updateOne(
    { serialNumber: previousSerialNumber },
    {
      $set: {
        serialNumber: payload.serial_number,
        deviceId: payload.device_id,
        lastSeenAt: now,
        lastFirmwareVersion: payload.firmware_version,
        updatedAt: now,
      },
    },
  );

  await ctx.deviceStates.updateOne(
    { deviceId: previousDeviceId },
    { $set: { deviceId: payload.device_id, serialNumber: payload.serial_number, updatedAt: now } },
  );

  await ctx.deviceAssignments.updateMany(
    { serialNumber: previousSerialNumber, unassignedAt: { $exists: false } },
    { $set: { serialNumber: payload.serial_number } },
  );

  await ctx.auditEvents.insertOne({
    eventType: "device.identity.migrated",
    actorUserId: "system",
    tenantId: existingByMac.tenantId,
    deviceSerialNumber: payload.serial_number,
    deviceId: payload.device_id,
    payload: { previousSerialNumber, previousDeviceId, macAddress: payload.mac_address },
    createdAt: now,
  });
}
