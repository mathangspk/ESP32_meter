import { Collection, Db, Document } from "mongodb";
import { config } from "../config";
import { DeviceAction } from "../types";
import {
  AuditEventRecord,
  DeviceAssignmentRecord,
  DeviceCommandRecord,
  DeviceListRecord,
  DeviceRecord,
  DeviceStateRecord,
  SiteRecord,
} from "./types";

export class DeviceRepo {
  private devices: Collection<DeviceRecord>;
  private deviceStates: Collection<DeviceStateRecord>;
  private deviceAssignments: Collection<DeviceAssignmentRecord>;
  private auditEvents: Collection<AuditEventRecord>;
  private deviceCommands: Collection<DeviceCommandRecord>;
  private sites: Collection<SiteRecord>;

  constructor(db: Db) {
    this.devices = db.collection<DeviceRecord>("devices");
    this.deviceStates = db.collection<DeviceStateRecord>("device_states");
    this.deviceAssignments = db.collection<DeviceAssignmentRecord>("device_assignments");
    this.auditEvents = db.collection<AuditEventRecord>("audit_events");
    this.deviceCommands = db.collection<DeviceCommandRecord>("device_commands");
    this.sites = db.collection<SiteRecord>("sites");
  }

  async getDevices(limit = 50): Promise<DeviceListRecord[]> {
    return this.devices
      .aggregate<DeviceListRecord>([
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
      ])
      .toArray();
  }

  async getDeviceHealth(identifier: string): Promise<DeviceListRecord | null> {
    const results = await this.devices
      .aggregate<DeviceListRecord>([
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
      ])
      .toArray();
    return results[0] ?? null;
  }

  async getDeviceSerialNumbers(): Promise<Array<{ serialNumber: string; deviceId: string }>> {
    const docs = await this.devices
      .find({}, { projection: { _id: 0, serialNumber: 1, deviceId: 1 } })
      .toArray();
    return docs.map((doc) => ({ serialNumber: doc.serialNumber, deviceId: doc.deviceId }));
  }

  async getDevicesForTenant(tenantId: string, limit = 50): Promise<DeviceListRecord[]> {
    return this.devices
      .aggregate<DeviceListRecord>([
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
      ])
      .toArray();
  }

  async getUnclaimedDevices(options?: { onlineOnly?: boolean; limit?: number }): Promise<DeviceListRecord[]> {
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

    if (onlineOnly) {
      pipeline.push({ $match: { "state.lastSeenAt": { $gte: onlineCutoff } } });
    }

    pipeline.push({ $sort: { updatedAt: -1 } }, { $limit: limit });

    return this.devices.aggregate<DeviceListRecord>(pipeline).toArray();
  }

  async claimDevice(input: {
    serialNumber: string;
    tenantId: string;
    siteId: string;
    ownerUserId: string;
    displayName: string;
  }): Promise<DeviceRecord | null> {
    const now = new Date();
    const existingDevice = await this.devices.findOne({ serialNumber: input.serialNumber });
    if (!existingDevice) throw new Error("Device serial number not found");
    if (existingDevice.claimStatus === "claimed") throw new Error("Device is already claimed");

    const site = await this.sites.findOne({ siteId: input.siteId, tenantId: input.tenantId, status: "active" });
    if (!site) throw new Error("Selected site does not belong to the tenant or is inactive");

    await this.devices.updateOne(
      { serialNumber: input.serialNumber },
      {
        $set: {
          tenantId: input.tenantId,
          siteId: input.siteId,
          ownerUserId: input.ownerUserId,
          displayName: input.displayName,
          claimStatus: "claimed",
          lifecycleStatus: "active",
          claimedAt: now,
          commissionedAt: existingDevice.commissionedAt ?? now,
          updatedAt: now,
        },
      },
    );

    await this.deviceAssignments.insertOne({
      serialNumber: input.serialNumber,
      tenantId: input.tenantId,
      siteId: input.siteId,
      ownerUserId: input.ownerUserId,
      assignedAt: now,
    });

    await this.auditEvents.insertOne({
      eventType: "device.claimed",
      actorUserId: input.ownerUserId,
      tenantId: input.tenantId,
      deviceSerialNumber: input.serialNumber,
      payload: { siteId: input.siteId, displayName: input.displayName },
      createdAt: now,
    });

    return this.devices.findOne({ serialNumber: input.serialNumber });
  }

  async unclaimDevice(input: { identifier: string; actorUserId: string; reason?: string }): Promise<DeviceRecord | null> {
    const now = new Date();
    const existingDevice = await this.devices.findOne({
      $or: [{ serialNumber: input.identifier }, { deviceId: input.identifier }],
    });
    if (!existingDevice) throw new Error("Device not found");
    if (existingDevice.claimStatus === "unclaimed") throw new Error("Device is already unclaimed");

    await this.devices.updateOne(
      { serialNumber: existingDevice.serialNumber },
      {
        $set: { claimStatus: "unclaimed", lifecycleStatus: "unclaimed", unclaimedAt: now, updatedAt: now },
        $unset: { tenantId: "", siteId: "", ownerUserId: "", displayName: "" },
      },
    );

    await this.deviceAssignments.updateMany(
      { serialNumber: existingDevice.serialNumber, unassignedAt: { $exists: false } },
      { $set: { unassignedAt: now } },
    );

    await this.auditEvents.insertOne({
      eventType: "device.unclaimed",
      actorUserId: input.actorUserId,
      tenantId: existingDevice.tenantId,
      deviceSerialNumber: existingDevice.serialNumber,
      deviceId: existingDevice.deviceId,
      payload: {
        reason: input.reason,
        previousSiteId: existingDevice.siteId,
        previousOwnerUserId: existingDevice.ownerUserId,
      },
      createdAt: now,
    });

    return this.devices.findOne({ serialNumber: existingDevice.serialNumber });
  }

  async createDeviceCommand(input: {
    commandId: string;
    action: DeviceAction;
    identifier: string;
    commandTopic: string;
    actorUserId: string;
    reason?: string;
  }): Promise<DeviceCommandRecord> {
    const now = new Date();
    const device = await this.devices.findOne({
      $or: [{ serialNumber: input.identifier }, { deviceId: input.identifier }],
    });
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

    await this.deviceCommands.insertOne(command);
    await this.auditEvents.insertOne({
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

  async markDeviceCommandPublished(commandId: string): Promise<void> {
    await this.deviceCommands.updateOne(
      { commandId },
      { $set: { status: "published", updatedAt: new Date() } },
    );
  }

  async markDeviceCommandFailed(commandId: string, errorMessage: string): Promise<void> {
    await this.deviceCommands.updateOne(
      { commandId },
      { $set: { status: "failed", errorMessage, updatedAt: new Date() } },
    );
  }

  async getDeviceCommands(limit = 50): Promise<DeviceCommandRecord[]> {
    return this.deviceCommands.find({}, { sort: { createdAt: -1 }, limit }).toArray();
  }

  async getOnlineUnclaimedDevicesCount(onlineCutoff: Date): Promise<number> {
    const results = await this.devices
      .aggregate<{ count: number }>([
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
      ])
      .toArray();
    return results[0]?.count ?? 0;
  }
}
