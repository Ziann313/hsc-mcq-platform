import { PlatformShell, type Language } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { TodaysStudyGuide } from "@/components/TodaysStudyGuide";
import { trpc } from "@/lib/trpc";
import { BarChart3, Bell, BookOpenCheck, CheckCircle2, FlaskConical, Landmark, LockKeyhole, Play, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { useLocation } from "wouter";

type Coverage = {
  groups: Array<{ slug: string; nameEn: string; nameBn: string; registeredSubjectCount: number; registeredChapterCount: number; publishedChapterCount: number }>;
  scienceChapters: Array<{ chapterId: number; subject: string; chapter: string; questionCount: number }>;
};

const copyForSurface = {
  en: "Build a learning record you can trust.",
  bn: "বিশ্বাসযোগ্য লার্নিং রেকর্ড তৈরি করো।",
  detailEn: "MCQ GURU shows content and performance only when it exists in your real learning record.",
  detailBn: "MCQ GURU শুধু তখনই কনটেন্ট ও পারফরম্যান্স দেখায়, যখন তা তোমার আসল লার্নিং রেকর্ডে থাকে।",
};

export default function Home({ language, onLanguageChange }: { language: Language; onLanguageChange: (value: Language) => void }) {
  return <PlatformShell language={language} onLanguageChange={onLanguageChange}><LearningDashboard language={language} /></PlatformShell>;
}

function LearningDashboard({ language }: { language: Language }) {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const availability = trpc.learning.publishedContentAvailability.useQuery();
  const coverage = trpc.learning.curriculumCoverageSummary.useQuery();
  const progress = trpc.learning.studentProgressSummary.useQuery(undefined, { enabled: isAuthenticated && !loading });
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  if (loading) return <div className="min-h-[520px] animate-pulse rounded-[28px] bg-white" />;

  const publishedCount = availability.data?.publishedQuestionCount ?? 0;
  const hasPractice = publishedCount > 0;
  const personal = progress.data;

  return <div className="card-container mx-auto w-full max-w-5xl space-y-6">
    <section className="relative overflow-hidden rounded-[28px] bg-[#071d33] p-6 text-white shadow-xl shadow-[#071d33]/10 sm:p-8">
      <div className="absolute -right-16 -top-20 size-72 rounded-full bg-[#16b89b]/20 blur-3xl" />
      <div className="relative grid gap-7 lg:grid-cols-[1fr_230px]">
        <div className="min-w-0">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#16b89b] text-[#071d33]"><Sparkles /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#7ce3d1]">{copy("TRUTHFUL LEARNING STATE", "স্বচ্ছ লার্নিং স্টেট")}</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">{isAuthenticated ? copy(`${user?.name ?? "Student"}, ${copyForSurface.en}`, `${user?.name ?? "শিক্ষার্থী"}, ${copyForSurface.bn}`) : copy(copyForSurface.en, copyForSurface.bn)}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{copy(copyForSurface.detailEn, copyForSurface.detailBn)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {isAuthenticated ? <Button onClick={() => navigate(hasPractice ? "/mcq-lab" : "/notices")} className="mcq-action-button h-11 rounded-xl bg-[#16b89b] text-[#071d33] hover:bg-[#24c8aa] sm:w-auto">{hasPractice ? <Play size={16} fill="currentColor" /> : <Bell size={16} />}{copy(hasPractice ? "Open approved practice" : "View official notices", hasPractice ? "অনুমোদিত প্র্যাকটিস খোলো" : "অফিসিয়াল নোটিশ দেখো")}</Button> : <Button onClick={() => startLogin()} className="mcq-action-button h-11 rounded-xl bg-[#16b89b] text-[#071d33] hover:bg-[#24c8aa] sm:w-auto"><LockKeyhole size={16} />{copy("Continue to secure sign-in", "নিরাপদ সাইন-ইন চালিয়ে যাও")}</Button>}
            <Button onClick={() => navigate("/mcq-lab")} variant="outline" className="mcq-action-button h-11 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white sm:w-auto"><BookOpenCheck size={16} />{copy("Practice availability", "প্র্যাকটিস অ্যাভেইলেবিলিটি")}</Button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="flex items-center gap-2 text-xs font-bold text-[#7ce3d1]"><BookOpenCheck size={15} />{copy("PUBLISHED QUESTION BANK", "প্রকাশিত প্রশ্ন ব্যাংক")}</p>
          <p className="mt-4 text-4xl font-extrabold">{availability.isLoading ? "…" : publishedCount}</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">{copy("source-linked questions ready for student practice", "সোর্স-লিংকড প্রশ্ন শিক্ষার্থীর প্র্যাকটিসের জন্য প্রস্তুত")}</p>
        </div>
      </div>
    </section>

    <HscGroups language={language} coverage={coverage.data} loading={coverage.isLoading} onExamSetup={() => navigate("/exams")} />

    <section className="rounded-[24px] border border-[#d8e4ff] bg-[#f4f7ff] p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#315bb3] text-white"><Landmark size={20} /></span>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#315bb3]">{copy("ADMISSION PREPARATION", "ভর্তি প্রস্তুতি")}</p><h2 className="mt-1 font-display text-xl font-extrabold text-[#071d33]">{copy("Medical, engineering, and university", "মেডিকেল, ইঞ্জিনিয়ারিং ও বিশ্ববিদ্যালয়")}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{copy("Keep custom practice, mock simulation, and verified admission information separate from HSC study.", "কাস্টম প্র্যাকটিস, মক সিমুলেশন ও যাচাইকৃত ভর্তি তথ্য আলাদা রাখো।")}</p></div>
        </div>
        <Button onClick={() => navigate("/admission")} className="min-h-11 rounded-xl bg-[#315bb3]">{copy("Open admission prep", "ভর্তি প্রস্তুতি খোলো")}</Button>
      </div>
    </section>

    <ScienceCoverageTracker language={language} loading={coverage.isLoading} coverage={coverage.data} onOpen={() => navigate("/exams")} />
    {isAuthenticated && <TodaysStudyGuide language={language} />}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={BookOpenCheck} value={availability.isLoading ? "…" : String(publishedCount)} label={copy("Published questions", "প্রকাশিত প্রশ্ন")} detail={hasPractice ? copy("practice is available", "প্র্যাকটিস চালু আছে") : copy("waiting for release", "রিলিজের অপেক্ষায়")} tint="bg-[#e9fbf7] text-[#098873]" />
      <Metric icon={CheckCircle2} value={isAuthenticated && !progress.isLoading ? String(personal?.completedAttempts ?? 0) : "—"} label={copy("Completed attempts", "সম্পন্ন অ্যাটেম্পট")} detail={isAuthenticated ? copy("from submitted attempts", "জমা দেওয়া অ্যাটেম্পট থেকে") : copy("sign in required", "সাইন ইন প্রয়োজন")} tint="bg-[#eef3ff] text-[#315bb3]" />
      <Metric icon={BarChart3} value={isAuthenticated && !progress.isLoading && personal?.accuracy !== null && personal?.accuracy !== undefined ? `${personal.accuracy}%` : "—"} label={copy("Real accuracy", "আসল নির্ভুলতা")} detail={isAuthenticated ? copy("from answered questions", "উত্তর দেওয়া প্রশ্ন থেকে") : copy("sign in required", "সাইন ইন প্রয়োজন")} tint="bg-[#fff5e4] text-[#b86b09]" />
      <Metric icon={Trophy} value={isAuthenticated && !progress.isLoading ? String(personal?.studyStreakDays ?? 0) : "—"} label={copy("Activity streak", "অ্যাক্টিভিটি স্ট্রিক")} detail={isAuthenticated ? copy("from submitted attempts", "আসল অ্যাটেম্পট দিনের ভিত্তিতে") : copy("sign in required", "সাইন ইন প্রয়োজন")} tint="bg-[#fff0eb] text-[#e45f38]" />
    </section>
    <section className="rounded-[24px] border border-[#bdeadd] bg-[#effcf9] p-5 text-sm leading-6 text-[#165e54]"><ShieldCheck className="mr-2 inline text-[#088a78]" size={17} /><b>{copy("No demo performance data. ", "কোনো ডেমো পারফরম্যান্স ডেটা নয়। ")}</b>{copy("Streaks, accuracy, attempts, and content availability come from live published content and your persisted activity.", "স্ট্রিক, নির্ভুলতা, অ্যাটেম্পট ও কনটেন্ট অ্যাভেইলেবিলিটি লাইভ প্রকাশিত কনটেন্ট এবং তোমার সংরক্ষিত অ্যাক্টিভিটি থেকে আসে।")}</section>
  </div>;
}

function HscGroups({ language, coverage, loading, onExamSetup }: { language: Language; coverage: Coverage | undefined; loading: boolean; onExamSetup: () => void }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const groupInfo = { science: { en: "Science", bn: "বিজ্ঞান" }, humanities: { en: "Arts & Humanities", bn: "মানবিক" }, "business-studies": { en: "Commerce & Business", bn: "ব্যবসায় শিক্ষা" } };
  return <section className="rounded-[24px] bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#087b6c]">{copy("HSC PREPARATION", "এইচএসসি প্রস্তুতি")}</p><h2 className="mt-2 font-display text-2xl font-extrabold text-[#071d33]">{copy("Start with your group, subject, and chapter", "তোমার গ্রুপ, বিষয় ও অধ্যায় থেকে শুরু করো")}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy("Every group is represented in the curriculum registry. Practice opens only where reviewed content is published.", "সব গ্রুপের পাঠ্যক্রম একইভাবে রেজিস্ট্রিতে রাখা হয়। প্রকাশিত কনটেন্ট থাকলেই প্র্যাকটিস চালু হয়।")}</p></div><Button onClick={onExamSetup} variant="outline" className="min-h-11 rounded-xl"><BookOpenCheck size={16} />{copy("HSC exam setup", "এইচএসসি এক্সাম সেটআপ")}</Button></div><div className="mt-5 grid gap-3 md:grid-cols-3">{(["science", "humanities", "business-studies"] as const).map(slug => { const group = coverage?.groups.find(item => item.slug === slug); const name = copy(group?.nameEn ?? groupInfo[slug].en, group?.nameBn ?? groupInfo[slug].bn); const detail = loading ? "…" : copy(`${group?.registeredSubjectCount ?? 0} registered subjects · ${group?.publishedChapterCount ?? 0} published chapters`, `${group?.registeredSubjectCount ?? 0}টি রেজিস্টার্ড বিষয় · ${group?.publishedChapterCount ?? 0}টি প্রকাশিত অধ্যায়`); return <article key={slug} className="rounded-2xl border border-slate-100 bg-[#fbfdfd] p-4"><p className="font-display text-lg font-extrabold text-[#071d33]">{name}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p><Button onClick={onExamSetup} variant="outline" className="mt-4 min-h-10 w-full rounded-xl text-[#087b6c]"><Play size={14} />{copy("Choose subject", "বিষয় বেছে নাও")}</Button></article>; })}</div></section>;
}

function ScienceCoverageTracker({ language, coverage, loading, onOpen }: { language: Language; coverage: Coverage | undefined; loading: boolean; onOpen: () => void }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const science = coverage?.groups.find(group => group.slug === "science");
  const registered = science?.registeredChapterCount ?? 0;
  const published = science?.publishedChapterCount ?? 0;
  const percent = registered ? Math.round((published / registered) * 100) : 0;
  return <section className="rounded-[24px] border border-[#bdeadd] bg-[#effcf9] p-5 sm:p-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#16b89b] text-[#062033]"><FlaskConical size={19} /></span><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#087b6c]">{copy("SCIENCE CONTENT COVERAGE", "বিজ্ঞান কনটেন্ট কভারেজ")}</p><h2 className="mt-1 font-display text-xl font-extrabold text-[#071d33]">{loading ? "…" : copy(`${published} / ${registered} chapters ready for practice`, `${published} / ${registered}টি অধ্যায় প্র্যাকটিসের জন্য প্রস্তুত`)}</h2><p className="mt-2 text-xs leading-5 text-[#386e66]">{copy("This measures published, source-linked chapter availability—not your personal performance.", "এটি প্রশ্ন ব্যাংকের প্রকাশিত, সোর্স-লিংকড অধ্যায় কভারেজ—তোমার ব্যক্তিগত পারফরম্যান্স নয়।")}</p></div></div>
      <Button onClick={onOpen} variant="outline" className="min-h-10 rounded-xl border-[#16b89b] text-[#087b6c]">{copy("Science practice", "বিজ্ঞান প্র্যাকটিস")}</Button>
    </div>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/80"><div className="h-full rounded-full bg-[#16b89b] transition-[width] duration-200" style={{ width: `${percent}%` }} /></div>
    <p className="mt-2 text-xs font-bold text-[#087b6c]">{loading ? "…" : `${percent}%`}</p>
    {coverage?.scienceChapters.length ? <div className="mt-4 flex flex-wrap gap-2">{coverage.scienceChapters.slice(0, 6).map(chapter => <span key={chapter.chapterId} className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#165e54]">{chapter.subject} · {chapter.chapter} <b className="ml-1 text-[#087b6c]">{chapter.questionCount}</b></span>)}</div> : <p className="mt-4 text-sm text-[#386e66]">{copy("No source-validated science chapters are published yet.", "এখনো কোনো সোর্স-ভ্যালিডেটেড বিজ্ঞান অধ্যায় প্রকাশিত হয়নি।")}</p>}
  </section>;
}

function Metric({ icon: Icon, value, label, detail, tint }: { icon: typeof BookOpenCheck; value: string; label: string; detail: string; tint: string }) {
  return <article className="rounded-2xl bg-white p-4 shadow-[0_10px_24px_rgba(15,40,55,.045)] ring-1 ring-slate-100"><span className={`grid size-9 place-items-center rounded-xl ${tint}`}><Icon size={17} /></span><p className="mt-4 text-2xl font-extrabold text-[#071d33]">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-[11px] leading-4 text-slate-400">{detail}</p></article>;
}
