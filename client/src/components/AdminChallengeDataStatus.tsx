import type { Language } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertTriangle } from "lucide-react";

export function AdminChallengeDataStatus({ language }: { language: Language }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const questions = trpc.mcq.publishedQuestionCapacity.useQuery();
  const schedules = trpc.liveExam.dailyChallengeSchedules.useQuery();
  const failure = questions.error ?? schedules.error;
  if (!failure) return null;
  return <section className="rounded-2xl border border-[#f4d1c7] bg-[#fffaf8] p-4"><div className="flex gap-3"><AlertTriangle className="shrink-0 text-[#b86b09]" size={20} /><div><p className="text-sm font-extrabold text-[#071d33]">{copy("Daily challenge data could not load", "ডেইলি চ্যালেঞ্জ ডেটা লোড করা যায়নি")}</p><p className="mt-1 text-xs text-slate-600">{failure.message}</p><Button onClick={() => { questions.refetch(); schedules.refetch(); }} className="mt-3 min-h-10 rounded-lg bg-[#071d33]">{copy("Retry", "আবার চেষ্টা")}</Button></div></div></section>;
}
