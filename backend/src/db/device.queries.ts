import { Collection, Document } from "mongodb";
import { config } from "../config";
import { DeviceListRecord, DeviceRecord } from "./types";

export async function getDevices(devices: Collection<DeviceRecord>, limit = 50): Promise<DeviceListRecord[]> {
  return devices.aggregate<DeviceListRecord>([
    { $sort: { updatedAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "device_states",
        localField: "serialNumber",
        foreignField: "serialNumber",
        as: "state",
      },
    },
    { $addFields: { state: { $arrayElemAt: ["$state", 0] } } },
  ]).toArray();
}

export async function getDeviceHealth(devices: Collection<DeviceRecord>, identifier: string): Promise<DeviceListRecord | null> {
  const results = await devices.aggregate<DeviceListRecord>([
    { $match: { $or: [{ deviceId: identifier }, { serialNumber: identifier }] } },
    {
      $lookup: {
        from: "device_states",
        localField: "serialNumber",
        foreignField: "serialNumber",
        as: "state",
      },
    },
    { $addFields: { state: { $arrayElemAt: ["$state", 0] } } },
    { $limit: 1 },
  ]).toArray();
  return results[0] ?? null;
}

export async function getDeviceSerialNumbers(devices: Collection<DeviceRecord>): Promise<Array<{ serialNumber: string; deviceId: string }>> {
  const docs = await devices.find({}, { projection: { _id: 0, serialNumber: 1, deviceId: 1 } }).toArray();
  return docs.map((doc) => ({ serialNumber: doc.serialNumber, deviceId: doc.deviceId }));
}

export async function getDevicesForTenant(devices: Collection<DeviceRecord>, tenantId: string, limit = 50): Promise<DeviceListRecord[]> {
  return devices.aggregate<DeviceListRecord>([
    { $match: { tenantId } },
    { $sort: { updatedAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "device_states",
        localField: "serialNumber",
        foreignField: "serialNumber",
        as: "state",
      },
    },
    { $addFields: { state: { $arrayElemAt: ["$state", 0] } } },
  ]).toArray();
}

export async function getUnclaimedDevices(devices: Collection<DeviceRecord>, options?: { onlineOnly?: boolean; limit?: number }): Promise<DeviceListRecord[]> {
  const onlineOnly = options?.onlineOnly ?? false;
  const limit = options?.limit ?? 50;
  const onlineCutoff = new Date(Date.now() - config.OFFLINE_TIMEOUT_SECONDS * 1000);
  const pipeline: Document[] = [
    { $match: { claimStatus: "unclaimed" } },
    {
      $lookup: {
        from: "device_states",
        localField: "serialNumber",
        foreignField: "serialNumber",
        as: "state",
      },
    },
    { $addFields: { state: { $arrayElemAt: ["$state", 0] } } },
  ];
  if (onlineOnly) pipeline.push({ $match: { "state.lastSeenAt": { $gte: onlineCutoff } } });
  pipeline.push({ $sort: { updatedAt: -1 } }, { $limit: limit });
  return devices.aggregate<DeviceListRecord>(pipeline).toArray();
}

export async function getOnlineUnclaimedDevicesCount(devices: Collection<DeviceRecord>, onlineCutoff: Date): Promise<number> {
  const results = await devices.aggregate<{ count: number }>([
    { $match: { claimStatus: "unclaimed" } },
    {
      $lookup: {
        from: "device_states",
        localField: "serialNumber",
        foreignField: "serialNumber",
        as: "state",
      },
    },
    { $addFields: { state: { $arrayElemAt: ["$state", 0] } } },
    { $match: { "state.lastSeenAt": { $gte: onlineCutoff } } },
    { $count: "count" },
  ]).toArray();
  return results[0]?.count ?? 0;
}
