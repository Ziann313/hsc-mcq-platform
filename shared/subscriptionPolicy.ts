export const TRIAL_DURATION_DAYS = 30;

export const PREMIUM_FEATURES = [
  "unlimited_practice",
  "unlimited_exams",
  "unlimited_tutor",
  "unlimited_image_solver",
  "adaptive_study_plan",
  "full_notebook",
  "detailed_insights",
  "priority_support",
] as const;

export type UsageLimitType = "practice_questions" | "exams" | "tutor_questions" | "image_solves";
export type SubscriptionStatus = "trial" | "active" | "expired" | "cancelled";
export type PlanType = "free" | "premium";

export const FREE_USAGE_LIMITS: Record<UsageLimitType, { limit: number; window: "day" | "week" }> = {
  practice_questions: { limit: 20, window: "day" },
  exams: { limit: 1, window: "week" },
  tutor_questions: { limit: 5, window: "day" },
  image_solves: { limit: 2, window: "week" },
};

function dateParts(now: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = Object.fromEntries(formatter.formatToParts(now).filter(part => part.type !== "literal").map(part => [part.type, part.value]));
  return { year: parts.year!, month: parts.month!, day: parts.day! };
}

export function bangladeshDayKey(now = new Date()) {
  const { year, month, day } = dateParts(now);
  return `${year}-${month}-${day}`;
}

export function bangladeshWeekKey(now = new Date()) {
  const dayKey = bangladeshDayKey(now);
  const calendarAnchor = new Date(`${dayKey}T12:00:00.000Z`);
  const offsetFromMonday = (calendarAnchor.getUTCDay() + 6) % 7;
  calendarAnchor.setUTCDate(calendarAnchor.getUTCDate() - offsetFromMonday);
  return `week:${calendarAnchor.toISOString().slice(0, 10)}`;
}

export function usagePeriodKey(limitType: UsageLimitType, now = new Date()) {
  return FREE_USAGE_LIMITS[limitType].window === "day" ? bangladeshDayKey(now) : bangladeshWeekKey(now);
}

export function hasFullSubscriptionAccess(subscription: { planType: PlanType; status: SubscriptionStatus }) {
  return subscription.status === "trial" || (subscription.planType === "premium" && subscription.status === "active");
}

export function subscriptionDaysLeft(endsAt: Date | null | undefined, now = new Date()) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000));
}
