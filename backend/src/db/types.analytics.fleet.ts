export type FleetSummary = {
  totals: {
    devices: number;
    claimedDevices: number;
    unclaimedDevices: number;
    activeDevices: number;
    onlineDevices: number;
    onlineUnclaimedDevices: number;
    users: number;
    activeUsers: number;
    tenants: number;
    sites: number;
  };
  lifecycleCounts: Array<{ lifecycleStatus: string; count: number }>;
};

export type DeviceHourlyBreakdown = {
  serialNumber: string;
  deviceId: string;
  displayName?: string;
  tenantId?: string;
  siteId?: string;
  siteTimezone: string;
  date: string;
  dayStart: Date;
  dayEnd: Date;
  hours: Array<{
    hourStart: Date;
    localHour: number;
    energyKwh?: number;
    avgPower: number;
    maxPower: number;
    sampleCount: number;
    counterReset: boolean;
  }>;
  totalEnergyKwh?: number;
  dataStatus: "ok" | "no_data" | "partial_data";
  messages: string[];
};
