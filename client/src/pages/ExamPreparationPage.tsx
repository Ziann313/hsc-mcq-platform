import { PlatformShell, type Language } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterContentBySearch } from "@/lib/contentDiscovery";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Clock3, FileQuestion, Search, ShieldCheck, Target, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function ExamPreparationPage({ language, onLanguageChange }: { language: Language; onLanguageChange: (value: Language) => void }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const [, navigate] = useLocation();
  const [contentLanguage, setContentLanguage] = useState<"bn" | "en">(language);
  const [groupSlug, setGroupSlug] = useState<"science" | "humanities" | "business-studies">("science");
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [limit, setLimit] = useState<number | null>(null);
  const [subjectSearch, setSubjectSearch] = useState("");
  const availabilityInput = useMemo(() => ({ contentLanguage, groupSlug }), [contentLanguage, groupSlug]);
  const availability = trpc.learning.publishedContentAvailability.useQuery(availabilityInput);
  const coverage = trpc.learning.curriculumCoverageSummary.useQuery();
  const readiness = trpc.learning.examReadinessSummary.useQuery();
  const subjects = availability.data?.subjects ?? [];
  const visibleSubjects = useMemo(() => filterContentBySearch(subjects.map(subject => ({ ...subject, title: subject.name })), subjectSearch), [subjectSearch, subjects]);
  const selected = subjects.find(subject => subject.subjectId === subjectId);
  const chapterInput = useMemo(() => subjectId ? { subjectId, contentLanguage } : undefined, [contentLanguage, subjectId]);
  const chapterAvailability = trpc.mcq.publishedChapterAvailability.useQuery(chapterInput);
  const chapters = subjectId ? (chapterAvailability.data ?? []) : [];
  const selectedChapter = chapters.find(chapter => chapter.chapterId === chapterId);
  const selectVersion = (nextLanguage: "bn" | "en") => { setContentLanguage(nextLanguage); setSubjectId(null); setChapterId(null); };
  const selectGroup = (nextGroup: "science" | "humanities" | "business-studies") => { setGroupSlug(nextGroup); setSubjectId(null); setChapterId(null); };
  const prepare = () => {
    if (!duration || !limit) return;
    sessionStorage.setItem("mcqGuru.examPreset", JSON.stringify({ subjectId: subjectId ?? undefined, chapterId: chapterId ?? undefined, groupSlug, contentLanguage, duration, limit }));
    navigate("/live-exam");
  };

  return <PlatformShell language={language} onLanguageChange={onLanguageChange}>
    <main className="mx-auto max-w-5xl space-y-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <section className="rounded-[28px] bg-[#071d33] p-6 text-white sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-[#7ce3d1]">{copy("EXAM PREPARATION", "এক্সাম প্রস্তুতি")}</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold">{copy("Build an approved practice exam around your real learning needs.", "তোমার আসল লার্নিং প্রয়োজন অনুযায়ী অনুমোদিত প্র্যাকটিস এক্সাম তৈরি করো।")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{copy("Only published, source-linked questions are used. Your selected setup becomes a server-frozen attempt when you start.", "শুধু প্রকাশিত সোর্স-লিংকড প্রশ্ন ব্যবহার করা হয়। শুরু করলে তোমার সেটআপ সার্ভার-ফ্রিজড অ্যাটেম্পট হবে।")}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-bold text-[#7ce3d1]">{copy("READINESS SIGNAL", "রেডিনেস সিগন্যাল")}</p>
            {readiness.isLoading ? <div className="mt-3 h-9 w-16 animate-pulse rounded bg-white/10" /> : <p className="mt-3 text-3xl font-extrabold">{readiness.data?.overallAccuracy === null || readiness.data?.overallAccuracy === undefined ? "—" : `${readiness.data.overallAccuracy}%`}</p>}
            <p className="mt-1 text-xs text-slate-300">{copy("from submitted answers", "জমা দেওয়া উত্তর থেকে")}</p>
          </div>
        </div>
      </section>

      <SelectionSection icon={Target} title={copy("1. Choose question language", "১. প্রশ্নের ভাষা বেছে নাও")} description={copy("Your attempt will contain only questions written in the selected version.", "তোমার অ্যাটেম্পটে শুধু নির্বাচিত সংস্করণে লেখা প্রশ্ন থাকবে।")}> 
        <div className="mt-5 flex flex-wrap gap-2">
          <Choice active={contentLanguage === "bn"} onClick={() => selectVersion("bn")}>বাংলা</Choice>
          <Choice active={contentLanguage === "en"} onClick={() => selectVersion("en")}>English</Choice>
        </div>
      </SelectionSection>

      <SelectionSection icon={Target} title={copy("2. Choose your HSC group", "২. তোমার এইচএসসি গ্রুপ বেছে নাও")} description={copy("The server applies this group when it freezes your attempt. Every group remains visible even when its reviewed capacity is currently limited.", "সার্ভার তোমার অ্যাটেম্পট ফ্রিজ করার সময় এই গ্রুপ প্রযোজ্য করে। রিভিউড কনটেন্ট সীমিত হলেও প্রতিটি গ্রুপ দৃশ্যমান থাকে।")}>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{[
          { slug: "science" as const, en: "Science", bn: "বিজ্ঞান" },
          { slug: "humanities" as const, en: "Humanities", bn: "মানবিক" },
          { slug: "business-studies" as const, en: "Business Studies", bn: "ব্যবসায় শিক্ষা" },
        ].map(group => {
          const summary = coverage.data?.groups.find(item => item.slug === group.slug);
          const active = groupSlug === group.slug;
          return <button key={group.slug} type="button" onClick={() => selectGroup(group.slug)} className={`min-h-28 rounded-2xl border p-4 text-left transition-transform duration-150 active:scale-[.98] ${active ? "border-[#087b6c] bg-[#effcf9] text-[#075f53]" : "border-slate-200 bg-slate-50 text-slate-700"}`}><p className="font-display text-lg font-extrabold">{copy(group.en, group.bn)}</p><p className="mt-2 text-xs leading-5 opacity-80">{coverage.isLoading ? copy("Checking reviewed capacity…", "রিভিউড কনটেন্ট দেখা হচ্ছে…") : copy(`${summary?.publishedSubjectCount ?? 0} published subject(s) · ${summary?.publishedQuestionCount ?? 0} source-linked question(s)`, `${summary?.publishedSubjectCount ?? 0}টি প্রকাশিত বিষয় · ${summary?.publishedQuestionCount ?? 0}টি সোর্স-লিংকড প্রশ্ন`)}</p></button>;
        })}</div>
      </SelectionSection>

      <SelectionSection icon={Target} title={copy("3. Choose your subject", "৩. বিষয় বেছে নাও")} description={copy("Leave this as all available subjects in the selected group for broader practice, or choose one published subject to unlock its chapter focus.", "নির্বাচিত গ্রুপে বিস্তৃত প্র্যাকটিসের জন্য সব উপলভ্য বিষয় রাখো, অথবা অধ্যায় ফোকাস চালু করতে একটি প্রকাশিত বিষয় বেছে নাও।")}>
        {availability.isLoading ? <div className="mt-5 space-y-3" aria-busy="true"><div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" /><div className="flex flex-wrap gap-2">{[1, 2, 3, 4].map(item => <div key={item} className="h-11 w-36 animate-pulse rounded-xl bg-slate-100" />)}</div></div> : subjects.length ? <div className="mt-5"><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={subjectSearch} onChange={event => setSubjectSearch(event.target.value)} placeholder={copy("Search a subject", "বিষয় খুঁজুন")} aria-label={copy("Search published subjects", "প্রকাশিত বিষয় খুঁজুন")} className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 pr-10" />{subjectSearch && <button type="button" onClick={() => setSubjectSearch("")} aria-label={copy("Clear subject search", "বিষয় অনুসন্ধান মুছুন")} className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-200"><X size={16} /></button>}</div><p className="mt-2 text-xs text-slate-500">{copy(`${visibleSubjects.length} matching published subject${visibleSubjects.length === 1 ? "" : "s"}`, `${visibleSubjects.length}টি মিল থাকা প্রকাশিত বিষয়`)}</p><div className="mt-3 flex flex-wrap gap-2"><Choice active={subjectId === null} onClick={() => { setSubjectId(null); setChapterId(null); }}>{copy("All available subjects", "সব উপলভ্য বিষয়")}</Choice>{visibleSubjects.map(subject => <Choice key={subject.subjectId} active={subjectId === subject.subjectId} onClick={() => { setSubjectId(subject.subjectId); setChapterId(null); }}>{subject.name} <span className="ml-1 opacity-70">{subject.questionCount}</span></Choice>)}</div>{!visibleSubjects.length && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{copy("No published subject matches that search. Try a shorter subject or paper name.", "এই অনুসন্ধানের সঙ্গে কোনো প্রকাশিত বিষয় মেলেনি। ছোট করে বিষয় বা পেপারের নাম লিখে চেষ্টা করো।")}</p>}</div> : <div className="mt-5 rounded-xl bg-[#fffaf0] p-4 text-sm text-[#8b642f]">{copy("No approved published questions are available in this language version yet. Choose the other version or return as source-linked content is released.", "এই ভাষা সংস্করণে এখনও কোনো অনুমোদিত প্রকাশিত প্রশ্ন নেই। অন্য সংস্করণ বেছে নাও অথবা সোর্স-লিংকড কনটেন্ট প্রকাশিত হলে ফিরে আসো।")}</div>}
      </SelectionSection>

      {subjectId && <SelectionSection icon={Target} title={copy("4. Narrow by chapter", "৪. অধ্যায় দিয়ে ফোকাস করো")} description={copy("Only chapters with published questions and active source evidence appear here.", "শুধু প্রকাশিত প্রশ্ন ও অ্যাকটিভ সোর্স এভিডেন্স থাকা অধ্যায়গুলো এখানে দেখা যায়।")} tone="blue">
        {chapterAvailability.isLoading ? <div className="mt-5 h-12 animate-pulse rounded-xl bg-white" /> : chapters.length ? <div className="mt-5 flex flex-wrap gap-2">
          <Choice active={chapterId === null} onClick={() => setChapterId(null)} tone="blue">{copy("All chapters", "সব অধ্যায়")}</Choice>
          {chapters.map(chapter => <Choice key={chapter.chapterId} active={chapterId === chapter.chapterId} onClick={() => setChapterId(chapter.chapterId)} tone="blue">{chapter.chapter} <span className="ml-1 opacity-70">{chapter.questionCount}</span></Choice>)}
        </div> : <p className="mt-5 rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">{copy("This subject has no chapter-tagged questions with active source evidence in the selected language yet. You can still practise all matching questions in the subject.", "নির্বাচিত ভাষায় এই বিষয়ে এখনও অ্যাকটিভ সোর্স এভিডেন্সসহ কোনো অধ্যায়-ট্যাগড প্রশ্ন নেই। তবু বিষয়টির মিল থাকা প্রশ্ন প্র্যাকটিস করতে পারো।")}</p>}
      </SelectionSection>}

      <section className="grid gap-5 lg:grid-cols-2">
        <SetupCard icon={FileQuestion} title={copy("5. Set question count", "৫. প্রশ্নসংখ্যা সেট করো")}><div className="mt-4"><Input type="number" inputMode="numeric" min={1} max={100} value={limit ?? ""} onChange={event => { const value = Number(event.target.value); setLimit(Number.isInteger(value) && value >= 1 && value <= 100 ? value : null); }} placeholder={copy("Enter a count up to 100", "১০০ পর্যন্ত প্রশ্নসংখ্যা লিখুন")} aria-label={copy("Question count", "প্রশ্নসংখ্যা")} className="h-12 rounded-xl" /></div></SetupCard>
        <SetupCard icon={Clock3} title={copy("6. Set duration", "৬. সময় সেট করো")}><div className="mt-4"><Input type="number" inputMode="numeric" min={1} max={240} value={duration ?? ""} onChange={event => { const value = Number(event.target.value); setDuration(Number.isInteger(value) && value >= 1 && value <= 240 ? value : null); }} placeholder={copy("Enter minutes up to 240", "২৪০ পর্যন্ত মিনিট লিখুন")} aria-label={copy("Duration in minutes", "মিনিটে সময়")} className="h-12 rounded-xl" /></div></SetupCard>
      </section>

      <section className="rounded-[24px] border border-[#bdeadd] bg-[#effcf9] p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-[#087b6c]">{copy("YOUR EXAM SETUP", "তোমার এক্সাম সেটআপ")}</p>
            <p className="mt-2 text-sm font-extrabold text-[#071d33]">{copy(groupSlug === "science" ? "Science" : groupSlug === "humanities" ? "Humanities" : "Business Studies", groupSlug === "science" ? "বিজ্ঞান" : groupSlug === "humanities" ? "মানবিক" : "ব্যবসায় শিক্ষা")} · {selected?.name ?? copy("All available subjects", "সব উপলভ্য বিষয়")}{selectedChapter ? ` · ${selectedChapter.chapter}` : ""} · {contentLanguage === "bn" ? "বাংলা" : "English"} · {limit ?? "—"} {copy("questions", "প্রশ্ন")} · {duration ?? "—"} {copy("minutes", "মিনিট")}</p>
            <p className="mt-1 text-xs text-[#386e66]">{copy("The actual number can be lower when fewer approved questions match your selection.", "তোমার নির্বাচনের সাথে কম অনুমোদিত প্রশ্ন মিললে আসল সংখ্যা কম হতে পারে।")}</p>
          </div>
          <Button disabled={!subjects.length || !duration || !limit} onClick={prepare} className="min-h-12 rounded-xl bg-[#071d33]">{copy("Continue to exam", "এক্সামে এগিয়ে যাও")}<ArrowRight size={16} /></Button>
        </div>
      </section>
      <p className="flex items-center gap-2 text-xs leading-5 text-slate-500"><ShieldCheck size={15} className="text-[#087b6c]" />{copy("No sample questions or invented readiness data are used in this setup.", "এই সেটআপে কোনো স্যাম্পল প্রশ্ন বা কৃত্রিম রেডিনেস ডেটা ব্যবহার করা হয় না।")}</p>
    </main>
  </PlatformShell>;
}

function SelectionSection({ icon: Icon, title, description, children, tone = "teal" }: { icon: typeof Target; title: string; description: string; children: React.ReactNode; tone?: "teal" | "blue" }) {
  const blue = tone === "blue";
  return <section className={`rounded-[24px] p-5 shadow-sm sm:p-6 ${blue ? "border border-[#d5e6f5] bg-[#f6faff]" : "bg-white"}`}><div className="flex gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${blue ? "bg-[#eef3ff] text-[#315bb3]" : "bg-[#e9fbf7] text-[#087b6c]"}`}><Icon size={19} /></span><div><h2 className="font-display text-xl font-extrabold text-[#071d33]">{title}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div></div>{children}</section>;
}

function Choice({ active, onClick, children, tone = "navy", compact = false }: { active: boolean; onClick: () => void; children: React.ReactNode; tone?: "navy" | "blue"; compact?: boolean }) {
  const selectedClass = tone === "blue" ? "bg-[#315bb3] text-white" : "bg-[#071d33] text-white";
  return <button onClick={onClick} className={`${compact ? "min-h-12" : "min-h-11"} rounded-xl px-4 text-sm font-bold transition-transform duration-150 active:scale-[.97] ${active ? selectedClass : "bg-slate-100 text-slate-600"}`}>{children}</button>;
}

function SetupCard({ icon: Icon, title, children }: { icon: typeof Clock3; title: string; children: React.ReactNode }) {
  return <section className="rounded-[24px] bg-white p-5 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-[#eef3ff] text-[#315bb3]"><Icon size={18} /></span><h2 className="mt-4 font-display text-lg font-extrabold text-[#071d33]">{title}</h2>{children}</section>;
}
