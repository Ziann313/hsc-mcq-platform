import { Button } from "@/components/ui/button";
import { LockKeyhole, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";

export default function AccessDeniedPage() {
  const [, navigate] = useLocation();
  return <main className="grid min-h-screen place-items-center bg-[#f4f7f7] px-5"><section className="w-full max-w-lg rounded-[28px] bg-white p-7 text-center shadow-sm ring-1 ring-slate-100 sm:p-10"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#fff0eb] text-[#c2492c]"><ShieldAlert size={27} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#c2492c]">ACCESS RESTRICTED</p><h1 className="mt-2 font-display text-3xl font-extrabold text-[#071d33]">This workspace is for authorized reviewers.</h1><p className="mt-3 text-sm leading-6 text-slate-600">এই কর্মক্ষেত্রটি শুধু অনুমোদিত রিভিউয়ারদের জন্য। তোমার ভূমিকার জন্য এই পৃষ্ঠায় প্রবেশাধিকার নেই।</p><Button onClick={() => navigate("/")} className="mt-7 min-h-11 rounded-xl bg-[#071d33]"><LockKeyhole size={16} />Return to learning home</Button></section></main>;
}
