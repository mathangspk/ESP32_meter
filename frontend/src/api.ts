import { User, Stats, Device, TelemetryRow, Tenant, Site, CreateUserInput, PeakDaySummary, HourlyBreakdown } from "./api.types";

export type { User, Stats, Device, TelemetryRow, Tenant, Site, CreateUserInput, PeakDaySummary, HourlyBreakdown };

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
  sites: (tenantId?: string) => req<Site[]>("GET", `/dashboard/sites${tenantId ? `?tenantId=${tenantId}` : ""}`),
  claimDevice: (data: {
    serialNumber: string;
    tenantId: string;
    siteId: string;
    ownerUserId: string;
    displayName: string;
  }) => req<Device>("POST", "/devices/claim", data),
  peakDay: (serial: string, options?: { preset?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (options?.preset) params.append("preset", options.preset);
    if (options?.startDate) params.append("startDate", options.startDate);
    if (options?.endDate) params.append("endDate", options.endDate);
    const qs = params.toString();
    return req<PeakDaySummary>("GET", `/devices/${serial}/analytics/peak-day${qs ? `?${qs}` : ""}`);
  },
  hourly: (serial: string, date = "today") => req<HourlyBreakdown>("GET", `/devices/${serial}/analytics/hourly?date=${date}`),
  deviceAction: (deviceId: string, action: string) => req<{ success: boolean; message?: string }>("POST", `/devices/${deviceId}/actions`, { action }),
  deviceOta: (deviceId: string, version: string) => req<{ jobId: string; status: string }>("POST", `/devices/${deviceId}/ota`, { version }),
  renameDevice: (deviceId: string, displayName: string) => req<Device>("PUT", `/devices/${deviceId}`, { displayName }),
  releases: () => req<any[]>("GET", "/admin/firmware/releases"),
};
