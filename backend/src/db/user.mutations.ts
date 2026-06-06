import { Collection } from "mongodb";
import { UserRecord, TenantMembershipRecord, ChannelIdentityRecord, TenantRecord } from "./types";
import { getMembershipsForUser } from "./user.queries";

interface UserMutationsCtx {
  users: Collection<UserRecord>;
  tenantMemberships: Collection<TenantMembershipRecord>;
  channelIdentities: Collection<ChannelIdentityRecord>;
  tenants?: Collection<TenantRecord>;
}

export async function identifyTelegramUser(
  ctx: Required<UserMutationsCtx>,
  input: { externalId: string; displayName?: string; username?: string },
): Promise<{ user: UserRecord; memberships: Array<TenantMembershipRecord & { tenantName?: string }>; requiresDefaultTenantSelection: boolean }> {
  const now = new Date();
  const existingIdentity = await ctx.channelIdentities.findOne({ provider: "telegram", externalId: input.externalId });
  let userId = existingIdentity?.userId;
  if (!userId) {
    userId = `telegram:${input.externalId}`;
    await ctx.channelIdentities.insertOne({ provider: "telegram", externalId: input.externalId, userId, createdAt: now, updatedAt: now });
  } else {
    await ctx.channelIdentities.updateOne({ provider: "telegram", externalId: input.externalId }, { $set: { updatedAt: now } });
  }

  await ctx.users.updateOne({ userId }, {
    $set: { status: "active", displayName: input.displayName ?? input.username ?? userId, lastActiveAt: now, updatedAt: now },
    $setOnInsert: { userId, activatedAt: now, createdAt: now },
  }, { upsert: true });

  const user = await ctx.users.findOne({ userId });
  if (!user) throw new Error("Failed to resolve user");

  const memberships = await getMembershipsForUser(ctx.tenantMemberships, ctx.tenants, userId);
  if (!user.defaultTenantId && memberships.length === 1) {
    await setUserDefaultTenant(ctx.users, ctx.tenantMemberships, userId, memberships[0].tenantId);
    user.defaultTenantId = memberships[0].tenantId;
  }

  return { user, memberships, requiresDefaultTenantSelection: memberships.length > 1 && !user.defaultTenantId };
}

export async function setUserDefaultTenant(
  users: Collection<UserRecord>,
  tenantMemberships: Collection<TenantMembershipRecord>,
  userId: string,
  tenantId: string,
): Promise<UserRecord | null> {
  const membership = await tenantMemberships.findOne({ userId, tenantId });
  if (!membership) throw new Error("User is not a member of the selected tenant");
  await users.updateOne({ userId }, { $set: { defaultTenantId: tenantId, updatedAt: new Date() } });
  return users.findOne({ userId });
}

export async function createWebUser(
  users: Collection<UserRecord>,
  input: { userId: string; username: string; passwordHash: string; displayName: string; systemRole: "platform_admin" | "user"; defaultTenantId?: string },
): Promise<UserRecord> {
  const now = new Date();
  const record: UserRecord = {
    userId: input.userId, username: input.username, passwordHash: input.passwordHash, systemRole: input.systemRole, displayName: input.displayName,
    ...(input.defaultTenantId ? { defaultTenantId: input.defaultTenantId } : {}), status: "active", createdAt: now, updatedAt: now,
  };
  await users.insertOne(record);
  return record;
}

export async function updateWebUser(users: Collection<UserRecord>, userId: string, patch: Partial<Pick<UserRecord, "displayName" | "systemRole" | "passwordHash" | "status">>): Promise<void> {
  await users.updateOne({ userId }, { $set: { ...patch, updatedAt: new Date() } });
}

export async function deleteWebUser(users: Collection<UserRecord>, userId: string): Promise<void> {
  await users.deleteOne({ userId });
}

export async function setAdminCredentials(users: Collection<UserRecord>, userId: string, username: string, passwordHash: string): Promise<void> {
  await users.updateOne({ userId }, { $set: { username, passwordHash, systemRole: "platform_admin" as const, updatedAt: new Date() } });
}

export async function bootstrapUser(ctx: UserMutationsCtx, userId: string, displayName: string, defaultTenantId: string, tenantId: string, telegramId: string | undefined, now: Date): Promise<void> {
  await ctx.users.updateOne({ userId }, { $set: { displayName, status: "active", defaultTenantId, activatedAt: now, updatedAt: now }, $setOnInsert: { userId, createdAt: now } }, { upsert: true });
  await ctx.tenantMemberships.updateOne({ userId, tenantId }, { $set: { role: "platform_admin", updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
  if (telegramId) {
    await ctx.channelIdentities.updateOne({ provider: "telegram", externalId: telegramId }, { $set: { userId, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
  }
}
