import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Mail, Scale, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

type InformationPage = "about" | "privacy" | "terms" | "refund" | "contact";

const pageContent: Record<InformationPage, { icon: typeof FileText; label: string; heading: string; body: string }> = {
  about: { icon: FileText, label: "ABOUT MCQ GURU", heading: "A source-governed preparation space for Bangladesh.", body: "MCQ GURU helps HSC and admission learners practise only with published, reviewer-approved questions, use transparent timed attempts, and track their real activity rather than sample results." },
  privacy: { icon: ShieldCheck, label: "PRIVACY", heading: "Your learning record stays tied to your account.", body: "MCQ GURU uses your account and persisted learning activity to provide attempts, results, and recommendations. It does not display another learner’s private record to you." },
  terms: { icon: Scale, label: "TERMS OF USE", heading: "Use learning content responsibly.", body: "Practice content is released through a source and reviewer workflow. Official notices and patterns are informational unless they are explicitly active and source-evidenced in the platform." },
  refund: { icon: Scale, label: "REFUND POLICY", heading: "Payment requests are reviewed before any Premium entitlement changes.", body: "Manual bKash and Nagad payment requests remain pending until an authorised reviewer verifies the payment record. A payment request or screenshot is not a payment confirmation. For a refund or payment dispute, contact support with the payment reference so it can be reviewed under the applicable payment and consumer-protection requirements." },
  contact: { icon: Mail, label: "CONTACT", heading: "Get in touch about content or account support.", body: "For support, use the in-app notification and account channels after signing in. Reviewer and content-governance work is handled through the protected workspace." },
};

export default function PublicInformationPage({ page, language }: { page: InformationPage; language: "bn" | "en" }) {
  const content = pageContent[page];
  const Icon = content.icon;
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  return <main className="grid min-h-screen place-items-center bg-[#f4f7f7] px-5 py-10"><section className="w-full max-w-2xl rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-slate-100 sm:p-10"><span className="grid size-12 place-items-center rounded-2xl bg-[#e9fbf7] text-[#088a78]"><Icon size={22} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.16em] text-[#088a78]">{content.label}</p><h1 className="mt-2 font-display text-3xl font-extrabold leading-tight text-[#071d33]">{content.heading}</h1><p className="mt-4 text-sm leading-7 text-slate-600">{content.body}</p><p className="mt-6 rounded-2xl bg-[#f8fbfb] p-4 text-sm leading-6 text-slate-600">{copy("This public information page is intentionally concise. Sign in to use your personal learning workspace.", "এই পাবলিক তথ্য পৃষ্ঠাটি সংক্ষিপ্ত রাখা হয়েছে। নিজের লার্নিং ওয়ার্কস্পেস ব্যবহার করতে সাইন ইন করো।")}</p><Link href="/"><Button variant="outline" className="mt-7 min-h-11 rounded-xl"><ArrowLeft size={16} />{copy("Back to MCQ GURU", "MCQ GURU-তে ফিরে যাও")}</Button></Link></section></main>;
}
