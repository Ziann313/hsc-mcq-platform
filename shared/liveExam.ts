export type LiveRoomState = "draft" | "scheduled" | "live" | "closed" | "archived";

export function resolveLiveRoomState(input: { configuredState: LiveRoomState; startsAt: Date; endsAt: Date; now?: Date }): LiveRoomState {
  if (input.configuredState === "draft" || input.configuredState === "closed" || input.configuredState === "archived") return input.configuredState;
  const now = input.now ?? new Date();
  if (now >= input.endsAt) return "closed";
  if (now >= input.startsAt) return "live";
  return "scheduled";
}

export function shouldAutoSubmitForIntegrityWarnings(warningCount: number, threshold: number) {
  return warningCount >= threshold;
}
