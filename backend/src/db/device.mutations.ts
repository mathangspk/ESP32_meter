import { Collection } from "mongodb";
import { AuditEventRecord, DeviceAssignmentRecord, DeviceRecord, SiteRecord } from "./types";

export async function claimDevice(
  col: { devices: Collection<DeviceRecord>; sites: Collection<SiteRecord>; deviceAssignments: Collection<DeviceAssignmentRecord>; auditEvents: Collection<AuditEventRecord> },
  input: { serialNumber: string; tenantId: string; siteId: string; ownerUserId: string; displayName: string }
): Promise<DeviceRecord | null> {
  const now = new Date();
  const exist = await col.devices.findOne({ serialNumber: input.serialNumber });
  if (!exist) throw new Error("Device serial number not found");
  if (exist.claimStatus === "claimed") throw new Error("Device is already claimed");
  const site = await col.sites.findOne({ siteId: input.siteId, tenantId: input.tenantId, status: "active" });
  if (!site) throw new Error("Selected site does not belong to the tenant or is inactive");

  await col.devices.updateOne({ serialNumber: input.serialNumber }, {
    $set: { tenantId: input.tenantId, siteId: input.siteId, ownerUserId: input.ownerUserId, displayName: input.displayName, claimStatus: "claimed", lifecycleStatus: "active", claimedAt: now, commissionedAt: exist.commissionedAt ?? now, updatedAt: now }
  });
  await col.deviceAssignments.insertOne({ serialNumber: input.serialNumber, tenantId: input.tenantId, siteId: input.siteId, ownerUserId: input.ownerUserId, assignedAt: now });
  await col.auditEvents.insertOne({ eventType: "device.claimed", actorUserId: input.ownerUserId, tenantId: input.tenantId, deviceSerialNumber: input.serialNumber, payload: { siteId: input.siteId, displayName: input.displayName }, createdAt: now });
  return col.devices.findOne({ serialNumber: input.serialNumber });
}

export async function unclaimDevice(
  col: { devices: Collection<DeviceRecord>; deviceAssignments: Collection<DeviceAssignmentRecord>; auditEvents: Collection<AuditEventRecord> },
  input: { identifier: string; actorUserId: string; reason?: string }
): Promise<DeviceRecord | null> {
  const now = new Date();
  const exist = await col.devices.findOne({ $or: [{ serialNumber: input.identifier }, { deviceId: input.identifier }] });
  if (!exist) throw new Error("Device not found");
  if (exist.claimStatus === "unclaimed") throw new Error("Device is already unclaimed");

  await col.devices.updateOne({ serialNumber: exist.serialNumber }, {
    $set: { claimStatus: "unclaimed", lifecycleStatus: "unclaimed", unclaimedAt: now, updatedAt: now },
    $unset: { tenantId: "", siteId: "", ownerUserId: "", displayName: "" }
  });
  await col.deviceAssignments.updateMany({ serialNumber: exist.serialNumber, unassignedAt: { $exists: false } }, { $set: { unassignedAt: now } });
  await col.auditEvents.insertOne({ eventType: "device.unclaimed", actorUserId: input.actorUserId, tenantId: exist.tenantId, deviceSerialNumber: exist.serialNumber, deviceId: exist.deviceId, payload: { reason: input.reason, previousSiteId: exist.siteId, previousOwnerUserId: exist.ownerUserId }, createdAt: now });
  return col.devices.findOne({ serialNumber: exist.serialNumber });
}

export async function updateDeviceDisplayName(
  col: { devices: Collection<DeviceRecord>; auditEvents: Collection<AuditEventRecord> },
  identifier: string, displayName: string, actorUserId: string
): Promise<DeviceRecord | null> {
  const now = new Date();
  const exist = await col.devices.findOne({ $or: [{ serialNumber: identifier }, { deviceId: identifier }] });
  if (!exist) throw new Error("Device not found");
  if (exist.claimStatus !== "claimed") throw new Error("Only claimed devices can be renamed");

  await col.devices.updateOne({ serialNumber: exist.serialNumber }, { $set: { displayName, updatedAt: now } });
  await col.auditEvents.insertOne({ eventType: "device.renamed", actorUserId, tenantId: exist.tenantId, deviceSerialNumber: exist.serialNumber, deviceId: exist.deviceId, payload: { oldDisplayName: exist.displayName, newDisplayName: displayName }, createdAt: now });
  return col.devices.findOne({ serialNumber: exist.serialNumber });
}
