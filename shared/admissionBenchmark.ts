export type BenchmarkTrackKey = "du" | "buet" | "medical";
export type BenchmarkPattern = {
  id: number;
  institution: string | null;
  title: string;
  unit: string | null;
  configuration: { cutoffScore?: number | null; questionCount?: number | null; marksPerCorrect?: number | null; session?: string | null; sourceUrl?: string; evidenceStatus?: string };
};
export type BenchmarkAttempt = { id: number; score: number; maxMarks: number; track: BenchmarkTrackKey | null; submittedAt: Date | null };

export function admissionTrackKey(value: string | null | undefined): BenchmarkTrackKey | null {
  const normalized = value?.toLowerCase() ?? "";
  if (normalized.includes("buet")) return "buet";
  if (normalized.includes("medical") || normalized.includes("mbbs")) return "medical";
  if (normalized.includes("du") || normalized.includes("dhaka")) return "du";
  return null;
}

export function buildAdmissionBenchmarks(patterns: BenchmarkPattern[], attempts: BenchmarkAttempt[]) {
  return patterns.filter(pattern => Number.isFinite(Number(pattern.configuration.cutoffScore)) && Number.isFinite(Number(pattern.configuration.questionCount)) && Number.isFinite(Number(pattern.configuration.marksPerCorrect)) && pattern.configuration.evidenceStatus === "reviewer confirmed")
    .map(pattern => {
      const track = admissionTrackKey(pattern.unit ?? pattern.institution);
      const cutMark = Number(pattern.configuration.cutoffScore);
      const officialMaxMarks = Number(pattern.configuration.questionCount) * Number(pattern.configuration.marksPerCorrect);
      const compatible = attempts.filter(attempt => attempt.track === track && Math.abs(attempt.maxMarks - officialMaxMarks) < 0.0001).sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0));
      const latest = compatible[0] ?? null;
      return {
        patternId: pattern.id,
        institution: pattern.institution,
        title: pattern.title,
        unit: pattern.unit,
        track,
        session: pattern.configuration.session ?? null,
        sourceUrl: pattern.configuration.sourceUrl ?? null,
        cutMark,
        officialMaxMarks,
        latestAttempt: latest ? { id: latest.id, score: latest.score, maxMarks: latest.maxMarks, submittedAt: latest.submittedAt } : null,
        gap: latest ? Math.round((latest.score - cutMark) * 100) / 100 : null,
        state: latest ? "comparable" as const : "no_compatible_mock" as const,
      };
    });
}
