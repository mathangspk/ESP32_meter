import { MongoTelemetryService } from "./mongodb.telemetry";
import { UserRepo } from "./db/user.repo";
import { DeviceAction } from "./types";

export class MongoDeviceService extends MongoTelemetryService {
  getDevices(limit?: number) { return this.deviceRepo.getDevices(limit); }
  getDeviceHealth(identifier: string) { return this.deviceRepo.getDeviceHealth(identifier); }
  getDeviceSerialNumbers() { return this.deviceRepo.getDeviceSerialNumbers(); }
  getDevicesForTenant(tenantId: string, limit?: number) { return this.deviceRepo.getDevicesForTenant(tenantId, limit); }
  getUnclaimedDevices(options?: { onlineOnly?: boolean; limit?: number }) { return this.deviceRepo.getUnclaimedDevices(options); }
  claimDevice(input: Parameters<typeof this.deviceRepo.claimDevice>[0]) { return this.deviceRepo.claimDevice(input); }
  unclaimDevice(input: Parameters<typeof this.deviceRepo.unclaimDevice>[0]) { return this.deviceRepo.unclaimDevice(input); }
  updateDeviceDisplayName(identifier: string, displayName: string, actorUserId: string) {
    return this.deviceRepo.updateDeviceDisplayName(identifier, displayName, actorUserId);
  }
  createDeviceCommand(input: { commandId: string; action: DeviceAction; identifier: string; commandTopic: string; actorUserId: string; reason?: string }) {
    return this.deviceRepo.createDeviceCommand(input);
  }
  markDeviceCommandPublished(commandId: string) { return this.deviceRepo.markDeviceCommandPublished(commandId); }
  markDeviceCommandFailed(commandId: string, errorMessage: string) { return this.deviceRepo.markDeviceCommandFailed(commandId, errorMessage); }
  getDeviceCommands(limit?: number) { return this.deviceRepo.getDeviceCommands(limit); }

  getUserById(userId: string) { return this.userRepo.getUserById(userId); }
  getUserByUsername(username: string) { return this.userRepo.getUserByUsername(username); }
  identifyTelegramUser(input: Parameters<UserRepo["identifyTelegramUser"]>[0]) { return this.userRepo.identifyTelegramUser(input); }
  getMembershipsForUser(userId: string) { return this.userRepo.getMembershipsForUser(userId); }
  setUserDefaultTenant(userId: string, tenantId: string) { return this.userRepo.setUserDefaultTenant(userId, tenantId); }
  getTenantListForUser(userId: string) { return this.userRepo.getTenantListForUser(userId); }
  getUserSummary() { return this.userRepo.getUserSummary(); }
  createWebUser(input: Parameters<UserRepo["createWebUser"]>[0]) { return this.userRepo.createWebUser(input); }
  updateWebUser(userId: string, patch: Parameters<UserRepo["updateWebUser"]>[1]) { return this.userRepo.updateWebUser(userId, patch); }
  listWebUsers(limit?: number) { return this.userRepo.listWebUsers(limit); }
  deleteWebUser(userId: string) { return this.userRepo.deleteWebUser(userId); }
  hasPlatformAdmin() { return this.userRepo.hasPlatformAdmin(); }
  setAdminCredentials(userId: string, username: string, passwordHash: string) { return this.userRepo.setAdminCredentials(userId, username, passwordHash); }

  getTenants(limit?: number) { return this.tenantRepo.getTenants(limit); }
  getSites(limit?: number) { return this.tenantRepo.getSites(limit); }
  getSitesForTenant(tenantId: string) { return this.tenantRepo.getSitesForTenant(tenantId); }
}
