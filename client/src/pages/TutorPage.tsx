import { AIChatBox, type Message } from "@/components/AIChatBox";
import { PlatformShell, type Language } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Bot, MessageSquarePlus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

type ConversationMessage = { role: "user" | "assistant"; content: string };

function conversationTitle(question: string) {
  const normalized = question.replace(/\s+/g, " ").trim();
  return normalized.length > 72 ? `${normalized.slice(0, 69)}…` : normalized;
}

export default function TutorPage({ language, onLanguageChange }: { language: Language; onLanguageChange: (value: Language) => void }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const utils = trpc.useUtils();
  const profile = trpc.learning.profile.useQuery();
  const history = trpc.learning.tutorConversationHistory.useQuery();
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const conversation = trpc.learning.tutorConversationMessages.useQuery({ conversationId: conversationId ?? 0 }, { enabled: conversationId !== null, retry: false });
  const save = trpc.learning.saveTutorConversation.useMutation({
    onSuccess: result => {
      if (!conversationId) setConversationId(result.conversationId);
      utils.learning.tutorConversationHistory.invalidate();
    },
  });
  const ask = trpc.learning.askTutor.useMutation({
    onSuccess: result => {
      const answer = `${result.answer}${result.sources.length ? `\n\n${copy("Approved references", "অনুমোদিত রেফারেন্স")}:\n${result.sources.map(source => `• ${source.book} — ${source.chapter} (${source.page})`).join("\n")}` : ""}`;
      setMessages(current => {
        const next = [...current, { role: "assistant" as const, content: answer }];
        const lastQuestion = [...next].reverse().find(message => message.role === "user")?.content;
        if (lastQuestion) save.mutate({ conversationId: conversationId ?? undefined, title: conversationTitle(lastQuestion), messages: next.slice(-2) });
        return next;
      });
    },
    onError: error => setMessages(current => [...current, { role: "assistant", content: error.message }]),
  });

  useEffect(() => {
    if (!conversation.data) return;
    setMessages(conversation.data.messages.map(message => ({ role: message.role, content: message.content })));
  }, [conversation.data]);

  const startNew = () => { setConversationId(null); setMessages([]); };
  const selectConversation = (id: number) => { setConversationId(id); setMessages([]); };
  const send = (question: string) => {
    setMessages(current => [...current, { role: "user", content: question }]);
    ask.mutate({ question, academicYear: profile.data?.academicYear ?? "2025-26", language });
  };

  return <PlatformShell language={language} onLanguageChange={onLanguageChange}><div className="mx-auto max-w-6xl"><section className="rounded-[28px] bg-[#071d33] p-6 text-white sm:p-8"><div className="flex gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#16b89b] text-[#071d33]"><Bot /></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#7ce3d1]">{copy("GROUNDED AI TUTOR", "সোর্স-ভিত্তিক এআই টিউটর")}</p><h1 className="mt-2 font-display text-3xl font-extrabold">{copy("Ask from approved learning evidence.", "অনুমোদিত লার্নিং প্রমাণ থেকে জিজ্ঞেস করো।")}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{copy("The tutor answers only when relevant approved excerpts are available. Your saved conversations are private to your account.", "প্রাসঙ্গিক অনুমোদিত উদ্ধৃতি থাকলেই টিউটর উত্তর দেয়। তোমার সংরক্ষিত কথোপকথন শুধু তোমার অ্যাকাউন্টেই ব্যক্তিগত থাকে।")}</p></div></div></section><section className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]"><aside className="rounded-[24px] bg-white p-4 shadow-sm"><Button onClick={startNew} className="h-11 w-full rounded-xl bg-[#071d33]"><MessageSquarePlus size={16} />{copy("New conversation", "নতুন কথোপকথন")}</Button><div className="mt-5"><p className="px-1 text-xs font-bold uppercase tracking-[.12em] text-slate-400">{copy("SAVED CONVERSATIONS", "সংরক্ষিত কথোপকথন")}</p><div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1 lg:max-h-[480px]">{history.isLoading ? <div className="space-y-2"><div className="h-14 animate-pulse rounded-xl bg-slate-100" /><div className="h-14 animate-pulse rounded-xl bg-slate-100" /></div> : history.data?.length ? history.data.map(item => <button key={item.id} type="button" onClick={() => selectConversation(item.id)} className={`w-full rounded-xl p-3 text-left transition-colors ${conversationId === item.id ? "bg-[#e9fbf7] text-[#075f53]" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}><p className="line-clamp-1 text-sm font-bold">{item.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 opacity-75">{item.lastMessagePreview || copy("No saved reply yet", "এখনও কোনো সংরক্ষিত উত্তর নেই")}</p></button>) : <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">{copy("Your source-grounded conversations will appear here after a reply is saved.", "সোর্স-ভিত্তিক কথোপকথনগুলো উত্তর সংরক্ষিত হওয়ার পর এখানে দেখা যাবে।")}</p>}</div></div></aside><section className="overflow-hidden rounded-[24px] bg-white shadow-sm"><div className="flex gap-2 border-b border-slate-100 px-5 py-4 text-xs leading-5 text-slate-500"><ShieldCheck className="mt-0.5 shrink-0 text-[#088a78]" size={16} />{copy("Use a chapter concept, problem, or source-linked question. General questions without approved evidence may not receive a factual answer.", "অধ্যায়ের ধারণা, সমস্যা বা সোর্স-লিংকড প্রশ্ন ব্যবহার করো। অনুমোদিত প্রমাণ ছাড়া সাধারণ প্রশ্নের তথ্যভিত্তিক উত্তর নাও আসতে পারে।")}</div>{conversation.isLoading ? <div className="h-[560px] animate-pulse bg-slate-50" /> : <AIChatBox messages={messages} onSendMessage={send} isLoading={ask.isPending || save.isPending} height="560px" placeholder={copy("Ask an HSC concept…", "এইচএসসির কোনো ধারণা জিজ্ঞেস করো…")} emptyStateMessage={copy("Ask a source-grounded question", "সোর্স-ভিত্তিক প্রশ্ন করো")} typingMessage={copy("MCQ GURU is typing…", "এমসিকিউ গুরু লিখছে…")} suggestedPrompts={language === "bn" ? ["ওহমের সূত্রটি সহজভাবে ব্যাখ্যা করো", "pH 7 কেন নিরপেক্ষ?", "বাইনারি সংখ্যা কী?"] : ["Explain Ohm's law simply", "Why is pH 7 neutral?", "What is a binary number?"]} />}</section></section></div></PlatformShell>;
}
