import { backendClient } from "./backend-client";
import { Membership } from "./backend-client";

export function previewText(value: string, maxLength = 240) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}

export function formatMemberships(memberships: Membership[]): string {
  return memberships
    .map((membership, index) => `${index + 1}. ${membership.tenantName ?? membership.tenantId} (${membership.tenantId}, ${membership.role})`)
    .join("\n");
}

export function formatFleetSummary(summary: Awaited<ReturnType<typeof backendClient.getFleetSummary>>): string {
  return [
    "Fleet summary:",
    `Devices: ${summary.totals.devices}`,
    `Online devices: ${summary.totals.onlineDevices}`,
    `Claimed devices: ${summary.totals.claimedDevices}`,
    `Unclaimed devices: ${summary.totals.unclaimedDevices}`,
    `Online unclaimed devices: ${summary.totals.onlineUnclaimedDevices}`,
    `Users: ${summary.totals.users}`,
    `Active users: ${summary.totals.activeUsers}`,
    `Tenants: ${summary.totals.tenants}`,
    `Sites: ${summary.totals.sites}`,
  ].join("\n");
}

export function formatUserSummary(summary: Awaited<ReturnType<typeof backendClient.getUserSummary>>): string {
  return [
    "User summary:",
    `Users: ${summary.totals.users}`,
    `Active users: ${summary.totals.activeUsers}`,
    `Invited users: ${summary.totals.invitedUsers}`,
    `Suspended users: ${summary.totals.suspendedUsers}`,
  ].join("\n");
}

export function formatDeviceList(prefix: string, devices: Awaited<ReturnType<typeof backendClient.getDevicesForTenant>>): string {
  if (devices.length === 0) {
    return `${prefix}: none`;
  }

  return [
    `${prefix}:`,
    ...devices.map((device) => {
      const label = device.displayName ?? device.serialNumber;
      const power = device.state?.lastPower ?? 0;
      return `- ${label} | serial ${device.serialNumber} | lifecycle ${device.lifecycleStatus} | power ${power.toFixed(1)} W`;
    }),
  ].join("\n");
}

export function formatSingleDevice(device: Awaited<ReturnType<typeof backendClient.getDeviceHealth>>): string {
  const lastSeen = device.state?.lastSeenAt ?? "unknown";
  const voltage = device.state?.lastVoltage ?? 0;
  const current = device.state?.lastCurrent ?? 0;
  const power = device.state?.lastPower ?? 0;
  return [
    `Device: ${device.displayName ?? device.serialNumber}`,
    `Serial: ${device.serialNumber}`,
    `Device ID: ${device.deviceId}`,
    `Lifecycle: ${device.lifecycleStatus}`,
    `Claim status: ${device.claimStatus}`,
    `Firmware: ${device.lastFirmwareVersion ?? device.state?.lastFirmwareVersion ?? "unknown"}`,
    `Last seen: ${lastSeen}`,
    `Voltage: ${voltage.toFixed(1)} V`,
    `Current: ${current.toFixed(3)} A`,
    `Power: ${power.toFixed(1)} W`,
  ].join("\n");
}

export function formatFirmwarePolicy(policy: Awaited<ReturnType<typeof backendClient.getFirmwarePolicy>>): string {
  return [
    `Firmware policy for ${policy.serialNumber}:`,
    `Current: ${policy.currentVersion ?? "unknown"}`,
    `Support: ${policy.supportStatus}`,
    `Severity: ${policy.severity}`,
    `Update available: ${policy.updateAvailable ? "yes" : "no"}`,
    `Latest compatible: ${policy.latestVersion ?? "unknown"}`,
    policy.message,
  ].join("\n");
}

export function formatFleetFirmwarePolicy(policies: Awaited<ReturnType<typeof backendClient.getFleetFirmwarePolicy>>): string {
  if (policies.length === 0) {
    return "No firmware policy data found.";
  }

  return [
    "Fleet firmware policy:",
    ...policies.map(
      (policy) =>
        `- ${policy.serialNumber}: ${policy.currentVersion ?? "unknown"} | ${policy.supportStatus} | ${policy.severity} | latest ${policy.latestVersion ?? "unknown"}`,
    ),
  ].join("\n");
}

export function getActionLabel(action: "remove" | "reboot" | "factory_reset"): string {
  if (action === "factory_reset") {
    return "factory reset";
  }
  return action;
}

export function buildDeviceActionConfirmation(
  device: Awaited<ReturnType<typeof backendClient.getDeviceHealth>>,
  action: "remove" | "reboot" | "factory_reset",
) {
  return [
    `Confirm ${getActionLabel(action)}:`,
    `Device: ${device.displayName ?? device.serialNumber}`,
    `Serial: ${device.serialNumber}`,
    `Device ID: ${device.deviceId}`,
    action === "remove" ? "This will unclaim the device immediately and keep history." : "This will publish a remote command to the device over MQTT.",
    action === "factory_reset" ? "Factory reset will wipe app config and Wi-Fi settings, then reboot into AP/bootstrap mode." : undefined,
    "Send CONFIRM to continue, or CANCEL to stop.",
  ]
    .filter(Boolean)
    .join("\n");
}
