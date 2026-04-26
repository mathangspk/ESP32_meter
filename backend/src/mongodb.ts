import { Collection, Db, MongoClient } from "mongodb";
import { config } from "./config";
import { serviceState } from "./service-state";
import { TelemetryPayload } from "./types";

export type DeviceStateRecord = {
  deviceId: string;
  serialNumber: string;
  lastSeenAt: Date;
  lastTelemetryAt: Date;
  isOffline: boolean;
  lastOfflineAlertAt?: Date;
  lastRecoveredAlertAt?: Date;
  lastVoltage: number;
  lastPower: number;
  updatedAt: Date;
};

export type AlertEventRecord = {
  deviceId: string;
  serialNumber: string;
  type: "offline" | "recovered";
  message: string;
  sentAt: Date;
  status: "sent" | "failed";
};

type TelemetryRecord = {
  deviceId: string;
  serialNumber: string;
  timestamp: Date;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  ipAddress: string;
  firmwareVersion: string;
  receivedAt: Date;
};

export class MongoService {
  private client = new MongoClient(config.MONGODB_URI);
  private db!: Db;
  private telemetry!: Collection<TelemetryRecord>;
  private deviceStates!: Collection<DeviceStateRecord>;
  private alertEvents!: Collection<AlertEventRecord>;

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db(config.MONGODB_DB_NAME);
    this.telemetry = this.db.collection<TelemetryRecord>("telemetry");
    this.deviceStates = this.db.collection<DeviceStateRecord>("device_states");
    this.alertEvents = this.db.collection<AlertEventRecord>("alert_events");
    await this.ensureIndexes();
    serviceState.setMongodbConnected(true);
  }

  async close(): Promise<void> {
    serviceState.setMongodbConnected(false);
    await this.client.close();
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
      receivedAt: new Date(),
    });
  }

  async upsertDeviceState(payload: TelemetryPayload): Promise<DeviceStateRecord | null> {
    const now = new Date();
    const result = await this.deviceStates.findOneAndUpdate(
      { deviceId: payload.device_id },
      {
        $set: {
          serialNumber: payload.serial_number,
          lastSeenAt: now,
          lastTelemetryAt: new Date(payload.timestamp),
          lastVoltage: payload.voltage,
          lastPower: payload.power,
          updatedAt: now,
        },
        $setOnInsert: {
          deviceId: payload.device_id,
          isOffline: false,
        },
      },
      { upsert: true, returnDocument: "before" },
    );
    return result;
  }

  async markRecovered(deviceId: string, sentAt: Date): Promise<void> {
    await this.deviceStates.updateOne(
      { deviceId },
      {
        $set: {
          isOffline: false,
          lastRecoveredAlertAt: sentAt,
          updatedAt: sentAt,
        },
      },
    );
  }

  async markOffline(deviceId: string, sentAt: Date): Promise<void> {
    await this.deviceStates.updateOne(
      { deviceId },
      {
        $set: {
          isOffline: true,
          lastOfflineAlertAt: sentAt,
          updatedAt: sentAt,
        },
      },
    );
  }

  async getDevicesToMarkOffline(cutoff: Date): Promise<DeviceStateRecord[]> {
    return this.deviceStates
      .find({
        isOffline: false,
        lastSeenAt: { $lt: cutoff },
      })
      .toArray();
  }

  async recordAlert(event: AlertEventRecord): Promise<void> {
    await this.alertEvents.insertOne(event);
  }

  private async ensureIndexes(): Promise<void> {
    await this.telemetry.createIndex({ deviceId: 1, timestamp: -1 });
    await this.deviceStates.createIndex({ deviceId: 1 }, { unique: true });
    await this.alertEvents.createIndex({ deviceId: 1, sentAt: -1 });
  }
}

export const mongoService = new MongoService();
