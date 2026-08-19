import { AIChatBox, type Message } from "@/components/AIChatBox";
import { PlatformShell, type Language } from "@/components/PlatformShell";
import { trpc } from "@/lib/trpc";
import { Bot, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function TutorPage({ language, onLanguageChange }: { language: Language; onLanguageChange: (value: Language) => void }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const profile = trpc.learning.profile.useQuery();
  const [messages, setMessages] = useState<Message[]>([]);
  const ask = trpc.learning.askTutor.useMutation({
    onSuccess: result => setMessages(current => [...current, { role: "assistant", content: `${result.answer}${result.sources.length ? `\n\n${copy("Approved references", "অনুমোদিত রেফারেন্স")}:\n${result.sources.map(source => `• ${source.book} — ${source.chapter} (${source.page})`).join("\n")}` : ""}` }]),
    onError: error => setMessages(current => [...current, { role: "assistant", content: error.message }]),
  });
  const send = (question: string) => { setMessages(current => [...current, { role: "user", content: question }]); ask.mutate({ question, academicYear: profile.data?.academicYear ?? "2025-26", language }); };
  return <PlatformShell language={language} onLanguageChange={onLanguageChange}><div className="mx-auto max-w-5xl"><section className="rounded-[28px] bg-[#071d33] p-6 text-white sm:p-8"><div className="flex gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#16b89b] text-[#071d33]"><Bot /></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#7ce3d1]">{copy("GROUNDED AI TUTOR", "সোর্স-ভিত্তিক এআই টিউটর")}</p><h1 className="mt-2 font-display text-3xl font-extrabold">{copy("Ask from approved learning evidence.", "অনুমোদিত লার্নিং প্রমাণ থেকে জিজ্ঞেস করো।")}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{copy("The tutor answers only when relevant approved excerpts are available. It will say when the source record cannot support an answer rather than guessing.", "প্রাসঙ্গিক অনুমোদিত উদ্ধৃতি থাকলেই টিউটর উত্তর দেয়। সোর্স রেকর্ডে উত্তর সমর্থন না থাকলে অনুমান না করে তা জানায়।")}</p></div></div></section><section className="mt-6 overflow-hidden rounded-[24px] bg-white shadow-sm"><div className="flex gap-2 border-b border-slate-100 px-5 py-4 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 shrink-0 text-[#088a78]" size={16} />{copy("Use a chapter concept, problem, or source-linked question. General questions without approved evidence may not receive a factual answer.", "অধ্যায়ের ধারণা, সমস্যা বা সোর্স-লিংকড প্রশ্ন ব্যবহার করো। অনুমোদিত প্রমাণ ছাড়া সাধারণ প্রশ্নের তথ্যভিত্তিক উত্তর নাও আসতে পারে।")}</div><AIChatBox messages={messages} onSendMessage={send} isLoading={ask.isPending} height="560px" placeholder={copy("Ask an HSC concept…", "এইচএসসির কোনো ধারণা জিজ্ঞেস করো…")} emptyStateMessage={copy("Ask a source-grounded question", "সোর্স-ভিত্তিক প্রশ্ন করো")} suggestedPrompts={language === "bn" ? ["ওহমের সূত্রটি সহজভাবে ব্যাখ্যা করো", "pH 7 কেন নিরপেক্ষ?", "বাইনারি সংখ্যা কী?"] : ["Explain Ohm's law simply", "Why is pH 7 neutral?", "What is a binary number?"]} /></section></div></PlatformShell>;
}
