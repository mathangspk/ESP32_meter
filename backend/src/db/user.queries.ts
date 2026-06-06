import { Collection } from "mongodb";
import { UserRecord, TenantMembershipRecord, TenantRecord, UserSummary } from "./types";

export async function getUserById(users: Collection<UserRecord>, userId: string): Promise<UserRecord | null> {
  return users.findOne({ userId });
}

export async function getUserByUsername(users: Collection<UserRecord>, username: string): Promise<UserRecord | null> {
  return users.findOne({ username });
}

export async function getMembershipsForUser(
  tenantMemberships: Collection<TenantMembershipRecord>,
  tenants: Collection<TenantRecord>,
  userId: string,
): Promise<Array<TenantMembershipRecord & { tenantName?: string }>> {
  const memberships = await tenantMemberships.find({ userId }, { sort: { tenantId: 1 } }).toArray();
  if (memberships.length === 0) return [];
  const tenantIds = memberships.map((m) => m.tenantId);
  const tenantList = await tenants.find({ tenantId: { $in: tenantIds } }).toArray();
  const nameMap = new Map(tenantList.map((t) => [t.tenantId, t.name]));
  return memberships.map((m) => ({ ...m, tenantName: nameMap.get(m.tenantId) }));
}

export async function getTenantListForUser(
  tenantMemberships: Collection<TenantMembershipRecord>,
  tenants: Collection<TenantRecord>,
  userId: string,
): Promise<TenantRecord[]> {
  const memberships = await tenantMemberships.find({ userId }).toArray();
  if (memberships.length === 0) return [];
  return tenants
    .find({ tenantId: { $in: memberships.map((m) => m.tenantId) } }, { sort: { name: 1 } })
    .toArray();
}

export async function getUserSummary(users: Collection<UserRecord>): Promise<UserSummary> {
  const [total, active, invited, suspended] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ status: "active" }),
    users.countDocuments({ status: "invited" }),
    users.countDocuments({ status: "suspended" }),
  ]);
  return { totals: { users: total, activeUsers: active, invitedUsers: invited, suspendedUsers: suspended } };
}

export async function listWebUsers(users: Collection<UserRecord>, limit = 100): Promise<UserRecord[]> {
  return users.find({ username: { $exists: true } }, { sort: { createdAt: -1 }, limit }).toArray();
}

export async function hasPlatformAdmin(users: Collection<UserRecord>): Promise<boolean> {
  return (await users.countDocuments({ systemRole: "platform_admin" })) > 0;
}
