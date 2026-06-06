import { Document } from "mongodb";

export type UserStatus = "invited" | "registered" | "active" | "inactive" | "suspended";
export type MembershipRole = "platform_admin" | "tenant_admin" | "site_operator" | "viewer";
export type NotificationChannel = "telegram";

export type NotificationQueueStatus = "pending" | "processing" | "sent" | "failed";
export type NotificationType =
  | "device.offline"
  | "device.recovered"
  | "device.unsupported"
  | "ota.status"
  | "system.notice";

export type TenantRecord = {
  tenantId: string;
  name: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};

export type SiteRecord = {
  siteId: string;
  tenantId: string;
  name: string;
  timezone?: string;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};

export type UserRecord = {
  userId: string;
  username?: string;
  passwordHash?: string;
  systemRole?: "platform_admin" | "user";
  displayName?: string;
  status: UserStatus;
  defaultTenantId?: string;
  activatedAt?: Date;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TenantMembershipRecord = {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  createdAt: Date;
  updatedAt: Date;
};

export type ChannelIdentityRecord = {
  provider: NotificationChannel;
  externalId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type BotSessionRecord = {
  chatId: string;
  state: Document;
  createdAt: Date;
  updatedAt: Date;
};

export type UserSummary = {
  totals: {
    users: number;
    activeUsers: number;
    invitedUsers: number;
    suspendedUsers: number;
  };
};
