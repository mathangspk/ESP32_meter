import { ZodError } from "zod";
import { devicesRouter, checkDeviceAccess } from "./devices";
import { performDeviceAction } from "../device-actions";
import { createOtaJobFromRelease } from "../ota";
import { deviceActionRequestSchema, otaReleaseRequestSchema } from "../types";

devicesRouter.post("/:deviceId/actions", checkDeviceAccess, async (req, res) => {
  try {
    const input = deviceActionRequestSchema.parse(req.body);
    const actorUserId = input.actorUserId || (req as any).user?.userId || "system";
    const result = await performDeviceAction(req.params.deviceId as string, { ...input, actorUserId });
    res.status(input.action === "remove" ? 200 : 202).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid device action", details: error.flatten() });
      return;
    }
    const message = error instanceof Error ? error.message : "Failed to perform device action";
    res.status(message === "Device not found" ? 404 : 400).json({ error: message });
  }
});

devicesRouter.post("/:deviceId/ota", checkDeviceAccess, async (req, res) => {
  try {
    const input = otaReleaseRequestSchema.parse(req.body);
    const job = await createOtaJobFromRelease(req.params.deviceId as string, input.version);
    res.status(202).json(job);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid OTA release request", details: error.flatten() });
      return;
    }
    const message = error instanceof Error ? error.message : "Failed to create OTA job from release";
    res.status(message === "Device not found" ? 404 : 400).json({ error: message });
  }
});
