import { Collection, Db } from "mongodb";
import { SiteRecord, TenantRecord } from "./types";

export class TenantRepo {
  private tenants: Collection<TenantRecord>;
  private sites: Collection<SiteRecord>;

  constructor(db: Db) {
    this.tenants = db.collection<TenantRecord>("tenants");
    this.sites = db.collection<SiteRecord>("sites");
  }

  async getTenants(limit = 100): Promise<TenantRecord[]> {
    return this.tenants.find({}, { sort: { name: 1 }, limit }).toArray();
  }

  async getSites(limit = 100): Promise<SiteRecord[]> {
    return this.sites.find({}, { sort: { tenantId: 1, name: 1 }, limit }).toArray();
  }

  async getSitesForTenant(tenantId: string): Promise<SiteRecord[]> {
    return this.sites.find({ tenantId, status: "active" }, { sort: { name: 1 } }).toArray();
  }

  async bootstrapTenantAndSite(
    tenantId: string,
    tenantName: string,
    siteId: string,
    siteName: string,
    siteTimezone: string,
    now: Date,
  ): Promise<void> {
    await this.tenants.updateOne(
      { tenantId },
      {
        $set: { name: tenantName, status: "active", updatedAt: now },
        $setOnInsert: { tenantId, createdAt: now },
      },
      { upsert: true },
    );

    await this.sites.updateOne(
      { siteId },
      {
        $set: { tenantId, name: siteName, timezone: siteTimezone, status: "active", updatedAt: now },
        $setOnInsert: { siteId, createdAt: now },
      },
      { upsert: true },
    );
  }
}
