import { z } from "zod";
import { request } from "./backend-client.request";
import { identifyResponseSchema, userSchema, membershipSchema } from "./backend-client.types.user";
import { tenantSchema } from "./backend-client.types.device";

export const userClient = {
  identifyTelegramUser: (input: { externalId: string; displayName?: string; username?: string }) =>
    request(
      "/internal/telegram/identify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      identifyResponseSchema,
    ),

  setDefaultTenant: (userId: string, tenantId: string) =>
    request(
      `/internal/users/${encodeURIComponent(userId)}/default-tenant`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      },
      userSchema.nullable(),
    ),

  getUserMemberships: (userId: string) =>
    request(
      `/internal/users/${encodeURIComponent(userId)}/memberships`,
      { method: "GET" },
      z.object({ user: userSchema, memberships: z.array(membershipSchema) }),
    ),

  getUserTenants: (userId: string) =>
    request(`/internal/users/${encodeURIComponent(userId)}/tenants`, { method: "GET" }, z.array(tenantSchema)),
};
