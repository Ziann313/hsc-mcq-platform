import type { Language } from "@/components/PlatformShell";
import { trpc } from "@/lib/trpc";
import { BellRing, Users } from "lucide-react";

export function DailyChallengeAlertSummary({ language }: { language: Language }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const schedules = trpc.liveExam.dailyChallengeSchedules.useQuery();
  if (schedules.isLoading || schedules.error || !schedules.data?.length) return null;
  const active = schedules.data.filter(schedule => schedule.isEnabled);
  const delivered = schedules.data.reduce((total, schedule) => total + schedule.notificationDeliveryCount, 0);
  return <section className="rounded-2xl border border-[#d6dcfa] bg-[#f6f7ff] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white text-[#315bb3]"><BellRing size={18} /></span><div><p className="text-sm font-extrabold text-[#071d33]">{copy("Daily challenge alerts", "ডেইলি চ্যালেঞ্জ অ্যালার্ট")}</p><p className="mt-1 text-xs leading-5 text-slate-600">{copy("Only students who opted in receive the private inbox notice when a daily challenge opens.", "ডেইলি চ্যালেঞ্জ শুরু হলে শুধু অপ্ট-ইন করা শিক্ষার্থীরা ব্যক্তিগত ইনবক্স নোটিশ পায়।")}</p></div></div><div className="flex gap-2"><span className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#315bb3]">{active.length} {copy("active", "সক্রিয়")}</span><span className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#087b6c]"><Users size={13} />{delivered} {copy("delivered", "পাঠানো")}</span></div></div></section>;
}
