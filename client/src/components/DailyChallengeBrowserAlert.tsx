import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export function parseSeenAlertIds(raw: string | null) {
  try {
    const value = JSON.parse(raw ?? "[]");
    return new Set(Array.isArray(value) ? value.filter((id): id is number => typeof id === "number") : []);
  } catch {
    return new Set<number>();
  }
}

export function DailyChallengeBrowserAlert() {
  const { isAuthenticated } = useAuth();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const readPreference = () => {
      try { setEnabled(localStorage.getItem("mcqGuru.dailyChallengeBrowserAlerts") === "enabled"); }
      catch { setEnabled(false); }
    };
    readPreference();
    window.addEventListener("focus", readPreference);
    return () => window.removeEventListener("focus", readPreference);
  }, []);
  const notices = trpc.learning.notifications.useQuery(undefined, {
    enabled: isAuthenticated && enabled,
    staleTime: 5 * 60_000,
    refetchInterval: enabled ? 5 * 60_000 : false,
  });
  useEffect(() => {
    if (!notices.data || typeof Notification === "undefined" || Notification.permission !== "granted" || !enabled) return;
    let seen: Set<number>;
    try { seen = parseSeenAlertIds(localStorage.getItem("mcqGuru.dailyChallengeAlertSeenIds")); }
    catch { seen = new Set<number>(); }
    const fresh = notices.data.filter(notice => notice.actionUrl?.startsWith("/live-exams/") && !seen.has(notice.id)).slice(0, 1);
    fresh.forEach(notice => { new Notification(notice.title, { body: notice.body, tag: `mcq-guru-daily-${notice.id}` }); seen.add(notice.id); });
    if (fresh.length) localStorage.setItem("mcqGuru.dailyChallengeAlertSeenIds", JSON.stringify(Array.from(seen).slice(-60)));
  }, [enabled, notices.data]);
  return null;
}
