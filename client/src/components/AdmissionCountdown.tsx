import { getUpcomingAdmissionCountdown } from "../../../shared/admissionCountdown";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { CalendarClock, ChevronRight, Landmark } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { Language } from "./PlatformShell";

export function AdmissionCountdown({ language }: { language: Language }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const [, navigate] = useLocation();
  const tracks = trpc.learning.activeAdmissionTracks.useQuery();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  if (tracks.isLoading) return <section className="rounded-[24px] bg-white p-5 shadow-sm sm:p-6" aria-busy="true"><div className="h-5 w-44 animate-pulse rounded bg-slate-100" /><div className="mt-4 h-24 animate-pulse rounded-2xl bg-slate-100" /></section>;
  const next = getUpcomingAdmissionCountdown(tracks.data ?? [], now);
  if (!next) return <section className="rounded-[24px] border border-[#d5e6f5] bg-[#f6faff] p-5 sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#315bb3] text-white"><CalendarClock size={19} /></span><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#315bb3]">{copy("ADMISSION COUNTDOWN", "ভর্তি কাউন্টডাউন")}</p><h2 className="mt-1 font-display text-xl font-extrabold text-[#071d33]">{copy("No verified upcoming exam date yet", "এখনো কোনো যাচাইকৃত আসন্ন পরীক্ষার তারিখ নেই")}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{copy("A countdown appears automatically after a reviewer activates an official date record. Study recommendations remain available now.", "রিভিউয়ার অফিসিয়াল তারিখ রেকর্ড অ্যাক্টিভ করলেই কাউন্টডাউন অটোমেটিক দেখা যাবে। এখনই স্টাডি রেকমেন্ডেশন পাওয়া যাচ্ছে।")}</p></div></div><Button onClick={() => navigate("/study-plan")} variant="outline" className="min-h-10 rounded-xl border-[#315bb3] text-[#315bb3]">{copy("Open Today’s Study", "আজকের পড়া খোলো")}</Button></div></section>;
  const label = [next.institution, next.unit || next.title].filter(Boolean).join(" · ");
  return <section className="rounded-[24px] bg-[#102a5d] p-5 text-white shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#a9c6ff] text-[#102a5d]"><Landmark size={19} /></span><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#a9c6ff]">{copy("VERIFIED ADMISSION COUNTDOWN", "যাচাইকৃত ভর্তি কাউন্টডাউন")}</p><h2 className="mt-1 font-display text-xl font-extrabold">{label}</h2><p className="mt-1 text-xs leading-5 text-slate-200">{new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", { dateStyle: "medium", timeStyle: "short" }).format(next.examDate)} · {copy("from the active official-pattern record", "অ্যাক্টিভ অফিসিয়াল প্যাটার্ন রেকর্ড থেকে")}</p></div></div><div className="flex items-center gap-4"><div className="grid grid-cols-3 gap-2 text-center"><TimeBox value={next.days} label={copy("days", "দিন")} /><TimeBox value={next.hours} label={copy("hours", "ঘণ্টা")} /><TimeBox value={next.minutes} label={copy("min", "মিনিট")} /></div><Button onClick={() => navigate("/study-plan")} className="min-h-11 rounded-xl bg-[#a9c6ff] text-[#102a5d] hover:bg-white"><CalendarClock size={16} />{copy("Study plan", "স্টাডি প্ল্যান")}<ChevronRight size={15} /></Button></div></div></section>;
}
function TimeBox({ value, label }: { value: number; label: string }) { return <div className="min-w-12 rounded-xl border border-white/15 bg-white/10 px-2 py-2"><p className="font-display text-lg font-extrabold">{String(value).padStart(2, "0")}</p><p className="text-[10px] font-bold text-[#c8dcff]">{label}</p></div>; }
