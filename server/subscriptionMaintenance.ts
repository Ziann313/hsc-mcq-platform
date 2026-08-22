import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { isSubscriptionMaintenanceTask, runSubscriptionMaintenance } from "./subscriptionDb";

export async function runSubscriptionMaintenanceSchedule(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    if (!await isSubscriptionMaintenanceTask(user.taskUid)) return res.json({ ok: true, skipped: "orphan" });
    return res.json({ ok: true, ...(await runSubscriptionMaintenance()) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown subscription-maintenance error";
    console.error("[SubscriptionMaintenance]", error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { path: req.path } });
  }
}
