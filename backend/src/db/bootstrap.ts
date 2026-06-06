import { config } from "../config";
import { DEFAULT_SITE_TIMEZONE } from "./analytics";
import { TenantRepo } from "./tenant.repo";
import { UserRepo } from "./user.repo";
import { OtaRepo } from "./ota.repo";

export async function bootstrapPlatformAdmin(tenantRepo: TenantRepo, userRepo: UserRepo): Promise<void> {
  const now = new Date();
  await tenantRepo.bootstrapTenantAndSite(
    config.BOOTSTRAP_TENANT_ID,
    config.BOOTSTRAP_TENANT_NAME,
    config.BOOTSTRAP_SITE_ID,
    config.BOOTSTRAP_SITE_NAME,
    DEFAULT_SITE_TIMEZONE,
    now,
  );
  await userRepo.bootstrapUser(
    config.PLATFORM_ADMIN_USER_ID,
    config.PLATFORM_ADMIN_DISPLAY_NAME,
    config.BOOTSTRAP_TENANT_ID,
    config.BOOTSTRAP_TENANT_ID,
    config.PLATFORM_ADMIN_TELEGRAM_ID,
    now,
  );
}

export async function bootstrapFirmwareRelease(otaRepo: OtaRepo): Promise<void> {
  await otaRepo.bootstrapFirmwareRelease(
    config.BOOTSTRAP_FIRMWARE_VERSION,
    config.BOOTSTRAP_FIRMWARE_BOARD_TYPE,
    new Date(),
  );
}
