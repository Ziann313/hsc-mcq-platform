import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { runDailyChallengeSchedule } from "../dailyChallengeSchedule";
import { runSubscriptionMaintenanceSchedule } from "../subscriptionMaintenance";

/**
 * Builds the shared Express application for both the managed Node server and
 * the Vercel serverless entrypoint. Runtime secrets remain environment-only.
 */
export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/scheduled/daily-challenge", runDailyChallengeSchedule);
  app.post("/api/scheduled/subscription-maintenance", runSubscriptionMaintenanceSchedule);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  return app;
}
