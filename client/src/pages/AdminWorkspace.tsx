import { PlatformShell, type Language } from "@/components/PlatformShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Archive, Banknote, Check, FileText, Flag, Rocket, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";

type Props = { language: Language; onLanguageChange: (value: Language) => void };

export default function AdminWorkspace({ language, onLanguageChange }: Props) {
  const copy = (en: string, bn: string) => language === "bn" ? bn : en;
  const utils = trpc.useUtils();
  const queue = trpc.learning.questionReviewQueue.useQuery();
  const publicationQueue = trpc.learning.approvedQuestionPublicationQueue.useQuery();
  const manualPayments = trpc.subscription.pendingManualPayments.useQuery();
  const review = trpc.learning.reviewQuestion.useMutation({
    onSuccess: () => {
      toast.success(copy("Question review recorded", "প্রশ্ন রিভিউ রেকর্ড করা হয়েছে"));
      utils.learning.questionReviewQueue.invalidate();
      utils.learning.approvedQuestionPublicationQueue.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const publish = trpc.learning.publishApprovedQuestion.useMutation({
    onSuccess: () => {
      toast.success(copy("Question published to student practice", "শিক্ষার্থী প্র্যাকটিসের জন্য প্রশ্ন প্রকাশিত হয়েছে"));
      utils.learning.approvedQuestionPublicationQueue.invalidate();
      utils.learning.publishedContentAvailability.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const reviewManualPayment = trpc.subscription.reviewManualPayment.useMutation({
    onSuccess: () => { toast.success(copy("Payment review recorded", "পেমেন্ট রিভিউ রেকর্ড করা হয়েছে")); utils.subscription.pendingManualPayments.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const error = queue.error ?? publicationQueue.error ?? manualPayments.error;
  if (error) {
    const accessDenied = error.data?.code === "FORBIDDEN" || error.data?.code === "UNAUTHORIZED";
    return <PlatformShell language={language} onLanguageChange={onLanguageChange}><AccessState accessDenied={accessDenied} copy={copy} onRetry={() => { queue.refetch(); publicationQueue.refetch(); manualPayments.refetch(); }} /></PlatformShell>;
  }

  return <PlatformShell language={language} onLanguageChange={onLanguageChange}>
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#088a78]">{copy("CONTENT GOVERNANCE", "কনটেন্ট গভর্ন্যান্স")}</p><h1 className="mt-1 font-display text-2xl font-extrabold text-[#071d33]">{copy("Review, then deliberately release", "রিভিউ, তারপর সচেতনভাবে রিলিজ")}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy("Approval and student publication are separate, auditable decisions. A question is never released until its source version, page reference, and answer structure pass the final gate.", "অনুমোদন ও শিক্ষার্থী রিলিজ আলাদা, অডিটযোগ্য সিদ্ধান্ত। সোর্স ভার্সন, পেজ রেফারেন্স ও উত্তর স্ট্রাকচার চূড়ান্ত গেট পাস না করা পর্যন্ত প্রশ্ন রিলিজ হয় না।")}</p></div>
        <div className="rounded-xl border border-[#bdeadd] bg-[#effcf9] px-3 py-2 text-xs font-bold text-[#087b6c]"><ShieldCheck className="mr-1 inline" size={14} />{copy("Role-protected release control", "রোল-প্রটেক্টেড রিলিজ কন্ট্রোল")}</div>
      </header>
      <section className="mb-6 rounded-[24px] bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading title={copy("Manual subscription payment queue", "ম্যানুয়াল সাবস্ক্রিপশন পেমেন্ট কিউ")} count={manualPayments.data?.length ?? 0} detail={copy("Approve only after independently confirming the exact amount and transaction reference in the named payment channel. A submitted request never activates Premium by itself.", "নির্দিষ্ট পেমেন্ট চ্যানেলে সঠিক পরিমাণ ও ট্রানজেকশন রেফারেন্স স্বাধীনভাবে নিশ্চিত করার পরই অনুমোদন দাও। জমা দেওয়া রিকোয়েস্ট নিজে থেকে প্রিমিয়াম চালু করে না।")} />
        {manualPayments.isLoading ? <SkeletonRows /> : manualPayments.data?.length ? <div className="mt-5 space-y-3">{manualPayments.data.map(payment => {
          const payload = payment.payload && typeof payment.payload === "object" && !Array.isArray(payment.payload) ? payment.payload as Record<string, unknown> : {};
          return <article key={payment.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><Tag label={payment.gateway === "bkash_manual" ? "BKASH" : "NAGAD"} /><Tag label={`৳${String(payment.amountBDT)}`} muted /><Tag label={(language === "bn" ? payment.planNameBn : payment.planName).toUpperCase()} muted /></div><p className="mt-3 text-sm font-bold text-[#071d33]">{payment.learnerName ?? copy("Student", "শিক্ষার্থী")} <span className="font-normal text-slate-500">{payment.learnerEmail ?? ""}</span></p><p className="mt-2 text-xs leading-5 text-slate-500">{copy("Sender", "প্রেরক")}: {String(payload.senderPhone ?? "—")} · {copy("Transaction ID", "ট্রানজেকশন আইডি")}: <b>{String(payload.transactionReference ?? "—")}</b></p><p className="mt-1 text-[11px] text-slate-400">{copy("Request", "রিকোয়েস্ট")}: {payment.internalTransactionId}</p></div><div className="flex flex-wrap gap-2"><ActionButton onClick={() => reviewManualPayment.mutate({ paymentId: payment.id, approved: true, reviewerNote: "Approved after independent channel verification" })} disabled={reviewManualPayment.isPending} icon={Check} label={copy("Confirm & grant", "কনফার্ম ও গ্রান্ট")} /><ActionButton onClick={() => reviewManualPayment.mutate({ paymentId: payment.id, approved: false, reviewerNote: "Payment could not be verified" })} disabled={reviewManualPayment.isPending} icon={X} label={copy("Reject", "রিজেক্ট")} variant="amber" /></div></div></article>;
        })}</div> : <EmptyQueue icon={Banknote} title={copy("No manual payments need review", "কোনো ম্যানুয়াল পেমেন্ট রিভিউ বাকি নেই")} detail={copy("Students who submit bKash or Nagad references will appear here. Do not approve from the request alone.", "bKash বা Nagad রেফারেন্স জমা দিলে শিক্ষার্থীরা এখানে দেখাবে। শুধু রিকোয়েস্ট দেখে অনুমোদন দিও না।")} />}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[24px] bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading title={copy("Human review queue", "হিউম্যান রিভিউ কিউ")} count={queue.data?.length ?? 0} detail={copy("Source-mapped questions awaiting a reviewer decision.", "সোর্স-ম্যাপড প্রশ্ন রিভিউয়ারের সিদ্ধান্তের অপেক্ষায় আছে।")} />
          {queue.isLoading ? <SkeletonRows /> : queue.data?.length ? <div className="mt-5 space-y-3">{queue.data.map(question => <article key={question.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><Tag label="HUMAN REVIEW" /><Tag label={question.subject} muted /><Tag label={`v${question.version}`} muted /></div><p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-[#071d33]">{question.prompt}</p><p className="mt-1 text-xs text-slate-500">{copy("Difficulty", "কঠিনতা")}: {question.difficulty}{question.difficultyScore ? ` · DNA ${question.difficultyScore}/10` : ""}</p><div className="mt-2 flex flex-wrap gap-1.5"><Tag label={(question.provenance ?? "legacy_source_linked").replace(/_/g, " ").toUpperCase()} muted /><Tag label={(question.cognitiveLevel ?? "not recorded").toUpperCase()} muted /><Tag label={(question.reasoningMode ?? "not recorded").toUpperCase()} muted /></div><p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{question.sourceTitle} · {question.sourcePage}{question.formulaUsed ? ` · ${copy("Formula", "সূত্র")}: ${question.formulaUsed}` : ""}</p>{question.generationBasis ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#087b6c]">{copy("Generation basis", "জেনারেশন ভিত্তি")}: {question.generationBasis}</p> : null}</div><div className="flex flex-wrap gap-2"><ActionButton onClick={() => review.mutate({ questionId: question.id, status: "approved", note: "Approved from governance workspace" })} disabled={review.isPending} icon={Check} label={copy("Approve", "অনুমোদন")} /><ActionButton onClick={() => review.mutate({ questionId: question.id, status: "needs_review", note: "Flagged for follow-up" })} disabled={review.isPending} icon={Flag} label={copy("Flag", "ফ্ল্যাগ")} variant="amber" /><ActionButton onClick={() => review.mutate({ questionId: question.id, status: "archived", note: "Archived from governance workspace" })} disabled={review.isPending} icon={Archive} label={copy("Archive", "আর্কাইভ")} variant="muted" /></div></div></article>)}</div> : <EmptyQueue icon={FileText} title={copy("No questions are waiting for review", "কোনো প্রশ্ন রিভিউয়ের অপেক্ষায় নেই")} detail={copy("Questions appear here only after source mapping and intake validation.", "সোর্স ম্যাপিং ও ইনটেক ভ্যালিডেশনের পরই প্রশ্ন এখানে আসে।")} />}
        </section>
        <section className="rounded-[24px] bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading title={copy("Approved publication queue", "অনুমোদিত প্রকাশনা কিউ")} count={publicationQueue.data?.length ?? 0} detail={copy("Final release control for approved questions; active source evidence is checked again before publication.", "অনুমোদিত প্রশ্নের চূড়ান্ত রিলিজ কন্ট্রোল; প্রকাশের আগে অ্যাকটিভ সোর্স এভিডেন্স আবার যাচাই হয়।")} />
          {publicationQueue.isLoading ? <SkeletonRows /> : publicationQueue.data?.length ? <div className="mt-5 space-y-3">{publicationQueue.data.map(question => <article key={question.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap gap-2"><Tag label="APPROVED" /><Tag label={question.subject} muted /><Tag label={question.sourceVersionStatus.toUpperCase()} muted={question.sourceVersionStatus !== "active"} /></div><p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-[#071d33]">{question.prompt}</p><p className="mt-1 text-xs text-slate-500">{question.sourceTitle} · {question.pageReference}</p></div><Button disabled={publish.isPending || question.sourceVersionStatus !== "active"} onClick={() => publish.mutate({ questionId: question.id })} className="shrink-0 rounded-xl bg-[#071d33]"><Rocket size={15} />{copy("Publish", "প্রকাশ করো")}</Button></div></article>)}</div> : <EmptyQueue icon={Rocket} title={copy("No approved questions are ready to release", "রিলিজের জন্য কোনো অনুমোদিত প্রশ্ন প্রস্তুত নেই")} detail={copy("Approve a source-linked review item first. The final publication gate stays separate by design.", "প্রথমে সোর্স-লিংকড রিভিউ আইটেম অনুমোদন করো। চূড়ান্ত প্রকাশ গেট ইচ্ছাকৃতভাবে আলাদা থাকে।")} />}
        </section>
      </div>
    </div>
  </PlatformShell>;
}

function AccessState({ accessDenied, copy, onRetry }: { accessDenied: boolean; copy: (en: string, bn: string) => string; onRetry: () => void }) { return <div className="grid min-h-[520px] place-items-center rounded-[28px] bg-white p-8 text-center shadow-sm"><div className="max-w-md"><span className={`mx-auto grid size-14 place-items-center rounded-2xl ${accessDenied ? "bg-[#fff5e4] text-[#b86b09]" : "bg-[#eef3ff] text-[#315bb3]"}`}>{accessDenied ? <ShieldCheck /> : <TriangleAlert />}</span><h1 className="mt-5 font-display text-2xl font-extrabold text-[#071d33]">{accessDenied ? copy("Admin access required", "অ্যাডমিন অ্যাকসেস প্রয়োজন") : copy("Unable to load governance queues", "গভর্ন্যান্স কিউ লোড করা যাচ্ছে না")}</h1><p className="mt-3 text-sm leading-6 text-slate-500">{accessDenied ? copy("This workspace is limited to authorized reviewers and administrators.", "এই ওয়ার্কস্পেস শুধুমাত্র অনুমোদিত রিভিউয়ার ও অ্যাডমিনদের জন্য।") : copy("No review or release action has been submitted. Retry loading the protected queues.", "কোনো রিভিউ বা রিলিজ অ্যাকশন জমা হয়নি। প্রটেক্টেড কিউ আবার লোড করো।")}</p>{!accessDenied && <Button onClick={onRetry} className="mt-6 rounded-xl bg-[#071d33]">{copy("Retry loading", "আবার চেষ্টা করো")}</Button>}</div></div>; }
function SectionHeading({ title, count, detail }: { title: string; count: number; detail: string }) { return <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-sm font-extrabold text-[#071d33]">{title}</p><p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{detail}</p></div><span className="rounded-lg bg-[#effcf9] px-2 py-1 text-xs font-bold text-[#087b6c]">{count}</span></div>; }
function Tag({ label, muted = false }: { label: string; muted?: boolean }) { return <span className={`rounded-md px-2 py-1 text-[10px] font-bold ${muted ? "bg-slate-100 text-slate-500" : "bg-[#e9fbf7] text-[#087b6c]"}`}>{label}</span>; }
function ActionButton({ onClick, disabled, icon: Icon, label, variant = "dark" }: { onClick: () => void; disabled: boolean; icon: typeof Check; label: string; variant?: "dark" | "amber" | "muted" }) { const style = variant === "amber" ? "bg-[#fff5e4] text-[#b86b09]" : variant === "muted" ? "bg-slate-100 text-slate-600" : "bg-[#071d33] text-white"; return <button disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${style}`}><Icon size={14} />{label}</button>; }
function EmptyQueue({ icon: Icon, title, detail }: { icon: typeof FileText; title: string; detail: string }) { return <div className="grid min-h-64 place-items-center py-8 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e9fbf7] text-[#088a78]"><Icon /></span><h2 className="mt-4 font-display text-lg font-extrabold text-[#071d33]">{title}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{detail}</p></div></div>; }
function SkeletonRows() { return <div className="space-y-3 py-5">{[1, 2, 3].map(item => <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />)}</div>; }
