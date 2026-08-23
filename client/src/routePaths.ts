export const homeRoutePaths = [
  "/dashboard",
] as const;

export const publicRoutePaths = ["/", "/about", "/privacy", "/terms", "/refund", "/contact"] as const;

export const dedicatedRoutePaths = [
  "/practice",
  "/exams",
  "/progress",
  "/onboarding",
  "/image-solver",
  "/admin",
  "/admin/payments",
  "/governance",
  "/notifications",
  "/settings",
  "/notices",
  "/profile",
  "/questions/new",
  "/admission-patterns",
  "/exam-history",
  "/exam-blueprints",
  "/historical-import",
  "/ai-generation",
  "/historical-analysis",
  "/admission",
  "/tutor",
  "/study-plan",
  "/live-exam",
  "/live-exams",
  "/leaderboard",
  "/cheat-sheets",
  "/bookmarks",
  "/mistake-vault",
  "/community",
  "/import",
] as const;

export const registeredRoutePaths = new Set<string>([
  ...publicRoutePaths,
  ...homeRoutePaths,
  ...dedicatedRoutePaths,
]);

export const legacyRouteRedirects = {
  "/admission-prep": "/admission",
  "/hsc-prep": "/exams",
  "/previous-year-questions": "/historical-analysis",
  "/question-bank": "/practice",
  "/exam-lab": "/practice",
  "/bulk-import": "/import",
  "/question-intake": "/questions/new",
  "/content-workspace": "/governance",
  "/mcq-lab": "/practice",
  "/mistakes": "/mistake-vault",
} as const;
