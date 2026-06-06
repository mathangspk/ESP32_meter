import { z } from "zod";

export const firmwareReleaseSchema = z
  .object({
    releaseId: z.string(),
    version: z.string(),
    severity: z.enum(["optional", "recommended", "required"]),
    supportStatus: z.enum(["supported", "deprecated", "unsupported"]),
    url: z.string().optional(),
    notes: z.string().optional(),
    releasedAt: z.string(),
  })
  .passthrough();

export const firmwarePolicySchema = z
  .object({
    serialNumber: z.string(),
    deviceId: z.string(),
    currentVersion: z.string().optional(),
    supportStatus: z.enum(["supported", "deprecated", "unsupported"]),
    severity: z.enum(["optional", "recommended", "required"]),
    updateAvailable: z.boolean(),
    latestVersion: z.string().optional(),
    release: firmwareReleaseSchema.optional(),
    recommendedRelease: firmwareReleaseSchema.optional(),
    message: z.string(),
  })
  .passthrough();

export const deviceActionResultSchema = z.unknown();

export const otaJobSchema = z
  .object({
    jobId: z.string(),
    deviceId: z.string(),
    serialNumber: z.string(),
    targetVersion: z.string(),
    status: z.string(),
  })
  .passthrough();
