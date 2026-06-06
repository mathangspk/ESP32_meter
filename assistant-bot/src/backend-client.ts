import { userClient } from "./backend-client.user";
import { deviceClient } from "./backend-client.device";
import { analyticsClient } from "./backend-client.analytics";
import { adminClient } from "./backend-client.admin";
import { otaClient } from "./backend-client.ota";
import { sessionClient } from "./backend-client.session";

export type { BotUser, Membership } from "./backend-client.types.user";
export type { DevicePeakDaySummary, DeviceHourlyBreakdown } from "./backend-client.types.analytics";

export const backendClient = {
  ...userClient,
  ...deviceClient,
  ...analyticsClient,
  ...adminClient,
  ...otaClient,
  ...sessionClient,
};
