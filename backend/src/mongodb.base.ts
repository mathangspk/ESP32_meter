import { Db, MongoClient } from "mongodb";
import { config } from "./config";
import { AnalyticsRepo } from "./db/analytics.repo";
import { AlertRepo } from "./db/alert.repo";
import { BotRepo } from "./db/bot.repo";
import { DeviceRepo } from "./db/device.repo";
import { OtaRepo } from "./db/ota.repo";
import { TelemetryRepo } from "./db/telemetry.repo";
import { TenantRepo } from "./db/tenant.repo";
import { UserRepo } from "./db/user.repo";

export class MongoBaseService {
  protected client = new MongoClient(config.MONGODB_URI);
  public db!: Db;
  public deviceRepo!: DeviceRepo;
  public telemetryRepo!: TelemetryRepo;
  public otaRepo!: OtaRepo;
  public userRepo!: UserRepo;
  public tenantRepo!: TenantRepo;
  public alertRepo!: AlertRepo;
  public botRepo!: BotRepo;
  public analyticsRepo!: AnalyticsRepo;
}
