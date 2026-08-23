import {
  BarChart3,
  Banknote,
  Bell,
  BookOpen,
  Bot,
  Camera,
  Brain,
  ChevronRight,
  ClipboardCheck,
  Flame,
  FileText,
  GraduationCap,
  Home,
  LockKeyhole,
  Landmark,
  Menu,
  Settings,
  Target,
  UserRound,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { isAdministratorRole } from "@shared/authorization";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

const DailyChallengeBrowserAlert = lazy(() => import("@/components/DailyChallengeBrowserAlert").then(module => ({ default: module.DailyChallengeBrowserAlert })));

export type Language = "bn" | "en";

export type NavigationItem = {
  path: string;
  label: string;
  bn: string;
  icon: typeof Home;
};

export const studentNavigationItems: NavigationItem[] = [
  { path: "/dashboard", label: "Home", bn: "হোম", icon: Home },
  { path: "/practice", label: "Daily study", bn: "দৈনিক পড়া", icon: BookOpen },
  { path: "/exams", label: "Mock exams", bn: "মক এক্সাম", icon: ClipboardCheck },
  { path: "/admission", label: "Admission prep", bn: "ভর্তি প্রস্তুতি", icon: Landmark },
  { path: "/tutor", label: "AI Tutor", bn: "এআই টিউটর", icon: Bot },
  { path: "/live-exams", label: "Live exams", bn: "লাইভ এক্সাম", icon: Flame },
  { path: "/leaderboard", label: "Leaderboard", bn: "লিডারবোর্ড", icon: BarChart3 },
  { path: "/cheat-sheets", label: "Cheat sheets", bn: "চিট শিট", icon: FileText },
  { path: "/mistake-vault", label: "Mistake Vault", bn: "মিসটেক ভল্ট", icon: Brain },
  { path: "/community", label: "Doubts", bn: "ডাউটস", icon: Bot },
  { path: "/image-solver", label: "Image solver", bn: "ইমেজ সলভার", icon: Camera },
  { path: "/notices", label: "Official notices", bn: "অফিসিয়াল নোটিশ", icon: Bell },
  { path: "/progress", label: "Progress", bn: "অগ্রগতি", icon: BarChart3 },
  { path: "/exam-history", label: "Exam history", bn: "এক্সাম হিস্ট্রি", icon: ClipboardCheck },
  { path: "/historical-analysis", label: "Historical analysis", bn: "ঐতিহাসিক বিশ্লেষণ", icon: Landmark },
];

export const adminNavigationItems: NavigationItem[] = [
  { path: "/admin", label: "Review queue", bn: "রিভিউ কিউ", icon: ClipboardCheck },
  { path: "/admin/analytics", label: "Platform analytics", bn: "প্ল্যাটফর্ম অ্যানালিটিক্স", icon: BarChart3 },
  { path: "/admin/payments", label: "Payment reconciliation", bn: "পেমেন্ট রিকনসিলিয়েশন", icon: Banknote },
  { path: "/governance", label: "Content workspace", bn: "কনটেন্ট ওয়ার্কস্পেস", icon: LockKeyhole },
  { path: "/import", label: "Bulk import", bn: "বাল্ক ইমপোর্ট", icon: Upload },
  { path: "/questions/new", label: "Question intake", bn: "প্রশ্ন ইনটেক", icon: BookOpen },
  { path: "/admission-patterns", label: "Admission patterns", bn: "ভর্তি প্যাটার্ন", icon: FileText },
  { path: "/historical-import", label: "Historical imports", bn: "ঐতিহাসিক ইমপোর্ট", icon: Upload },
  { path: "/ai-generation", label: "AI generation review", bn: "এআই জেনারেশন রিভিউ", icon: Bot },
];

export function canAccessGovernance(role?: string) {
  return isAdministratorRole(role);
}

export function visibleNavigationItems(role?: string) {
  return canAccessGovernance(role)
    ? [...studentNavigationItems, ...adminNavigationItems]
    : studentNavigationItems;
}

const mobileItems = [
  studentNavigationItems[0],
  studentNavigationItems[1],
  studentNavigationItems[3],
  studentNavigationItems[12],
  { path: "/profile", label: "Profile", bn: "প্রোফাইল", icon: UserRound },
];

export function PlatformShell({ children, language, onLanguageChange }: { children: React.ReactNode; language: Language; onLanguageChange: (value: Language) => void }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, loading } = useAuth();
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const navItems = visibleNavigationItems(user?.role);
  const initials = (user?.name ?? "").slice(0, 2).toUpperCase() || "MC";
  const identityLabel = isAuthenticated ? (user?.name ?? copy("Student", "শিক্ষার্থী")) : copy("Sign in", "সাইন ইন");

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileOpen]);

  const navigate = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f7] text-slate-900"><a href="#main-content" className="sr-only fixed left-4 top-4 z-[60] rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#071d33] shadow-lg focus:not-sr-only">{copy("Skip to main content", "মূল কনটেন্টে যাও")}</a>{isAuthenticated && <Suspense fallback={null}><DailyChallengeBrowserAlert /></Suspense>}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-[#071d33] px-4 py-5 text-slate-100 lg:flex">
        <button className="mb-8 flex items-center gap-3 px-2 text-left" onClick={() => navigate("/")}>
          <span className="grid size-10 place-items-center rounded-2xl bg-[#16b89b] shadow-[0_8px_24px_rgba(22,184,155,.25)]"><GraduationCap size={22} /></span>
          <span><b className="block font-display text-xl tracking-tight">MCQ GURU</b><span className="text-xs text-slate-400">Learn. Practice. Rise.</span></span>
        </button>
        <button onClick={() => navigate(isAuthenticated ? "/progress" : "/profile")} className="mb-5 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:bg-white/10">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7ce3d1]"><Flame size={14} /> {isAuthenticated ? copy("Open your real learning progress", "আসল লার্নিং অগ্রগতি দেখো") : copy("Sign in to track your learning", "লার্নিং ট্র্যাক করতে সাইন ইন করো")}</div>
          <p className="mt-2 text-[11px] leading-4 text-slate-400">{isAuthenticated ? copy("Accuracy, attempts, and weak areas use persisted activity.", "নির্ভুলতা, অ্যাটেম্পট ও দুর্বল অংশ সংরক্ষিত অ্যাক্টিভিটি থেকে আসে।") : copy("No personal progress is shown before secure sign-in.", "নিরাপদ সাইন-ইনের আগে কোনো ব্যক্তিগত অগ্রগতি দেখানো হয় না।")}</p>
        </button>
        <nav className="flex-1 space-y-1">
          {navItems.map(item => {
            const active = location === item.path;
            const Icon = item.icon;
            const utilityStart = item.path === "/live-exams";
            const managementStart = item.path === "/admin";
            return <div key={item.path}>{utilityStart && <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">{copy("Learning tools", "লার্নিং টুলস")}</p>}{managementStart && <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">{copy("Management", "ম্যানেজমেন্ট")}</p>}<button onClick={() => navigate(item.path)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[#16b89b] font-semibold text-[#04131f] shadow-lg shadow-[#16b89b]/15" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}><Icon size={18} /><span>{copy(item.label, item.bn)}</span>{active && <ChevronRight className="ml-auto" size={15} />}</button></div>;
          })}
        </nav>
        <div className="space-y-1 border-t border-white/10 pt-4">
          <button onClick={() => navigate("/profile")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/8"><UserRound size={18} />{isAuthenticated ? copy("My profile", "আমার প্রোফাইল") : copy("Secure sign-in", "নিরাপদ সাইন-ইন")}</button>
          {isAuthenticated && <button onClick={() => navigate("/settings")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/8"><Settings size={18} />{copy("Settings", "সেটিংস")}</button>}
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex h-[74px] min-w-0 items-center justify-between border-b border-slate-200/80 bg-[#f4f7f7] px-4 sm:px-7 lg:bg-[#f4f7f7]/85 lg:px-10 lg:backdrop-blur-lg">
          <div className="flex min-w-0 items-center gap-3 lg:hidden">
            <button aria-label={copy("Open navigation menu", "নেভিগেশন মেনু খোলো")} onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-xl bg-white text-[#071d33] shadow-sm"><Menu size={20} /></button>
            <span className="mcq-intentional-truncate font-display text-xl font-bold text-[#071d33]">MCQ GURU</span>
          </div>
          <div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#168f80]">{copy("Your learning space", "তোমার লার্নিং স্পেস")}</p><p className="text-sm text-slate-500">{copy("HSC & admission preparation", "এইচএসসি ও ভর্তি প্রস্তুতি")}</p></div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200"><button aria-label={copy("Switch language to Bangla", "ভাষা বাংলা করো")} onClick={() => onLanguageChange("bn")} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${language === "bn" ? "bg-[#071d33] text-white" : "text-slate-500"}`}>বাং</button><button aria-label={copy("Switch language to English", "ভাষা ইংরেজি করো")} onClick={() => onLanguageChange("en")} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${language === "en" ? "bg-[#071d33] text-white" : "text-slate-500"}`}>EN</button></div>
            {isAuthenticated && <button aria-label={copy("Open notifications", "নোটিফিকেশন খোলো")} onClick={() => navigate("/notifications")} className="relative grid size-10 place-items-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200"><Bell size={18} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#f59e0b]" /></button>}
            <button disabled={loading} onClick={() => navigate("/profile")} className="hidden items-center gap-2 rounded-xl bg-white py-1.5 pl-1.5 pr-3 shadow-sm ring-1 ring-slate-200 disabled:opacity-60 sm:flex"><span className="grid size-8 place-items-center rounded-lg bg-[#dff8f1] text-xs font-bold text-[#087b6c]">{initials}</span><span className="text-sm font-semibold text-slate-700">{loading ? copy("Loading", "লোড হচ্ছে") : identityLabel}</span></button>
          </div>
        </header>
        <main id="main-content" className="mcq-content-wrapper mx-auto w-full max-w-[1480px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6 sm:px-7 lg:px-10 lg:pb-10">{isAuthenticated && <SubscriptionBanner language={language} />}{children}</main>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-50 touch-none lg:hidden"><button type="button" aria-label={copy("Close menu", "মেনু বন্ধ করো")} onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-[#071d33]/50" /><aside className="relative flex h-full w-[82%] max-w-[330px] touch-pan-y flex-col overflow-y-auto bg-[#071d33] px-4 py-5 text-slate-100 shadow-2xl"><div className="mb-7 flex items-center justify-between"><button type="button" onClick={() => navigate("/")} className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#16b89b]"><GraduationCap size={22} /></span><b className="font-display text-xl">MCQ GURU</b></button><button type="button" aria-label={copy("Close menu", "মেনু বন্ধ করো")} onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-slate-300"><X /></button></div><nav className="space-y-1">{navItems.map(item => { const Icon = item.icon; return <button type="button" key={item.path} onClick={() => navigate(item.path)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${location === item.path ? "bg-[#16b89b] font-semibold text-[#04131f]" : "text-slate-200"}`}><Icon size={18} />{copy(item.label, item.bn)}</button>; })}</nav><button type="button" onClick={() => navigate("/profile")} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-white/10 px-3 py-3 text-left text-slate-200"><UserRound size={18} />{isAuthenticated ? copy("My profile", "আমার প্রোফাইল") : copy("Secure sign-in", "নিরাপদ সাইন-ইন")}</button></aside></div>}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">{mobileItems.map(item => { const Icon = item.icon; const active = location === item.path; return <button type="button" key={item.path} onClick={() => navigate(item.path)} className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-semibold ${active ? "text-[#088a78]" : "text-slate-400"}`}><Icon size={19} strokeWidth={active ? 2.5 : 2} />{copy(item.label, item.bn)}</button>; })}</nav>
    </div>
  );
}
