export const homeRoutePaths = [
  "/",
] as const;

export const dedicatedRoutePaths = [
  "/practice",
  "/exams",
  "/progress",
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
  "/admission",
  "/tutor",
  "/study-plan",
  "/live-exam",
  "/live-exams",
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
  "/exam-lab": "/practice",
  "/bulk-import": "/import",
  "/question-intake": "/questions/new",
  "/content-workspace": "/governance",
  "/mcq-lab": "/practice",
  "/mistakes": "/mistake-vault",
  "/bookmarks": "/practice",
} as const;
