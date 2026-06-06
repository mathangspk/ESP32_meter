import { backendClient, Membership } from "./backend-client";

export function previewText(value: string, maxLength = 240) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}

export function formatMemberships(memberships: Membership[]): string {
  return memberships.map((m, i) => `${i + 1}. ${m.tenantName ?? m.tenantId} (${m.tenantId}, ${m.role})`).join("\n");
}

export function formatFleetSummary(s: Awaited<ReturnType<typeof backendClient.getFleetSummary>>): string {
  return [
    "Fleet summary:",
    `Devices: ${s.totals.devices} | Online: ${s.totals.onlineDevices} | Claimed: ${s.totals.claimedDevices} | Unclaimed: ${s.totals.unclaimedDevices}`,
    `Online unclaimed: ${s.totals.onlineUnclaimedDevices} | Users: ${s.totals.users} | Active users: ${s.totals.activeUsers}`,
    `Tenants: ${s.totals.tenants} | Sites: ${s.totals.sites}`,
  ].join("\n");
}

export function formatUserSummary(s: Awaited<ReturnType<typeof backendClient.getUserSummary>>): string {
  return [
    "User summary:",
    `Users: ${s.totals.users} | Active: ${s.totals.activeUsers} | Invited: ${s.totals.invitedUsers} | Suspended: ${s.totals.suspendedUsers}`,
  ].join("\n");
}

export function formatDeviceList(prefix: string, devices: Awaited<ReturnType<typeof backendClient.getDevicesForTenant>>): string {
  if (devices.length === 0) return `${prefix}: none`;
  return [
    `${prefix}:`,
    ...devices.map((d) => `- ${d.displayName ?? d.serialNumber} | serial ${d.serialNumber} | lifecycle ${d.lifecycleStatus} | power ${(d.state?.lastPower ?? 0).toFixed(1)} W`),
  ].join("\n");
}

export function formatSingleDevice(d: Awaited<ReturnType<typeof backendClient.getDeviceHealth>>): string {
  return [
    `Device: ${d.displayName ?? d.serialNumber}`,
    `Serial: ${d.serialNumber} | ID: ${d.deviceId}`,
    `Lifecycle: ${d.lifecycleStatus} | Claim: ${d.claimStatus}`,
    `Firmware: ${d.lastFirmwareVersion ?? d.state?.lastFirmwareVersion ?? "unknown"}`,
    `Last seen: ${d.state?.lastSeenAt ?? "unknown"}`,
    `Voltage: ${(d.state?.lastVoltage ?? 0).toFixed(1)} V | Current: ${(d.state?.lastCurrent ?? 0).toFixed(3)} A | Power: ${(d.state?.lastPower ?? 0).toFixed(1)} W`,
  ].join("\n");
}

export function formatFirmwarePolicy(p: Awaited<ReturnType<typeof backendClient.getFirmwarePolicy>>): string {
  return [
    `Firmware policy for ${p.serialNumber}:`,
    `Current: ${p.currentVersion ?? "unknown"} | Support: ${p.supportStatus} | Severity: ${p.severity}`,
    `Update available: ${p.updateAvailable ? "yes" : "no"} | Latest compatible: ${p.latestVersion ?? "unknown"}`,
    p.message,
  ].join("\n");
}

export function formatFleetFirmwarePolicy(policies: Awaited<ReturnType<typeof backendClient.getFleetFirmwarePolicy>>): string {
  if (policies.length === 0) return "No firmware policy data found.";
  return [
    "Fleet firmware policy:",
    ...policies.map((p) => `- ${p.serialNumber}: ${p.currentVersion ?? "unknown"} | ${p.supportStatus} | ${p.severity} | latest ${p.latestVersion ?? "unknown"}`),
  ].join("\n");
}

export function getActionLabel(action: "remove" | "reboot" | "factory_reset"): string {
  return action === "factory_reset" ? "factory reset" : action;
}

export function buildDeviceActionConfirmation(
  d: Awaited<ReturnType<typeof backendClient.getDeviceHealth>>,
  action: "remove" | "reboot" | "factory_reset",
) {
  return [
    `Confirm ${getActionLabel(action)}:`,
    `Device: ${d.displayName ?? d.serialNumber} | Serial: ${d.serialNumber} | ID: ${d.deviceId}`,
    action === "remove" ? "This will unclaim the device immediately and keep history." : "This will publish a remote command to the device over MQTT.",
    action === "factory_reset" ? "Factory reset will wipe app config and Wi-Fi settings, then reboot into AP/bootstrap mode." : undefined,
    "Send CONFIRM to continue, or CANCEL to stop.",
  ].filter(Boolean).join("\n");
}
