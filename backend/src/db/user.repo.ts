import { Collection, Db } from "mongodb";
import {
  ChannelIdentityRecord,
  TenantMembershipRecord,
  TenantRecord,
  UserRecord,
  UserSummary,
} from "./types";

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
    return this.users.findOne({ userId });
  }

  async getUserByUsername(username: string): Promise<UserRecord | null> {
    return this.users.findOne({ username });
  }

  async identifyTelegramUser(input: {
    externalId: string;
    displayName?: string;
    username?: string;
  }): Promise<{
    user: UserRecord;
    memberships: Array<TenantMembershipRecord & { tenantName?: string }>;
    requiresDefaultTenantSelection: boolean;
  }> {
    const now = new Date();
    const existingIdentity = await this.channelIdentities.findOne({
      provider: "telegram",
      externalId: input.externalId,
    });

    let userId = existingIdentity?.userId;
    if (!userId) {
      userId = `telegram:${input.externalId}`;
      await this.channelIdentities.insertOne({
        provider: "telegram",
        externalId: input.externalId,
        userId,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await this.channelIdentities.updateOne(
        { provider: "telegram", externalId: input.externalId },
        { $set: { updatedAt: now } },
      );
    }

    await this.users.updateOne(
      { userId },
      {
        $set: {
          status: "active",
          displayName: input.displayName ?? input.username ?? userId,
          lastActiveAt: now,
          updatedAt: now,
        },
        $setOnInsert: { userId, activatedAt: now, createdAt: now },
      },
      { upsert: true },
    );

    const user = await this.users.findOne({ userId });
    if (!user) throw new Error("Failed to resolve user after Telegram identification");

    const memberships = await this.getMembershipsForUser(userId);

    if (!user.defaultTenantId && memberships.length === 1) {
      await this.setUserDefaultTenant(userId, memberships[0].tenantId);
      user.defaultTenantId = memberships[0].tenantId;
    }

    return {
      user,
      memberships,
      requiresDefaultTenantSelection: memberships.length > 1 && !user.defaultTenantId,
    };
  }

  async getMembershipsForUser(userId: string): Promise<Array<TenantMembershipRecord & { tenantName?: string }>> {
    const memberships = await this.tenantMemberships.find({ userId }, { sort: { tenantId: 1 } }).toArray();
    if (memberships.length === 0) return [];

    const tenants = await this.tenants
      .find({ tenantId: { $in: memberships.map((m) => m.tenantId) } })
      .toArray();
    const tenantNameMap = new Map(tenants.map((t) => [t.tenantId, t.name]));

    return memberships.map((m) => ({ ...m, tenantName: tenantNameMap.get(m.tenantId) }));
  }

  async setUserDefaultTenant(userId: string, tenantId: string): Promise<UserRecord | null> {
    const membership = await this.tenantMemberships.findOne({ userId, tenantId });
    if (!membership) throw new Error("User is not a member of the selected tenant");

    await this.users.updateOne(
      { userId },
      { $set: { defaultTenantId: tenantId, updatedAt: new Date() } },
    );

    return this.users.findOne({ userId });
  }

  async getTenantListForUser(userId: string): Promise<TenantRecord[]> {
    const memberships = await this.tenantMemberships.find({ userId }).toArray();
    if (memberships.length === 0) return [];
    return this.tenants
      .find({ tenantId: { $in: memberships.map((m) => m.tenantId) } }, { sort: { name: 1 } })
      .toArray();
  }

  async getUserSummary(): Promise<UserSummary> {
    const [users, activeUsers, invitedUsers, suspendedUsers] = await Promise.all([
      this.users.countDocuments({}),
      this.users.countDocuments({ status: "active" }),
      this.users.countDocuments({ status: "invited" }),
      this.users.countDocuments({ status: "suspended" }),
    ]);
    return { totals: { users, activeUsers, invitedUsers, suspendedUsers } };
  }

  async createWebUser(input: {
    userId: string;
    username: string;
    passwordHash: string;
    displayName: string;
    systemRole: "platform_admin" | "user";
    defaultTenantId?: string;
  }): Promise<UserRecord> {
    const now = new Date();
    const record: UserRecord = {
      userId: input.userId,
      username: input.username,
      passwordHash: input.passwordHash,
      systemRole: input.systemRole,
      displayName: input.displayName,
      ...(input.defaultTenantId ? { defaultTenantId: input.defaultTenantId } : {}),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
    await this.users.insertOne(record);
    return record;
  }

  async updateWebUser(
    userId: string,
    patch: Partial<Pick<UserRecord, "displayName" | "systemRole" | "passwordHash" | "status">>,
  ): Promise<void> {
    await this.users.updateOne({ userId }, { $set: { ...patch, updatedAt: new Date() } });
  }

  async listWebUsers(limit = 100): Promise<UserRecord[]> {
    return this.users.find({ username: { $exists: true } }, { sort: { createdAt: -1 }, limit }).toArray();
  }

  async deleteWebUser(userId: string): Promise<void> {
    await this.users.deleteOne({ userId });
  }

  async hasPlatformAdmin(): Promise<boolean> {
    return (await this.users.countDocuments({ systemRole: "platform_admin" })) > 0;
  }

  async setAdminCredentials(userId: string, username: string, passwordHash: string): Promise<void> {
    await this.users.updateOne(
      { userId },
      { $set: { username, passwordHash, systemRole: "platform_admin" as const, updatedAt: new Date() } },
    );
  }

  async bootstrapUser(
    userId: string,
    displayName: string,
    defaultTenantId: string,
    tenantId: string,
    telegramId: string | undefined,
    now: Date,
  ): Promise<void> {
    await this.users.updateOne(
      { userId },
      {
        $set: { displayName, status: "active", defaultTenantId: defaultTenantId, activatedAt: now, updatedAt: now },
        $setOnInsert: { userId, createdAt: now },
      },
      { upsert: true },
    );

    await this.tenantMemberships.updateOne(
      { userId, tenantId },
      { $set: { role: "platform_admin", updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );

    if (telegramId) {
      await this.channelIdentities.updateOne(
        { provider: "telegram", externalId: telegramId },
        { $set: { userId, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true },
      );
    }
  }
}
