import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Camera,
  Brain,
  Bookmark,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Flame,
  FileText,
  GraduationCap,
  Home,
  LockKeyhole,
  Menu,
  Settings,
  Target,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

export type Language = "bn" | "en";

const items = [
  { path: "/", label: "Home", bn: "হোম", icon: Home },
  { path: "/practice", label: "Practice", bn: "প্র্যাকটিস", icon: BookOpen },
  { path: "/exams", label: "Exams", bn: "পরীক্ষা", icon: ClipboardCheck },
  { path: "/mcq-lab", label: "Exam Lab", bn: "এক্সাম ল্যাব", icon: Target },
  { path: "/live-exam", label: "Question bank", bn: "প্রশ্ন ব্যাংক", icon: ClipboardCheck },
  { path: "/leaderboard", label: "Leaderboard", bn: "লিডারবোর্ড", icon: BarChart3 },
  { path: "/cheat-sheets", label: "Cheat sheets", bn: "চিট শিট", icon: FileText },
  { path: "/mistake-vault", label: "Mistake Vault", bn: "মিসটেক ভল্ট", icon: Brain },
  { path: "/community", label: "Doubts", bn: "ডাউটস", icon: Bot },
  { path: "/import", label: "Bulk import", bn: "বাল্ক ইমপোর্ট", icon: BookOpen },
  { path: "/tutor", label: "AI Tutor", bn: "এআই টিউটর", icon: Bot },
  { path: "/image-solver", label: "Image solver", bn: "ইমেজ সলভার", icon: Camera },
  { path: "/notices", label: "Official notices", bn: "অফিসিয়াল নোটিশ", icon: Bell },
  { path: "/questions/new", label: "Question intake", bn: "প্রশ্ন ইনটেক", icon: BookOpen },
  { path: "/admission-patterns", label: "Admission patterns", bn: "ভর্তি প্যাটার্ন", icon: FileText },
  { path: "/progress", label: "Progress", bn: "অগ্রগতি", icon: BarChart3 },
  { path: "/study-plan", label: "Study Plan", bn: "স্টাডি প্ল্যান", icon: CalendarDays },
  { path: "/mistakes", label: "Mistakes", bn: "ভুলের খাতা", icon: Brain },
  { path: "/bookmarks", label: "Bookmarks", bn: "বুকমার্ক", icon: Bookmark },
];

const mobileItems = items.slice(0, 4).concat([{ path: "/profile", label: "Profile", bn: "প্রোফাইল", icon: UserRound }]);

export function PlatformShell({ children, language, onLanguageChange }: { children: React.ReactNode; language: Language; onLanguageChange: (value: Language) => void }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;

  const navigate = (path: string) => {
    setLocation(path);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f7f7] text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-[#071d33] px-4 py-5 text-slate-100 lg:flex">
        <button className="mb-8 flex items-center gap-3 px-2 text-left" onClick={() => navigate("/")}>
          <span className="grid size-10 place-items-center rounded-2xl bg-[#16b89b] shadow-[0_8px_24px_rgba(22,184,155,.25)]"><GraduationCap size={22} /></span>
          <span><b className="block font-display text-xl tracking-tight">MCQ GURU</b><span className="text-xs text-slate-400">Learn. Practice. Rise.</span></span>
        </button>
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#7ce3d1]"><Flame size={14} /> {copy("7 day streak", "৭ দিনের স্ট্রিক")}</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[71%] rounded-full bg-[#16b89b]" /></div>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map(item => {
            const active = location === item.path;
            const Icon = item.icon;
            return <button key={item.path} onClick={() => navigate(item.path)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-[#16b89b] font-semibold text-[#04131f] shadow-lg shadow-[#16b89b]/15" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}><Icon size={18} /><span>{copy(item.label, item.bn)}</span>{active && <ChevronRight className="ml-auto" size={15} />}</button>;
          })}
        </nav>
        <div className="space-y-1 border-t border-white/10 pt-4">
          <button onClick={() => navigate("/settings")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/8"><Settings size={18} />{copy("Settings", "সেটিংস")}</button>
          <button onClick={() => navigate("/governance")} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/8"><LockKeyhole size={18} />{copy("Content workspace", "কনটেন্ট ওয়ার্কস্পেস")}</button>
        </div>
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-30 flex h-[74px] items-center justify-between border-b border-slate-200/80 bg-[#f4f7f7]/85 px-4 backdrop-blur-lg sm:px-7 lg:px-10">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setMobileOpen(true)} className="grid size-10 place-items-center rounded-xl bg-white text-[#071d33] shadow-sm"><Menu size={20} /></button>
            <span className="font-display text-xl font-bold text-[#071d33]">MCQ GURU</span>
          </div>
          <div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#168f80]">{copy("Your learning space", "তোমার লার্নিং স্পেস")}</p><p className="text-sm text-slate-500">{copy("HSC & admission preparation", "এইচএসসি ও ভর্তি প্রস্তুতি")}</p></div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200"><button onClick={() => onLanguageChange("bn")} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${language === "bn" ? "bg-[#071d33] text-white" : "text-slate-500"}`}>বাং</button><button onClick={() => onLanguageChange("en")} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${language === "en" ? "bg-[#071d33] text-white" : "text-slate-500"}`}>EN</button></div>
            <button onClick={() => navigate("/notifications")} className="relative grid size-10 place-items-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200"><Bell size={18} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#f59e0b]" /></button>
            <button onClick={() => navigate("/profile")} className="hidden items-center gap-2 rounded-xl bg-white py-1.5 pl-1.5 pr-3 shadow-sm ring-1 ring-slate-200 sm:flex"><span className="grid size-8 place-items-center rounded-lg bg-[#dff8f1] text-xs font-bold text-[#087b6c]">ZI</span><span className="text-sm font-semibold text-slate-700">Zian</span></button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-4 pb-24 pt-6 sm:px-7 lg:px-10 lg:pb-10">{children}</main>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-[#071d33]/50" /><aside className="relative flex h-full w-[82%] max-w-[330px] flex-col bg-[#071d33] px-4 py-5 text-slate-100 shadow-2xl"><div className="mb-7 flex items-center justify-between"><button onClick={() => navigate("/")} className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#16b89b]"><GraduationCap size={22} /></span><b className="font-display text-xl">MCQ GURU</b></button><button onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-slate-300"><X /></button></div><nav className="space-y-1">{items.map(item => { const Icon = item.icon; return <button key={item.path} onClick={() => navigate(item.path)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left ${location === item.path ? "bg-[#16b89b] font-semibold text-[#04131f]" : "text-slate-200"}`}><Icon size={18} />{copy(item.label, item.bn)}</button>; })}</nav></aside></div>}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur lg:hidden">{mobileItems.map(item => { const Icon = item.icon; const active = location === item.path; return <button key={item.path} onClick={() => navigate(item.path)} className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1 text-[10px] font-semibold ${active ? "text-[#088a78]" : "text-slate-400"}`}><Icon size={19} strokeWidth={active ? 2.5 : 2} />{copy(item.label, item.bn)}</button>; })}</nav>
    </div>
  );
}
