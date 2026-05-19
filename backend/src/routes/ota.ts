import { Router } from "express";
import { ZodError } from "zod";
import { logger } from "../logger";
import { mongoService } from "../mongodb";
import { createOtaJob } from "../ota";
import { otaCommandRequestSchema } from "../types";
import { parseLimit } from "./utils";

export const otaRouter = Router();

otaRouter.get("/jobs", async (req, res) => {
  const jobs = await mongoService.getOtaJobs(parseLimit(req.query.limit, 20));
  res.json(jobs);
});

otaRouter.get("/jobs/:jobId", async (req, res) => {
  const job = await mongoService.getOtaJob(req.params.jobId);
  if (!job) { res.status(404).json({ error: "OTA job not found" }); return; }
  res.json(job);
});

otaRouter.post("/jobs", async (req, res) => {
  try {
    const input = otaCommandRequestSchema.parse(req.body);
    const job = await createOtaJob(input);
    res.status(202).json(job);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid OTA request", details: error.flatten() });
      return;
    }
    logger.error({ err: error }, "Failed to create OTA job");
    res.status(500).json({ error: "Failed to create OTA job" });
  }
});
