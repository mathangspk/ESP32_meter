import { Db } from "mongodb";
import { config } from "../config";
import { DeviceRepo } from "./device.repo";
import { FleetSummary } from "./types";

export async function getFleetSummary(db: Db, deviceRepo: DeviceRepo): Promise<FleetSummary> {
  const onlineCutoff = new Date(Date.now() - config.OFFLINE_TIMEOUT_SECONDS * 1000);
  const devices = db.collection("devices");
  const deviceStates = db.collection("device_states");
  const users = db.collection("users");
  const tenants = db.collection("tenants");
  const sites = db.collection("sites");

  const [
    totalDevices,
    claimedDevices,
    unclaimedDevices,
    activeDevices,
    onlineDevices,
    totalUsers,
    activeUsers,
    totalTenants,
    totalSites,
    onlineUnclaimedDevices,
    lifecycleCounts,
  ] = await Promise.all([
    devices.countDocuments({}),
    devices.countDocuments({ claimStatus: "claimed" }),
    devices.countDocuments({ claimStatus: "unclaimed" }),
    devices.countDocuments({ lifecycleStatus: "active" }),
    deviceStates.countDocuments({ lastSeenAt: { $gte: onlineCutoff } }),
    users.countDocuments({}),
    users.countDocuments({ status: "active" }),
    tenants.countDocuments({}),
    sites.countDocuments({}),
    deviceRepo.getOnlineUnclaimedDevicesCount(onlineCutoff),
    devices.aggregate<{ lifecycleStatus: string; count: number }>([
      { $group: { _id: "$lifecycleStatus", count: { $sum: 1 } } },
      { $project: { _id: 0, lifecycleStatus: "$_id", count: 1 } },
      { $sort: { lifecycleStatus: 1 } },
    ]).toArray(),
  ]);

  return {
    totals: {
      devices: totalDevices,
      claimedDevices,
      unclaimedDevices,
      activeDevices,
      onlineDevices,
      onlineUnclaimedDevices,
      users: totalUsers,
      activeUsers,
      tenants: totalTenants,
      sites: totalSites,
    },
    lifecycleCounts,
  };
}
