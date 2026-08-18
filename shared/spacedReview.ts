export const reviewIntervalsDays = [0, 1, 3, 7, 14, 30] as const;

export function nextReviewAt(lastReviewedAt: Date, reviewCount: number) {
  const intervalDays = reviewIntervalsDays[Math.min(Math.max(reviewCount, 0), reviewIntervalsDays.length - 1)] ?? 30;
  return new Date(lastReviewedAt.getTime() + intervalDays * 86_400_000);
}

export function isReviewDue(lastReviewedAt: Date, reviewCount: number, now = new Date()) {
  return nextReviewAt(lastReviewedAt, reviewCount).getTime() <= now.getTime();
}
