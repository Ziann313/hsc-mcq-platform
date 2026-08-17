export function shouldFinalizeExpiredAttempt(status: string, expiresAt: Date, now = Date.now()) {
  return status === "in_progress" && expiresAt.getTime() <= now;
}
