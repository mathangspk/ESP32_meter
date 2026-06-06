import { Collection, Db } from "mongodb";
import { TelemetryPayload } from "../types";
import {
  AuditEventRecord,
  DeviceAssignmentRecord,
  DeviceRecord,
  DeviceStateRecord,
  TelemetryHourlyRecord,
  TelemetryRecord,
} from "./types";
import * as ingest from "./telemetry.ingest";
import * as offline from "./telemetry.offline";
import * as rollup from "./telemetry.rollup";

export class TelemetryRepo {
  private telemetry: Collection<TelemetryRecord>;
  private deviceStates: Collection<DeviceStateRecord>;
  private devices: Collection<DeviceRecord>;
  private deviceAssignments: Collection<DeviceAssignmentRecord>;
  private auditEvents: Collection<AuditEventRecord>;
  private telemetryHourly: Collection<TelemetryHourlyRecord>;

  constructor(db: Db) {
    this.telemetry = db.collection<TelemetryRecord>("telemetry");
    this.deviceStates = db.collection<DeviceStateRecord>("device_states");
    this.devices = db.collection<DeviceRecord>("devices");
    this.deviceAssignments = db.collection<DeviceAssignmentRecord>("device_assignments");
    this.auditEvents = db.collection<AuditEventRecord>("audit_events");
    this.telemetryHourly = db.collection<TelemetryHourlyRecord>("telemetry_hourly");
  }

  async insertTelemetry(payload: TelemetryPayload): Promise<void> {
    return ingest.insertTelemetry(this.telemetry, payload);
  }

  async upsertDeviceState(payload: TelemetryPayload): Promise<DeviceStateRecord | null> {
    return ingest.upsertDeviceState({
      deviceStates: this.deviceStates,
      devices: this.devices,
      deviceAssignments: this.deviceAssignments,
      auditEvents: this.auditEvents,
    }, payload);
  }

  async markRecovered(deviceId: string, sentAt: Date): Promise<void> {
    return offline.markRecovered(this.deviceStates, deviceId, sentAt);
  }

  async clearOfflinePending(deviceId: string): Promise<void> {
    return offline.clearOfflinePending(this.deviceStates, deviceId);
  }

  async markOfflinePending(detectionCutoff: Date): Promise<void> {
    return offline.markOfflinePending(this.deviceStates, detectionCutoff);
  }

  async markOffline(deviceId: string, sentAt: Date): Promise<void> {
    return offline.markOffline(this.deviceStates, deviceId, sentAt);
  }

  async getDevicesToAlert(alertCutoff: Date): Promise<DeviceStateRecord[]> {
    return offline.getDevicesToAlert(this.deviceStates, alertCutoff);
  }

  async getRecentTelemetry(serialNumber: string, limit = 20): Promise<TelemetryRecord[]> {
    return offline.getRecentTelemetry(this.telemetry, serialNumber, limit);
  }

  async rollupTelemetryForDevice(
    serialNumber: string,
    deviceId: string,
    startHour: Date,
    endHour: Date,
  ): Promise<{ hoursProcessed: number; hoursSkipped: number }> {
    return rollup.rollupTelemetryForDevice({
      telemetry: this.telemetry,
      telemetryHourly: this.telemetryHourly,
    }, serialNumber, deviceId, startHour, endHour);
  }
}
