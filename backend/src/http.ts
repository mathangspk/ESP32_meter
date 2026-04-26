import express from "express";
import { HealthSnapshot } from "./types";

export function createHttpApp(getHealthSnapshot: () => HealthSnapshot) {
  const app = express();

  app.get("/healthz", (_req, res) => {
    const health = getHealthSnapshot();
    const statusCode = health.status === "ok" ? 200 : 503;
    res.status(statusCode).json(health);
  });

  return app;
}
