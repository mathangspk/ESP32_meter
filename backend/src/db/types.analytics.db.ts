import { ObjectId, Document } from "mongodb";
import { NotificationType, NotificationChannel, NotificationQueueStatus } from "./types.user";

export type AlertEventRecord = {
  deviceId: string;
  serialNumber: string;
  type: "offline" | "recovered";
  message: string;
  sentAt: Date;
  status: "queued" | "sent" | "failed";
};

export type TelemetryRecord = {
  deviceId: string;
  serialNumber: string;
  timestamp: Date;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  ipAddress: string;
  firmwareVersion: string;
  macAddress?: string;
  chipFamily?: string;
  chipModel?: string;
  boardType?: string;
  receivedAt: Date;
};

export type TelemetryHourlyRecord = {
  serialNumber: string;
  deviceId: string;
  hourStart: Date;
  firstEnergy: number;
  lastEnergy: number;
  energyKwh?: number;
  counterReset: boolean;
  avgPower: number;
  maxPower: number;
  avgVoltage: number;
  minVoltage: number;
  maxVoltage: number;
  avgCurrent: number;
  sampleCount: number;
  firstTimestamp: Date;
  lastTimestamp: Date;
  aggregatedAt: Date;
};

export type NotificationQueueRecord = {
  _id?: ObjectId;
  type: NotificationType;
  channel: NotificationChannel;
  targetExternalId: string;
  tenantId?: string;
  userId?: string;
  title?: string;
  text: string;
  payload?: Document;
  status: NotificationQueueStatus;
  attemptCount: number;
  lastError?: string;
  createdAt: Date;
  processingAt?: Date;
  sentAt?: Date;
  updatedAt: Date;
};
