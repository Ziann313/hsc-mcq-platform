import { PlatformShell, type Language } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, FileQuestion, Play, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type BankQuestion = { id: number; prompt: string; questionType: string; boardStandard: string; boardName: string | null; boardExamYear: number | null; collegePaper: string | null; subject: string; chapter: string | null; stemContext: string | null; options: Array<{ id: number; optionKey: string; text: string }> };
type ActiveAttempt = { attemptId: number; expiresAt: Date | string; questions: BankQuestion[] };

export default function LiveExamPage({ language, onLanguageChange }: { language: Language; onLanguageChange: (value: Language) => void }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const [attempt, setAttempt] = useState<ActiveAttempt | null>(null);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [remaining, setRemaining] = useState(0);
  const [finishedAttemptId, setFinishedAttemptId] = useState<number | null>(null);
  const submitted = useRef(false);
  const start = trpc.mcq.startFilteredAttempt.useMutation({
    onSuccess: data => { setAttempt(data as ActiveAttempt); setSelections({}); setFinishedAttemptId(null); submitted.current = false; },
    onError: error => toast.error(error.message),
  });
  const submit = trpc.mcq.submitFrozenAttempt.useMutation({
    onSuccess: (_result, variables) => { submitted.current = true; setFinishedAttemptId(variables.attemptId); },
    onError: error => toast.error(error.message),
  });
  const saveSelection = trpc.mcq.saveAttemptSelection.useMutation({ onError: error => toast.error(error.message) });
  const result = trpc.mcq.attemptResult.useQuery({ attemptId: finishedAttemptId ?? 0 }, { enabled: Boolean(finishedAttemptId) });
  const finish = () => { if (!attempt || submitted.current || submit.isPending) return; submitted.current = true; submit.mutate({ attemptId: attempt.attemptId, selections: Object.entries(selections).map(([questionId, optionId]) => ({ questionId: Number(questionId), selectedOptionIds: [optionId] })) }); };

  useEffect(() => {
    if (!attempt || finishedAttemptId) return;
    const update = () => {
      const seconds = Math.max(0, Math.ceil((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) finish();
    };
    update(); const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, finishedAttemptId, selections]);
  const time = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  if (finishedAttemptId) return <PlatformShell language={language} onLanguageChange={onLanguageChange}><div className="mx-auto max-w-5xl"><section className="rounded-[28px] bg-[#071d33] p-7 text-white"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#7ce3d1]">{copy("PERSISTED RESULT", "সংরক্ষিত ফলাফল")}</p><h1 className="mt-2 font-display text-3xl font-extrabold">{copy("Your live attempt has been submitted.", "তোমার লাইভ অ্যাটেম্পট জমা হয়েছে।")}</h1><p className="mt-3 text-sm text-slate-300">{copy("The server froze the question set and marking policy at launch, then calculated the result after submission.", "সার্ভার শুরুতেই প্রশ্নসেট ও মার্কিং পলিসি স্থির করেছে, এরপর সাবমিশনের পর ফলাফল হিসাব করেছে।")}</p></section><section className="mt-6 space-y-4">{result.isLoading ? <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">{copy("Loading solution breakdown…", "সলিউশন ব্রেকডাউন লোড হচ্ছে…")}</div> : result.data?.answers.map((answer, index) => <article key={answer.questionId} className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><span className="text-xs font-bold text-[#088a78]">{answer.subject} · {answer.chapter ?? copy("General", "সাধারণ")}</span><span className={answer.isCorrect ? "text-xs font-bold text-[#088a78]" : "text-xs font-bold text-[#c2492c]"}>{answer.isCorrect ? copy("Correct", "সঠিক") : copy("Review", "রিভিউ")}</span></div><p className="mt-3 text-sm font-bold leading-6 text-[#071d33]">{index + 1}. {answer.prompt}</p><p className="mt-3 rounded-xl bg-[#effcf9] p-3 text-sm leading-6 text-[#165e54]">{answer.explanation ?? copy("Explanation is pending reviewer publication.", "ব্যাখ্যা রিভিউয়ার প্রকাশের অপেক্ষায় আছে।")}</p></article>)}</section></div></PlatformShell>;

  if (attempt) return <PlatformShell language={language} onLanguageChange={onLanguageChange}><div className="mx-auto max-w-5xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#088a78]">{copy("APPROVED QUESTION BANK", "অনুমোদিত প্রশ্ন ব্যাংক")}</p><p className="mt-1 text-sm text-slate-500">{copy("Server-authoritative attempt", "সার্ভার-অথরিটেটিভ অ্যাটেম্পট")}</p></div><span className="rounded-xl bg-[#071d33] px-3 py-2 font-mono text-lg font-bold text-white"><Clock3 className="mr-2 inline text-[#7ce3d1]" size={16} />{time}</span></div><div className="space-y-5">{attempt.questions.map((question, index) => <article key={question.id} className="rounded-[24px] bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-slate-400">{copy(`QUESTION ${index + 1}`, `প্রশ্ন ${index + 1}`)} · {question.subject} · {question.questionType.replaceAll("_", " ")}</p>{question.stemContext && <p className="mt-4 rounded-xl border-l-4 border-[#16b89b] bg-[#effcf9] p-3 text-sm leading-6 text-[#165e54]">{question.stemContext}</p>}<h2 className="mt-4 font-display text-lg font-extrabold leading-7 text-[#071d33]">{question.prompt}</h2><div className="mt-5 grid gap-3">{question.options.map(option => <button key={option.id} onClick={() => { setSelections({ ...selections, [question.id]: option.id }); saveSelection.mutate({ attemptId: attempt.attemptId, questionId: question.id, selectedOptionIds: [option.id] }); }} className={`rounded-xl border p-4 text-left text-sm font-semibold ${selections[question.id] === option.id ? "border-[#16b89b] bg-[#effcf9] text-[#087b6c]" : "border-slate-200 text-slate-600"}`}><span className="mr-3 font-bold">{option.optionKey}.</span>{option.text}</button>)}</div></article>)}</div><Button onClick={finish} disabled={submit.isPending} className="mt-6 h-12 w-full rounded-xl bg-[#071d33]">{submit.isPending ? copy("Submitting…", "জমা হচ্ছে…") : copy("Submit attempt", "অ্যাটেম্পট জমা দাও")}</Button></div></PlatformShell>;

  return <PlatformShell language={language} onLanguageChange={onLanguageChange}><div className="mx-auto max-w-4xl"><div className="grid gap-6 lg:grid-cols-[.76fr_1.24fr]"><aside className="rounded-[28px] bg-[#071d33] p-7 text-white"><span className="grid size-12 place-items-center rounded-2xl bg-[#16b89b] text-[#071d33]"><ShieldCheck /></span><h1 className="mt-5 font-display text-3xl font-extrabold">{copy("Run an approved-question attempt.", "অনুমোদিত প্রশ্নের অ্যাটেম্পট দাও।")}</h1><p className="mt-4 text-sm leading-6 text-slate-300">{copy("The question bank is filtered to published, source-linked records. The timer auto-submits through the server at expiry.", "প্রশ্ন ব্যাংকটি প্রকাশিত ও সোর্স-লিঙ্কড রেকর্ডে ফিল্টার করা। সময় শেষ হলে সার্ভারের মাধ্যমে অটো-সাবমিট হবে।")}</p></aside><section className="rounded-[28px] bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#088a78]">{copy("FILTERED PRACTICE", "ফিল্টারড প্র্যাকটিস")}</p><h2 className="mt-2 font-display text-2xl font-extrabold text-[#071d33]">{copy("Board-standard questions", "বোর্ড-স্ট্যান্ডার্ড প্রশ্ন")}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{copy("This starts only when approved source-linked questions are available. Use the admin importer and review workflow to publish them.", "অনুমোদিত সোর্স-লিঙ্কড প্রশ্ন থাকলেই এটি শুরু হবে। প্রকাশের জন্য অ্যাডমিন ইমপোর্টার ও রিভিউ ওয়ার্কফ্লো ব্যবহার করো।")}</p><Button onClick={() => start.mutate({ filters: { boardStandard: "board_standard", limit: 20 }, durationMinutes: 30, marksPerCorrect: 1 })} disabled={start.isPending} className="mt-7 h-12 w-full rounded-xl bg-[#071d33]"><Play size={16} fill="currentColor" />{start.isPending ? copy("Loading questions…", "প্রশ্ন লোড হচ্ছে…") : copy("Start approved attempt", "অনুমোদিত অ্যাটেম্পট শুরু করো")}</Button><p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><FileQuestion size={14} className="text-[#088a78]" />{copy("Filter fields support subject, chapter, board/year, college paper, difficulty standard, and stem question type through the API.", "API-এর মাধ্যমে বিষয়, অধ্যায়, বোর্ড/বছর, কলেজ পেপার, ডিফিকাল্টি স্ট্যান্ডার্ড ও স্টেম প্রশ্ন টাইপ ফিল্টার সাপোর্ট করা হয়।")}</p></section></div></div></PlatformShell>;
}
