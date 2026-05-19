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
};

export type User = {
  userId: string;
  username?: string;
  displayName?: string;
  systemRole?: "platform_admin" | "user";
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
};
