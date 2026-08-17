import { PlatformShell, type Language } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BookOpenCheck, CircleAlert, FileQuestion, Play, ShieldCheck, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function ExamLabPage({ language, onLanguageChange }: { language: Language; onLanguageChange: (value: Language) => void }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const [, setLocation] = useLocation();
  const availability = trpc.learning.publishedContentAvailability.useQuery();
  const count = availability.data?.publishedQuestionCount ?? 0;

  return <PlatformShell language={language} onLanguageChange={onLanguageChange}>
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <aside className="rounded-[28px] bg-[#071d33] p-7 text-white">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#16b89b] text-[#071d33]"><Sparkles /></span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#7ce3d1]">MCQ GURU PRACTICE LAB</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">{copy("Only real, source-linked practice.", "শুধু আসল, সোর্স-লিংকড প্র্যাকটিস।")}</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">{copy("This workspace reads the current student-releasable question bank. It never substitutes sample scores, simulated questions, or invented progress for your learning record.", "এই ওয়ার্কস্পেস বর্তমান শিক্ষার্থী-রিলিজযোগ্য প্রশ্ন ব্যাংক পড়ে। এটি কখনো তোমার লার্নিং রেকর্ডের বদলে স্যাম্পল স্কোর, সিমুলেটেড প্রশ্ন বা কৃত্রিম প্রগ্রেস দেখায় না।")}</p>
          <div className="mt-7 rounded-2xl border border-[#7ce3d1]/20 bg-[#16b89b]/10 p-4 text-xs leading-5 text-slate-200"><ShieldCheck className="mr-1 inline text-[#7ce3d1]" size={14} />{copy("Every published question has completed human approval and a final source-evidence release check.", "প্রতিটি প্রকাশিত প্রশ্ন হিউম্যান অনুমোদন ও চূড়ান্ত সোর্স-এভিডেন্স রিলিজ চেক সম্পন্ন করেছে।")}</div>
        </aside>
        <section className="rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#088a78]">{copy("LIVE AVAILABILITY", "লাইভ অ্যাভেইলেবিলিটি")}</p>
          <h2 className="mt-2 font-display text-2xl font-extrabold text-[#071d33]">{availability.isLoading ? copy("Checking the published question bank…", "প্রকাশিত প্রশ্ন ব্যাংক যাচাই হচ্ছে…") : count ? copy("Approved questions are ready for practice.", "অনুমোদিত প্রশ্ন প্র্যাকটিসের জন্য প্রস্তুত।") : copy("Practice opens when reviewed questions are published.", "রিভিউ করা প্রশ্ন প্রকাশিত হলেই প্র্যাকটিস চালু হবে।")}</h2>
          {availability.isLoading ? <div className="mt-8 h-32 animate-pulse rounded-2xl bg-slate-100" /> : count ? <PublishedReady count={count} subjects={availability.data?.subjects ?? []} copy={copy} onStart={() => setLocation("/live-exam")} /> : <NoContent copy={copy} onNotices={() => setLocation("/notices")} />}
        </section>
      </div>
    </div>
  </PlatformShell>;
}

function PublishedReady({ count, subjects, copy, onStart }: { count: number; subjects: Array<{ subjectId: number; name: string; questionCount: number }>; copy: (en: string, bn: string) => string; onStart: () => void }) { return <><div className="mt-8 grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl bg-[#effcf9] p-5"><span className="grid size-12 place-items-center rounded-2xl bg-[#16b89b] text-[#071d33]"><BookOpenCheck /></span><div><p className="text-3xl font-extrabold text-[#071d33]">{count}</p><p className="text-sm text-[#165e54]">{copy("published, source-linked questions", "প্রকাশিত, সোর্স-লিংকড প্রশ্ন")}</p></div></div><div className="mt-6 flex flex-wrap gap-2">{subjects.map(subject => <span key={subject.subjectId} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{subject.name} · {subject.questionCount}</span>)}</div><Button onClick={onStart} className="mt-8 h-12 w-full rounded-xl bg-[#071d33]"><Play size={16} fill="currentColor" />{copy("Start approved practice", "অনুমোদিত প্র্যাকটিস শুরু করো")}</Button><p className="mt-3 flex items-center gap-2 text-xs leading-5 text-slate-500"><FileQuestion size={14} className="shrink-0 text-[#088a78]" />{copy("Your attempt will be frozen and scored on the server. Answers and results become part of your real learning history.", "তোমার অ্যাটেম্পট সার্ভারে ফ্রিজ ও স্কোর করা হবে। উত্তর ও ফলাফল তোমার আসল লার্নিং হিস্ট্রির অংশ হবে।")}</p></>; }
function NoContent({ copy, onNotices }: { copy: (en: string, bn: string) => string; onNotices: () => void }) { return <><div className="mt-8 rounded-2xl border border-[#f2d8b3] bg-[#fffaf0] p-5"><CircleAlert className="text-[#b86b09]" size={22} /><p className="mt-3 text-sm font-bold text-[#784512]">{copy("No published questions are available yet", "এখনো কোনো প্রকাশিত প্রশ্ন পাওয়া যাচ্ছে না")}</p><p className="mt-2 text-sm leading-6 text-[#8b642f]">{copy("Content reviewers are required to map each question to an active source version, verify its answer, approve it, and publish it deliberately. This prevents a practice session from pretending to be real before its content is ready.", "কনটেন্ট রিভিউয়ারদের প্রতিটি প্রশ্ন অ্যাকটিভ সোর্স ভার্সনে ম্যাপ করতে, উত্তর যাচাই করতে, অনুমোদন দিতে এবং সচেতনভাবে প্রকাশ করতে হয়। কনটেন্ট প্রস্তুত হওয়ার আগেই প্র্যাকটিস সেশনকে আসল বলে দেখানো থেকে এটি বিরত রাখে।")}</p></div><Button variant="outline" onClick={onNotices} className="mt-7 h-11 w-full rounded-xl"><FileQuestion size={16} />{copy("See official notices while you wait", "অপেক্ষার সময় অফিসিয়াল নোটিশ দেখো")}</Button></>; }
