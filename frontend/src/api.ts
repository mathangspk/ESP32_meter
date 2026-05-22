const BASE = "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data as T;
}

export const api = {
  login: (username: string, password: string) =>
    req<{ token: string; user: User }>("POST", "/auth/login", { username, password }),
  me: () => req<User>("GET", "/auth/me"),
  stats: () => req<Stats>("GET", "/dashboard/stats"),
  devices: () => req<Device[]>("GET", "/dashboard/devices"),
  telemetry: (serial: string) => req<TelemetryRow[]>("GET", `/dashboard/devices/${serial}/telemetry`),
  users: () => req<User[]>("GET", "/dashboard/users"),
  createUser: (data: CreateUserInput) => req<User>("POST", "/dashboard/users", data),
  updateUser: (userId: string, data: Partial<User & { status: string }>) =>
    req<void>("PUT", `/dashboard/users/${userId}`, data),
  deleteUser: (userId: string) => req<void>("DELETE", `/dashboard/users/${userId}`),
  tenants: () => req<Tenant[]>("GET", "/dashboard/tenants"),
  peakDay: (serial: string) => req<PeakDaySummary>("GET", `/devices/${serial}/analytics/peak-day`),
  hourly: (serial: string, date = "today") => req<HourlyBreakdown>("GET", `/devices/${serial}/analytics/hourly?date=${date}`),
  deviceAction: (deviceId: string, action: string) => req<{ success: boolean; message?: string }>("POST", `/devices/${deviceId}/actions`, { action }),
  deviceOta: (deviceId: string, version: string) => req<{ jobId: string; status: string }>("POST", `/devices/${deviceId}/ota`, { version }),
  renameDevice: (deviceId: string, displayName: string) => req<Device>("PUT", `/devices/${deviceId}`, { displayName }),
  releases: () => req<any[]>("GET", "/admin/firmware/releases"),
};

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

export type Stats = {
  totalDevices: number;
  onlineDevices: number;
  totalUsers: number;
  totalTenants: number;
};

export type Device = {
  deviceId: string;
  serialNumber: string;
  displayName?: string;
  lifecycleStatus: string;
  lastFirmwareVersion?: string;
  lastSeenAt?: string;
  state?: {
    isOffline: boolean;
    lastVoltage: number;
    lastCurrent: number;
    lastPower: number;
    lastSeenAt: string;
  };
};

export type TelemetryRow = {
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
};

export type Tenant = {
  tenantId: string;
  name: string;
  status: string;
  createdAt: string;
};

export type CreateUserInput = {
  username: string;
  password: string;
  displayName: string;
  systemRole: "platform_admin" | "user";
  tenantId?: string;
};

export type DayBreakdown = {
  date: string;
  energyKwh?: number;
  dataStatus: string;
};

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
