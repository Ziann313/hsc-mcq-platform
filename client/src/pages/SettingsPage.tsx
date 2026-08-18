import { PlatformShell, type Language } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { BellRing, BookOpen, Check, CircleAlert, GraduationCap, Landmark, ShieldCheck, SlidersHorizontal, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type NotificationDraft = {
  studyEnabled: boolean;
  dailyChallengeEnabled: boolean;
  admissionEnabled: boolean;
  contentEnabled: boolean;
};

const fallbackPreferences: NotificationDraft = {
  studyEnabled: true,
  dailyChallengeEnabled: false,
  admissionEnabled: true,
  contentEnabled: true,
};

export default function SettingsPage({ language, onLanguageChange }: { language: Language; onLanguageChange: (value: Language) => void }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const profile = trpc.learning.profile.useQuery(undefined, { enabled: isAuthenticated });
  const preferences = trpc.learning.notificationPreferences.useQuery(undefined, { enabled: isAuthenticated });
  const [draft, setDraft] = useState<NotificationDraft>(fallbackPreferences);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (preferences.data) {
      setDraft({
        studyEnabled: preferences.data.studyEnabled,
        dailyChallengeEnabled: preferences.data.dailyChallengeEnabled,
        admissionEnabled: preferences.data.admissionEnabled,
        contentEnabled: preferences.data.contentEnabled,
      });
    }
  }, [preferences.data]);

  const hasChanges = useMemo(() => {
    const saved = preferences.data ?? fallbackPreferences;
    return draft.studyEnabled !== saved.studyEnabled
      || draft.dailyChallengeEnabled !== saved.dailyChallengeEnabled
      || draft.admissionEnabled !== saved.admissionEnabled
      || draft.contentEnabled !== saved.contentEnabled;
  }, [draft, preferences.data]);

  const savePreferences = trpc.learning.updateNotificationPreferences.useMutation({
    onSuccess: async () => {
      await utils.learning.notificationPreferences.invalidate();
      toast.success(copy("Notification preferences saved", "নোটিফিকেশন পছন্দ সংরক্ষণ হয়েছে"));
    },
    onError: error => toast.error(error.message),
  });

  if (loading) return <PlatformShell language={language} onLanguageChange={onLanguageChange}><div className="h-96 animate-pulse rounded-[28px] bg-white" /></PlatformShell>;

  if (!isAuthenticated) {
    return <PlatformShell language={language} onLanguageChange={onLanguageChange}><div className="grid min-h-[520px] place-items-center rounded-[28px] bg-white p-8 text-center shadow-sm"><div className="max-w-lg"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e9fbf7] text-[#088a78]"><SlidersHorizontal /></span><p className="mt-5 text-xs font-bold uppercase tracking-[.16em] text-[#088a78]">{copy("MCQ GURU SETTINGS", "এমসিকিউ গুরু সেটিংস")}</p><h1 className="mt-2 font-display text-2xl font-extrabold text-[#071d33]">{copy("Keep your study settings private and personal.", "তোমার স্টাডি সেটিংস ব্যক্তিগত ও নিরাপদ রাখো।")}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{copy("Sign in securely to manage your profile and choose the categories of in-app updates you want to receive.", "প্রোফাইল ম্যানেজ করতে এবং কোন ক্যাটাগরির ইন-অ্যাপ আপডেট পাবে তা বেছে নিতে নিরাপদে সাইন ইন করো।")}</p><Button onClick={() => startLogin()} className="mt-6 h-11 rounded-xl bg-[#071d33]"><GraduationCap size={16} />{copy("Continue to secure sign-in", "নিরাপদ সাইন-ইন চালিয়ে যাও")}</Button></div></div></PlatformShell>;
  }

  const preferenceRows: Array<{ key: keyof NotificationDraft; icon: typeof BookOpen; title: string; titleBn: string; detail: string; detailBn: string }> = [
    { key: "studyEnabled", icon: BookOpen, title: "Study updates", titleBn: "স্টাডি আপডেট", detail: "Practice readiness, review reminders, and study-plan updates.", detailBn: "প্র্যাকটিস প্রস্তুতি, রিভিউ রিমাইন্ডার ও স্টাডি প্ল্যান আপডেট।" },
    { key: "dailyChallengeEnabled", icon: BellRing, title: "Daily challenge alerts", titleBn: "ডেইলি চ্যালেঞ্জ অ্যালার্ট", detail: "Receive an optional in-app alert when a newly scheduled daily challenge opens.", detailBn: "নতুন শিডিউল করা ডেইলি চ্যালেঞ্জ শুরু হলে ঐচ্ছিক ইন-অ্যাপ অ্যালার্ট পাও।" },
    { key: "admissionEnabled", icon: Landmark, title: "Admission notices", titleBn: "ভর্তি নোটিশ", detail: "Published official admission updates that apply to your account.", detailBn: "তোমার অ্যাকাউন্টে প্রযোজ্য প্রকাশিত অফিসিয়াল ভর্তি আপডেট।" },
    { key: "contentEnabled", icon: BellRing, title: "Content updates", titleBn: "কনটেন্ট আপডেট", detail: "New approved question sets, cheat sheets, and reviewed learning content.", detailBn: "নতুন অনুমোদিত প্রশ্নসেট, চিট শিট ও রিভিউ করা লার্নিং কনটেন্ট।" },
  ];

  return <PlatformShell language={language} onLanguageChange={onLanguageChange}><div className="mx-auto max-w-5xl"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#088a78]">{copy("ACCOUNT SETTINGS", "অ্যাকাউন্ট সেটিংস")}</p><h1 className="mt-1 font-display text-2xl font-extrabold text-[#071d33]">{copy("Your preferences, your learning space", "তোমার পছন্দ, তোমার লার্নিং স্পেস")}</h1><p className="mt-2 text-sm text-slate-500">{copy("Update only settings that belong to your verified account.", "শুধু তোমার যাচাইকৃত অ্যাকাউন্টের সেটিংস আপডেট করো।")}</p></div><span className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#e9fbf7] px-3 py-2 text-xs font-bold text-[#087b6c]"><ShieldCheck size={14} />{copy("Private to your account", "তোমার অ্যাকাউন্টের জন্য ব্যক্তিগত")}</span></div>

    <div className="mt-6 grid gap-6 lg:grid-cols-[.7fr_1.3fr]"><aside className="rounded-[24px] bg-[#071d33] p-6 text-white"><span className="grid size-14 place-items-center rounded-2xl bg-[#16b89b] text-lg font-extrabold text-[#071d33]">{(user?.name ?? "MC").slice(0, 2).toUpperCase()}</span><h2 className="mt-5 font-display text-xl font-extrabold">{user?.name ?? copy("Student", "শিক্ষার্থী")}</h2><p className="mt-1 break-all text-sm text-slate-300">{user?.email ?? copy("Secure student account", "নিরাপদ শিক্ষার্থী অ্যাকাউন্ট")}</p><div className="mt-7 rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#7ce3d1]">{copy("LEARNING PROFILE", "লার্নিং প্রোফাইল")}</p><p className="mt-3 text-sm text-slate-200">{profile.data ? `${profile.data.academicYear} · ${profile.data.institution ?? copy("Institution not set", "প্রতিষ্ঠান সেট করা হয়নি")}` : copy("Complete onboarding to personalize your learning context.", "লার্নিং কনটেক্সট ব্যক্তিগত করতে অনবোর্ডিং সম্পন্ন করো।")}</p><Button onClick={() => navigate("/profile")} variant="outline" className="mt-4 h-10 w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"><UserRound size={15} />{copy("Manage profile", "প্রোফাইল ম্যানেজ করো")}</Button></div><div className="mt-5 flex items-start gap-3 text-xs leading-5 text-slate-300"><ShieldCheck className="mt-0.5 shrink-0 text-[#7ce3d1]" size={15} />{copy("Security and critical account messages stay on so you do not miss essential updates.", "জরুরি আপডেট মিস না করতে সিকিউরিটি ও ক্রিটিক্যাল অ্যাকাউন্ট মেসেজ চালু থাকে।")}</div></aside>

      <section className="rounded-[24px] bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#e9fbf7] text-[#088a78]"><BellRing size={19} /></span><div><h2 className="font-display text-lg font-extrabold text-[#071d33]">{copy("In-app notification preferences", "ইন-অ্যাপ নোটিফিকেশন পছন্দ")}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{copy("Choose the non-critical update categories you want MCQ GURU to save for your account.", "কোন নন-ক্রিটিক্যাল আপডেট MCQ GURU তোমার অ্যাকাউন্টে সেভ করবে তা বেছে নাও।")}</p></div></div>{preferences.isError ? <div className="mt-6 rounded-2xl bg-[#fff5e4] p-4 text-sm leading-6 text-[#86520b]"><CircleAlert className="mr-2 inline" size={16} />{copy("Preferences could not be loaded. Please retry.", "পছন্দ লোড করা যায়নি। আবার চেষ্টা করো।")}</div> : <div className="mt-6 space-y-3">{preferenceRows.map(row => { const Icon = row.icon; return <label key={row.key} className="flex cursor-pointer items-start gap-4 rounded-2xl border border-slate-100 p-4 transition hover:border-[#bdeadd]"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f4f7f7] text-[#087b6c]"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-[#071d33]">{copy(row.title, row.titleBn)}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{copy(row.detail, row.detailBn)}</span></span><Switch checked={draft[row.key]} onCheckedChange={checked => setDraft(current => ({ ...current, [row.key]: checked }))} aria-label={copy(`Enable ${row.title}`, `${row.titleBn} চালু করো`)} className="mt-1 data-[state=checked]:bg-[#16b89b]" /></label>; })}</div>}<div className="mt-5 rounded-2xl border border-[#bdeadd] bg-[#effcf9] p-4 text-xs leading-5 text-[#165e54]"><ShieldCheck className="mr-2 inline text-[#088a78]" size={15} /><b>{copy("Always on: ", "সবসময় চালু: ")}</b>{copy("critical account and system notices are never disabled by these switches.", "ক্রিটিক্যাল অ্যাকাউন্ট ও সিস্টেম নোটিশ এই সুইচ দিয়ে বন্ধ করা যায় না।")}</div><div className="mt-6 flex flex-wrap gap-3"><Button disabled={preferences.isLoading || savePreferences.isPending || !hasChanges} onClick={() => savePreferences.mutate(draft)} className="h-11 rounded-xl bg-[#071d33]"><Check size={16} />{savePreferences.isPending ? copy("Saving…", "সেভ হচ্ছে…") : copy("Save notification preferences", "নোটিফিকেশন পছন্দ সেভ করো")}</Button><Button onClick={() => navigate("/notifications")} variant="outline" className="h-11 rounded-xl border-slate-200"><BellRing size={16} />{copy("View notifications", "নোটিফিকেশন দেখো")}</Button></div></section></div></div></PlatformShell>;
}
