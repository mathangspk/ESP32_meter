import { Collection, Db } from "mongodb";
import {
  ChannelIdentityRecord,
  TenantMembershipRecord,
  TenantRecord,
  UserRecord,
  UserSummary,
} from "./types";
import * as queries from "./user.queries";
import * as mutations from "./user.mutations";

export class UserRepo {
  private users: Collection<UserRecord>;
  private tenantMemberships: Collection<TenantMembershipRecord>;
  private channelIdentities: Collection<ChannelIdentityRecord>;
  private tenants: Collection<TenantRecord>;

  constructor(db: Db) {
    this.users = db.collection<UserRecord>("users");
    this.tenantMemberships = db.collection<TenantMembershipRecord>("tenant_memberships");
    this.channelIdentities = db.collection<ChannelIdentityRecord>("channel_identities");
    this.tenants = db.collection<TenantRecord>("tenants");
  }

  async getUserById(userId: string): Promise<UserRecord | null> {
    return queries.getUserById(this.users, userId);
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    return queries.getUserByUsername(this.users, username);
  }

  async identifyTelegramUser(input: { externalId: string; displayName?: string; username?: string }): Promise<{ user: UserRecord; memberships: Array<TenantMembershipRecord & { tenantName?: string }>; requiresDefaultTenantSelection: boolean }> {
    return mutations.identifyTelegramUser({ users: this.users, tenantMemberships: this.tenantMemberships, channelIdentities: this.channelIdentities, tenants: this.tenants }, input);
  }

  async getMembershipsForUser(userId: string): Promise<Array<TenantMembershipRecord & { tenantName?: string }>> {
    return queries.getMembershipsForUser(this.tenantMemberships, this.tenants, userId);
  }

  async setUserDefaultTenant(userId: string, tenantId: string): Promise<UserRecord | null> {
    return mutations.setUserDefaultTenant(this.users, this.tenantMemberships, userId, tenantId);
  }

  async getTenantListForUser(userId: string): Promise<TenantRecord[]> {
    return queries.getTenantListForUser(this.tenantMemberships, this.tenants, userId);
  }

  async getUserSummary(): Promise<UserSummary> {
    return queries.getUserSummary(this.users);
  }

  async createWebUser(input: { userId: string; username: string; passwordHash: string; displayName: string; systemRole: "platform_admin" | "user"; defaultTenantId?: string }): Promise<UserRecord> {
    return mutations.createWebUser(this.users, input);
  }

  async updateWebUser(userId: string, patch: Partial<Pick<UserRecord, "displayName" | "systemRole" | "passwordHash" | "status">>): Promise<void> {
    return mutations.updateWebUser(this.users, userId, patch);
  }

  async listWebUsers(limit = 100): Promise<UserRecord[]> {
    return queries.listWebUsers(this.users, limit);
  }

  async deleteWebUser(userId: string): Promise<void> {
    return mutations.deleteWebUser(this.users, userId);
  }

  async hasPlatformAdmin(): Promise<boolean> {
    return queries.hasPlatformAdmin(this.users);
  }

  async setAdminCredentials(userId: string, username: string, passwordHash: string): Promise<void> {
    return mutations.setAdminCredentials(this.users, userId, username, passwordHash);
  }

  async bootstrapUser(userId: string, displayName: string, defaultTenantId: string, tenantId: string, telegramId: string | undefined, now: Date): Promise<void> {
    return mutations.bootstrapUser({ users: this.users, tenantMemberships: this.tenantMemberships, channelIdentities: this.channelIdentities }, userId, displayName, defaultTenantId, tenantId, telegramId, now);
  }
}
