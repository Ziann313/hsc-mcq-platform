export const homeRoutePaths = [
  "/",
  "/practice",
  "/exams",
  "/tutor",
  "/progress",
  "/study-plan",
  "/mistakes",
  "/bookmarks",
] as const;

export const dedicatedRoutePaths = [
  "/onboarding",
  "/image-solver",
  "/admin",
  "/governance",
  "/notifications",
  "/settings",
  "/notices",
  "/profile",
  "/questions/new",
  "/admission-patterns",
  "/mcq-lab",
  "/live-exam",
  "/leaderboard",
  "/cheat-sheets",
  "/mistake-vault",
  "/community",
  "/import",
] as const;

export const registeredRoutePaths = new Set<string>([
  ...homeRoutePaths,
  ...dedicatedRoutePaths,
]);

export const legacyRouteRedirects = {
  "/question-bank": "/practice",
  "/bulk-import": "/import",
  "/question-intake": "/questions/new",
  "/content-workspace": "/governance",
} as const;
