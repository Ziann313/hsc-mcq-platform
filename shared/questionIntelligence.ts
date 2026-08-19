export type QuestionProvenance = "historical_official" | "historical_verified" | "historical_unverified" | "generated_from_curriculum" | "generated_from_historical_analysis" | "generated_from_exam_pattern" | "original_source_linked";

export type QuestionIntelligenceInput = {
  provenance?: QuestionProvenance;
  verificationStatus?: "unverified" | "source_linked" | "human_reviewed" | "approved";
  cognitiveLevel?: "recall" | "understanding" | "application" | "analysis" | "evaluation";
  reasoningMode?: "conceptual" | "numerical" | "mixed";
  difficultyScore?: number;
  examDifficultyProfile?: string;
  historicalFrequency?: number;
  chapterFrequency?: number;
  topicFrequency?: number;
  importanceScore?: number;
  recurrenceScore?: number;
  formulaUsed?: string;
  commonMistake?: string;
  generationBasis?: string;
};

export function normalizeQuestionText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function compactQuestionTemplate(value: string) {
  return normalizeQuestionText(value)
    .replace(/\d+(?:[.,]\d+)?/g, "#")
    .replace(/[a-z]\s*=\s*#/gi, "var=#")
    .replace(/[^a-zA-Z0-9\u0980-\u09ff#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function characterNgrams(value: string, width = 3) {
  const compact = value.replace(/\s+/g, " ");
  if (compact.length <= width) return new Set([compact]);
  const grams = new Set<string>();
  for (let index = 0; index <= compact.length - width; index += 1) grams.add(compact.slice(index, index + width));
  return grams;
}

export function nearDuplicateScore(left: string, right: string) {
  const a = characterNgrams(compactQuestionTemplate(left));
  const b = characterNgrams(compactQuestionTemplate(right));
  const union = new Set(Array.from(a).concat(Array.from(b)));
  if (!union.size) return 0;
  const overlap = Array.from(a).filter(token => b.has(token)).length;
  return overlap / union.size;
}

export function duplicateRisk(left: string, right: string) {
  const normalizedLeft = normalizeQuestionText(left);
  const normalizedRight = normalizeQuestionText(right);
  if (normalizedLeft === normalizedRight) return { kind: "exact" as const, score: 1 };
  const score = nearDuplicateScore(left, right);
  return score >= 0.9 ? { kind: "near" as const, score } : { kind: "none" as const, score };
}

export function validateQuestionIntelligence(input: QuestionIntelligenceInput | undefined) {
  if (!input) return;
  const integerInRange = (value: number | undefined, field: string, min: number, max: number) => {
    if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) throw new Error(`${field} must be an integer between ${min} and ${max}`);
  };
  integerInRange(input.difficultyScore, "Difficulty score", 1, 10);
  integerInRange(input.historicalFrequency, "Historical frequency", 0, 10_000);
  integerInRange(input.chapterFrequency, "Chapter frequency", 0, 10_000);
  integerInRange(input.topicFrequency, "Topic frequency", 0, 10_000);
  integerInRange(input.importanceScore, "Importance score", 0, 100);
  integerInRange(input.recurrenceScore, "Recurrence score", 0, 100);
  const requiresBasis = input.provenance === "generated_from_curriculum" || input.provenance === "generated_from_historical_analysis" || input.provenance === "generated_from_exam_pattern";
  if (requiresBasis && (input.generationBasis?.trim().length ?? 0) < 12) throw new Error("Generated questions require a concise, source-linked generation basis");
}
