import { Collection, Db } from "mongodb";
import { DEFAULT_SITE_TIMEZONE, EnergyRangeOptions } from "./analytics";
import { DeviceRepo } from "./device.repo";
import {
  DeviceAnalyticsSummary,
  DeviceEnergyAnalyticsSummary,
  DevicePeakDaySummary,
  DeviceHourlyBreakdown,
  DeviceStateRecord,
  SiteRecord,
  TelemetryHourlyRecord,
  TelemetryRecord,
} from "./types";
import * as summary from "./analytics.summary";
import * as energy from "./analytics.energy";
import * as peak from "./analytics.peak";
import * as hourly from "./analytics.hourly";

export class AnalyticsRepo {
  private telemetry: Collection<TelemetryRecord>;
  private deviceStates: Collection<DeviceStateRecord>;
  private sites: Collection<SiteRecord>;
  private telemetryHourly: Collection<TelemetryHourlyRecord>;
  private deviceRepo: DeviceRepo;

  constructor(db: Db, deviceRepo: DeviceRepo) {
    this.telemetry = db.collection<TelemetryRecord>("telemetry");
    this.deviceStates = db.collection<DeviceStateRecord>("device_states");
    this.sites = db.collection<SiteRecord>("sites");
    this.telemetryHourly = db.collection<TelemetryHourlyRecord>("telemetry_hourly");
    this.deviceRepo = deviceRepo;
  }

  async getDeviceAnalyticsSummary(identifier: string): Promise<DeviceAnalyticsSummary | null> {
    const device = await this.deviceRepo.getDeviceHealth(identifier);
    if (!device) return null;
    return summary.getDeviceAnalyticsSummary({ telemetry: this.telemetry, sites: this.sites }, device);
  }

  async getDeviceEnergyAnalytics(
    identifier: string,
    options: EnergyRangeOptions,
  ): Promise<DeviceEnergyAnalyticsSummary | null> {
    const device = await this.deviceRepo.getDeviceHealth(identifier);
    if (!device) return null;
    const site = device.siteId ? await this.sites.findOne({ siteId: device.siteId }) : null;
    const siteTimezone = site?.timezone || DEFAULT_SITE_TIMEZONE;
    const computed = await energy.getDeviceEnergyAnalytics({ telemetry: this.telemetry, telemetryHourly: this.telemetryHourly }, device, siteTimezone, options);
    if (!computed) return null;
    if (!site?.timezone) {
      computed.messages.push(`Site timezone is missing, so analytics used the fallback timezone ${DEFAULT_SITE_TIMEZONE}.`);
    }
    return computed;
  }

  async getPeakDayLast7Days(identifier: string): Promise<DevicePeakDaySummary | null> {
    return this.getPeakDayAnalytics(identifier);
  }

  async getPeakDayAnalytics(
    identifier: string,
    options?: EnergyRangeOptions,
  ): Promise<DevicePeakDaySummary | null> {
    const device = await this.deviceRepo.getDeviceHealth(identifier);
    if (!device) return null;
    const site = device.siteId ? await this.sites.findOne({ siteId: device.siteId }) : null;
    const siteTimezone = site?.timezone || DEFAULT_SITE_TIMEZONE;
    const computed = await peak.getPeakDayAnalytics({ telemetry: this.telemetry, telemetryHourly: this.telemetryHourly }, device, siteTimezone, options);
    if (computed && !site?.timezone) {
      computed.messages.push(`Site timezone is missing, so analytics used the fallback timezone ${DEFAULT_SITE_TIMEZONE}.`);
    }
    return computed;
  }

  async getHourlyBreakdown(identifier: string, date: string): Promise<DeviceHourlyBreakdown | null> {
    const device = await this.deviceRepo.getDeviceHealth(identifier);
    if (!device) return null;
    const site = device.siteId ? await this.sites.findOne({ siteId: device.siteId }) : null;
    const siteTimezone = site?.timezone || DEFAULT_SITE_TIMEZONE;
    const computed = await hourly.getHourlyBreakdown(this.telemetryHourly, device, siteTimezone, date);
    if (computed && !site?.timezone) {
      computed.messages.push(`Site timezone is missing, so analytics used the fallback timezone ${DEFAULT_SITE_TIMEZONE}.`);
    }
    return computed;
  }
}
