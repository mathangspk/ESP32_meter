export type User = {
  userId: string;
  username?: string;
  displayName?: string;
  systemRole?: "platform_admin" | "user";
  defaultTenantId?: string;
  status: string;
  createdAt: string;
  lastActiveAt?: string;
};

export type Stats = { totalDevices: number; onlineDevices: number; totalUsers: number; totalTenants: number; };

export type Device = {
  deviceId: string;
  serialNumber: string;
  displayName?: string;
  lifecycleStatus: string;
  lastFirmwareVersion?: string;
  lastSeenAt?: string;
  ipAddress?: string;
  boardType?: string;
  state?: {
    isOffline: boolean;
    lastVoltage: number;
    lastCurrent: number;
    lastPower: number;
    lastSeenAt: string;
  };
};

export type TelemetryRow = { timestamp: string; voltage: number; current: number; power: number; energy: number; };
export type Tenant = { tenantId: string; name: string; status: string; createdAt: string; };
export type Site = { siteId: string; tenantId: string; name: string; timezone: string; createdAt: string; };
export type CreateUserInput = { username: string; password: string; displayName: string; systemRole: "platform_admin" | "user"; tenantId?: string; };
export type DayBreakdown = { date: string; energyKwh?: number; dataStatus: string; };

export type PeakDaySummary = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  siteTimezone: string;
  peakDate?: string;
  peakDayEnergyKwh?: number;
  dailyBreakdown: DayBreakdown[];
  dataStatus: "ok" | "insufficient_data" | "counter_reset_detected" | "no_valid_days";
  messages: string[];
};

export type HourlySlot = {
  hourStart: string;
  localHour: number;
  energyKwh?: number;
  avgPower: number;
  maxPower: number;
  sampleCount: number;
  counterReset: boolean;
};

export type HourlyBreakdown = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  siteTimezone: string;
  date: string;
  hours: HourlySlot[];
  totalEnergyKwh?: number;
  dataStatus: "ok" | "no_data" | "partial_data";
  messages: string[];
};
