import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function DailyChallengeAlertPreference({ language }: { language: "bn" | "en" }) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const utils = trpc.useUtils();
  const preferences = trpc.learning.notificationPreferences.useQuery();
  const [browserEnabled, setBrowserEnabled] = useState(false);
  useEffect(() => { setBrowserEnabled(typeof Notification !== "undefined" && Notification.permission === "granted" && localStorage.getItem("mcqGuru.dailyChallengeBrowserAlerts") === "enabled"); }, []);
  const update = trpc.learning.updateNotificationPreferences.useMutation({ onSuccess: () => { utils.learning.notificationPreferences.invalidate(); toast.success(copy("Daily challenge alert preference saved", "ডেইলি চ্যালেঞ্জ অ্যালার্ট পছন্দ সেভ হয়েছে")); }, onError: error => toast.error(error.message) });
  const enableBrowser = async () => {
    if (typeof Notification === "undefined") { toast.info(copy("Browser alerts are not supported on this device.", "এই ডিভাইসে ব্রাউজার অ্যালার্ট সাপোর্টেড নয়।")); return; }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    if (permission !== "granted") { toast.warning(copy("Browser alert permission was not granted.", "ব্রাউজার অ্যালার্ট পারমিশন দেওয়া হয়নি।")); return; }
    localStorage.setItem("mcqGuru.dailyChallengeBrowserAlerts", "enabled"); setBrowserEnabled(true); toast.success(copy("Browser alerts enabled while MCQ GURU is open", "MCQ GURU খোলা থাকলে ব্রাউজার অ্যালার্ট চালু হয়েছে"));
  };
  if (preferences.isLoading || preferences.isError) return null;
  const enabled = preferences.data?.dailyChallengeEnabled ?? false;
  return <section className="rounded-2xl border border-[#bdeadd] bg-[#effcf9] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#087b6c]"><BellRing size={18} /></span><div><p className="text-sm font-extrabold text-[#071d33]">{copy("Daily challenge alerts", "ডেইলি চ্যালেঞ্জ অ্যালার্ট")}</p><p className="mt-1 text-xs leading-5 text-[#386e66]">{copy("Opt in to receive a private in-app notice when a new daily challenge opens. Browser alerts are optional and work while this app is open.", "নতুন ডেইলি চ্যালেঞ্জ শুরু হলে ব্যক্তিগত ইন-অ্যাপ নোটিশ পেতে অপ্ট-ইন করো। ব্রাউজার অ্যালার্ট ঐচ্ছিক এবং এই অ্যাপ খোলা থাকলে কাজ করে।")}</p></div></div><div className="flex flex-wrap gap-2"><Button disabled={update.isPending} onClick={() => update.mutate({ dailyChallengeEnabled: !enabled })} variant={enabled ? "default" : "outline"} className={`min-h-10 rounded-xl ${enabled ? "bg-[#087b6c]" : "border-[#087b6c] text-[#087b6c]"}`}>{enabled ? <CheckCircle2 size={16} /> : <BellRing size={16} />}{enabled ? copy("Alerts on", "অ্যালার্ট চালু") : copy("Enable alerts", "অ্যালার্ট চালু করো")}</Button>{enabled && !browserEnabled && <Button onClick={enableBrowser} variant="outline" className="min-h-10 rounded-xl border-slate-300">{copy("Enable browser alert", "ব্রাউজার অ্যালার্ট")}</Button>}{browserEnabled && <span className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-white px-3 text-xs font-bold text-[#087b6c]"><CheckCircle2 size={14} />{copy("Browser on", "ব্রাউজার চালু")}</span>}</div></div></section>;
}
