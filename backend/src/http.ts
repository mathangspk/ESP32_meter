import express from "express";
import { HealthSnapshot } from "./types";
import { authRouter } from "./routes/auth";
import { dashboardRouter } from "./routes/dashboard";
import { devicesRouter } from "./routes/devices";
import { otaRouter } from "./routes/ota";
import { adminRouter } from "./routes/admin";
import { internalRouter } from "./routes/internal";

export function createHttpApp(getHealthSnapshot: () => HealthSnapshot) {
  const app = express();
  app.use(express.json());

  app.get("/healthz", (_req, res) => {
    const health = getHealthSnapshot();
    res.status(health.status === "ok" ? 200 : 503).json(health);
  });

  app.use("/auth", authRouter);
  app.use("/dashboard", dashboardRouter);
  app.use("/devices", devicesRouter);
  app.use("/ota", otaRouter);
  app.use("/admin", adminRouter);
  app.use("/internal", internalRouter);

  return app;
}
