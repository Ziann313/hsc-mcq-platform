import type { Request, Response } from "express";
import { runScheduledDailyChallenge } from "./liveExamDb";
import { sdk } from "./_core/sdk";

export async function runDailyChallengeSchedule(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await runScheduledDailyChallenge(user.taskUid);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduled daily-challenge error";
    console.error("[DailyChallengeSchedule]", error);
    return res.status(500).json({ error: message, timestamp: new Date().toISOString(), context: { path: req.path } });
  }
}
