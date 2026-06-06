import { z } from "zod";

export const membershipSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  role: z.enum(["platform_admin", "tenant_admin", "site_operator", "viewer"]),
  tenantName: z.string().optional(),
});

export const userSchema = z.object({
  userId: z.string(),
  displayName: z.string().optional(),
  status: z.string(),
  defaultTenantId: z.string().optional(),
});

export type BotUser = z.infer<typeof userSchema>;
export type Membership = z.infer<typeof membershipSchema>;

export const identifyResponseSchema = z.object({
  user: userSchema,
  memberships: z.array(membershipSchema),
  requiresDefaultTenantSelection: z.boolean(),
});

export const userSummarySchema = z.object({
  totals: z.object({
    users: z.number(),
    activeUsers: z.number(),
    invitedUsers: z.number(),
    suspendedUsers: z.number(),
  }),
});

export const notificationSchema = z.object({
  _id: z.string(),
  type: z.string(),
  channel: z.string(),
  targetExternalId: z.string(),
  title: z.string().nullish(),
  text: z.string(),
  payload: z.unknown().optional(),
  status: z.string(),
  attemptCount: z.number(),
});

export const botSessionSchema = z.object({
  chatId: z.string(),
  state: z.unknown(),
});
