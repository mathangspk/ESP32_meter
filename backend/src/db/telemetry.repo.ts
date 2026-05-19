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
    await this.telemetry.insertOne({
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

  async upsertDeviceState(payload: TelemetryPayload): Promise<DeviceStateRecord | null> {
    await this.upsertDeviceFromTelemetry(payload);

    const now = new Date();
    return this.deviceStates.findOneAndUpdate(
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

  async markRecovered(deviceId: string, sentAt: Date): Promise<void> {
    await this.deviceStates.updateOne(
      { deviceId },
      {
        $set: { isOffline: false, lastRecoveredAlertAt: sentAt, updatedAt: sentAt },
        $unset: { offlineSince: "" },
      },
    );
  }

  async clearOfflinePending(deviceId: string): Promise<void> {
    await this.deviceStates.updateOne(
      { deviceId },
      { $unset: { offlineSince: "" }, $set: { updatedAt: new Date() } },
    );
  }

  async markOfflinePending(detectionCutoff: Date): Promise<void> {
    const now = new Date();
    await this.deviceStates.updateMany(
      { isOffline: false, offlineSince: { $exists: false }, lastSeenAt: { $lt: detectionCutoff } },
      { $set: { offlineSince: now, updatedAt: now } },
    );
  }

  async markOffline(deviceId: string, sentAt: Date): Promise<void> {
    await this.deviceStates.updateOne(
      { deviceId },
      { $set: { isOffline: true, lastOfflineAlertAt: sentAt, updatedAt: sentAt } },
    );
  }

  async getDevicesToAlert(alertCutoff: Date): Promise<DeviceStateRecord[]> {
    return this.deviceStates
      .find({ isOffline: false, offlineSince: { $exists: true, $lt: alertCutoff } })
      .toArray();
  }

  async getRecentTelemetry(serialNumber: string, limit = 20): Promise<TelemetryRecord[]> {
    return this.telemetry.find({ serialNumber }, { sort: { timestamp: -1 }, limit }).toArray();
  }

  async rollupTelemetryForDevice(
    serialNumber: string,
    deviceId: string,
    startHour: Date,
    endHour: Date,
  ): Promise<{ hoursProcessed: number; hoursSkipped: number }> {
    const HOUR_MS = 60 * 60 * 1000;
    const start = new Date(Math.floor(startHour.getTime() / HOUR_MS) * HOUR_MS);
    const end = new Date(Math.floor(endHour.getTime() / HOUR_MS) * HOUR_MS);

    const existing = await this.telemetryHourly
      .find({ serialNumber, hourStart: { $gte: start, $lt: end } }, { projection: { _id: 0, hourStart: 1 } })
      .toArray();
    const existingSet = new Set(existing.map((r) => r.hourStart.getTime()));

    let hoursProcessed = 0;
    let hoursSkipped = 0;
    let cursor = start;

    while (cursor < end) {
      if (existingSet.has(cursor.getTime())) {
        hoursSkipped++;
      } else {
        const processed = await this.rollupOneHour(serialNumber, deviceId, cursor);
        if (processed) hoursProcessed++;
      }
      cursor = new Date(cursor.getTime() + HOUR_MS);
    }

    return { hoursProcessed, hoursSkipped };
  }

  private async rollupOneHour(serialNumber: string, deviceId: string, hourStart: Date): Promise<boolean> {
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    type HourAgg = {
      firstEnergy: number;
      lastEnergy: number;
      firstTimestamp: Date;
      lastTimestamp: Date;
      avgPower: number;
      maxPower: number;
      avgVoltage: number;
      minVoltage: number;
      maxVoltage: number;
      avgCurrent: number;
      sampleCount: number;
    };

    const [agg] = await this.telemetry
      .aggregate<HourAgg>([
        { $match: { serialNumber, timestamp: { $gte: hourStart, $lt: hourEnd } } },
        { $sort: { timestamp: 1 } },
        {
          $group: {
            _id: null,
            firstEnergy: { $first: "$energy" },
            lastEnergy: { $last: "$energy" },
            firstTimestamp: { $first: "$timestamp" },
            lastTimestamp: { $last: "$timestamp" },
            avgPower: { $avg: "$power" },
            maxPower: { $max: "$power" },
            avgVoltage: { $avg: "$voltage" },
            minVoltage: { $min: "$voltage" },
            maxVoltage: { $max: "$voltage" },
            avgCurrent: { $avg: "$current" },
            sampleCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    if (!agg || agg.sampleCount === 0) return false;

    const counterReset = agg.lastEnergy < agg.firstEnergy;
    const energyKwh = counterReset ? undefined : Number((agg.lastEnergy - agg.firstEnergy).toFixed(3));
    const now = new Date();

    await this.telemetryHourly.updateOne(
      { serialNumber, hourStart },
      {
        $set: {
          deviceId,
          firstEnergy: agg.firstEnergy,
          lastEnergy: agg.lastEnergy,
          energyKwh,
          counterReset,
          avgPower: Number(agg.avgPower.toFixed(2)),
          maxPower: Number(agg.maxPower.toFixed(2)),
          avgVoltage: Number(agg.avgVoltage.toFixed(2)),
          minVoltage: Number(agg.minVoltage.toFixed(2)),
          maxVoltage: Number(agg.maxVoltage.toFixed(2)),
          avgCurrent: Number(agg.avgCurrent.toFixed(3)),
          sampleCount: agg.sampleCount,
          firstTimestamp: agg.firstTimestamp,
          lastTimestamp: agg.lastTimestamp,
          aggregatedAt: now,
        },
        $setOnInsert: { serialNumber, hourStart },
      },
      { upsert: true },
    );

    return true;
  }

  private async upsertDeviceFromTelemetry(payload: TelemetryPayload): Promise<void> {
    const now = new Date();
    await this.reconcileDeviceIdentityFromTelemetry(payload, now);

    const setFields: Partial<DeviceRecord> = {
      deviceId: payload.device_id,
      lastSeenAt: now,
      lastFirmwareVersion: payload.firmware_version,
      updatedAt: now,
    };

    if (payload.mac_address) setFields.macAddress = payload.mac_address;
    if (payload.chip_family) setFields.chipFamily = payload.chip_family;
    if (payload.chip_model) setFields.chipModel = payload.chip_model;
    if (payload.board_type) setFields.boardType = payload.board_type;

    await this.devices.updateOne(
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

  private async reconcileDeviceIdentityFromTelemetry(payload: TelemetryPayload, now: Date): Promise<void> {
    if (!payload.mac_address) return;

    const existingBySerial = await this.devices.findOne({ serialNumber: payload.serial_number });
    if (existingBySerial) return;

    const existingByMac = await this.devices.findOne({ macAddress: payload.mac_address });
    if (!existingByMac || existingByMac.serialNumber === payload.serial_number) return;

    const collision = await this.devices.findOne({
      serialNumber: payload.serial_number,
      macAddress: { $ne: payload.mac_address },
    });
    if (collision) return;

    const previousSerialNumber = existingByMac.serialNumber;
    const previousDeviceId = existingByMac.deviceId;

    await this.devices.updateOne(
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

    await this.deviceStates.updateOne(
      { deviceId: previousDeviceId },
      { $set: { deviceId: payload.device_id, serialNumber: payload.serial_number, updatedAt: now } },
    );

    await this.deviceAssignments.updateMany(
      { serialNumber: previousSerialNumber, unassignedAt: { $exists: false } },
      { $set: { serialNumber: payload.serial_number } },
    );

    await this.auditEvents.insertOne({
      eventType: "device.identity.migrated",
      actorUserId: "system",
      tenantId: existingByMac.tenantId,
      deviceSerialNumber: payload.serial_number,
      deviceId: payload.device_id,
      payload: { previousSerialNumber, previousDeviceId, macAddress: payload.mac_address },
      createdAt: now,
    });
  }
}
