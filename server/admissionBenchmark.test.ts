import { describe, expect, it } from "vitest";
import { buildAdmissionBenchmarks } from "../shared/admissionBenchmark";

describe("admission score benchmarks", () => {
  const pattern = { id: 7, institution: "University of Dhaka", title: "Undergraduate admission", unit: "DU A", configuration: { cutoffScore: 72, questionCount: 100, marksPerCorrect: 1, session: "2024–25", sourceUrl: "https://example.edu/cutoff", evidenceStatus: "reviewer confirmed" } };

  it("compares the latest same-track mock only when the official total-mark scale matches", () => {
    const [benchmark] = buildAdmissionBenchmarks([pattern], [
      { id: 1, score: 18, maxMarks: 20, track: "du", submittedAt: new Date("2026-08-01") },
      { id: 2, score: 74, maxMarks: 100, track: "du", submittedAt: new Date("2026-08-02") },
      { id: 3, score: 89, maxMarks: 100, track: "buet", submittedAt: new Date("2026-08-03") },
    ]);
    expect(benchmark).toMatchObject({ state: "comparable", cutMark: 72, gap: 2, latestAttempt: { id: 2, score: 74, maxMarks: 100 } });
  });

  it("does not compare short practice sets to a full cut mark", () => {
    const [benchmark] = buildAdmissionBenchmarks([pattern], [{ id: 1, score: 18, maxMarks: 20, track: "du", submittedAt: new Date() }]);
    expect(benchmark).toMatchObject({ state: "no_compatible_mock", latestAttempt: null, gap: null });
  });
});
