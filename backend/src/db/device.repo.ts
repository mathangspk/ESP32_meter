import { Collection, Db } from "mongodb";
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
import * as queries from "./device.queries";
import * as mutations from "./device.mutations";
import * as commands from "./device.commands";

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
    return queries.getDevices(this.devices, limit);
  }

  async getDeviceHealth(identifier: string): Promise<DeviceListRecord | null> {
    return queries.getDeviceHealth(this.devices, identifier);
  }

  async getDeviceSerialNumbers(): Promise<Array<{ serialNumber: string; deviceId: string }>> {
    return queries.getDeviceSerialNumbers(this.devices);
  }

  async getDevicesForTenant(tenantId: string, limit = 50): Promise<DeviceListRecord[]> {
    return queries.getDevicesForTenant(this.devices, tenantId, limit);
  }

  async getUnclaimedDevices(options?: { onlineOnly?: boolean; limit?: number }): Promise<DeviceListRecord[]> {
    return queries.getUnclaimedDevices(this.devices, options);
  }

  async getOnlineUnclaimedDevicesCount(onlineCutoff: Date): Promise<number> {
    return queries.getOnlineUnclaimedDevicesCount(this.devices, onlineCutoff);
  }

  async claimDevice(input: { serialNumber: string; tenantId: string; siteId: string; ownerUserId: string; displayName: string }): Promise<DeviceRecord | null> {
    return mutations.claimDevice({ devices: this.devices, sites: this.sites, deviceAssignments: this.deviceAssignments, auditEvents: this.auditEvents }, input);
  }

  async unclaimDevice(input: { identifier: string; actorUserId: string; reason?: string }): Promise<DeviceRecord | null> {
    return mutations.unclaimDevice({ devices: this.devices, deviceAssignments: this.deviceAssignments, auditEvents: this.auditEvents }, input);
  }

  async updateDeviceDisplayName(identifier: string, displayName: string, actorUserId: string): Promise<DeviceRecord | null> {
    return mutations.updateDeviceDisplayName({ devices: this.devices, auditEvents: this.auditEvents }, identifier, displayName, actorUserId);
  }

  async createDeviceCommand(input: { commandId: string; action: DeviceAction; identifier: string; commandTopic: string; actorUserId: string; reason?: string }): Promise<DeviceCommandRecord> {
    return commands.createDeviceCommand({ devices: this.devices, deviceCommands: this.deviceCommands, auditEvents: this.auditEvents }, input);
  }

  async markDeviceCommandPublished(commandId: string): Promise<void> {
    return commands.markDeviceCommandPublished(this.deviceCommands, commandId);
  }

  async markDeviceCommandFailed(commandId: string, errorMessage: string): Promise<void> {
    return commands.markDeviceCommandFailed(this.deviceCommands, commandId, errorMessage);
  }

  async getDeviceCommands(limit = 50): Promise<DeviceCommandRecord[]> {
    return commands.getDeviceCommands(this.deviceCommands, limit);
  }
}
