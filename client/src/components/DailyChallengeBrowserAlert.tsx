import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

export function DailyChallengeBrowserAlert() {
  const { isAuthenticated } = useAuth();
  const notices = trpc.learning.notifications.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 60_000 });
  useEffect(() => {
    if (!notices.data || typeof Notification === "undefined" || Notification.permission !== "granted" || localStorage.getItem("mcqGuru.dailyChallengeBrowserAlerts") !== "enabled") return;
    const seen = new Set(JSON.parse(localStorage.getItem("mcqGuru.dailyChallengeAlertSeenIds") ?? "[]") as number[]);
    const fresh = notices.data.filter(notice => notice.actionUrl?.startsWith("/live-exams/") && !seen.has(notice.id)).slice(0, 1);
    fresh.forEach(notice => { new Notification(notice.title, { body: notice.body, tag: `mcq-guru-daily-${notice.id}` }); seen.add(notice.id); });
    if (fresh.length) localStorage.setItem("mcqGuru.dailyChallengeAlertSeenIds", JSON.stringify(Array.from(seen).slice(-60)));
  }, [notices.data]);
  return null;
}
