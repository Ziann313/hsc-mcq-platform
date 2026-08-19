import { z } from "zod";

export const questionIntelligenceInput = z.object({
  examProfileId: z.number().int().positive().optional(),
  provenance: z.enum(["historical_official", "historical_verified", "historical_unverified", "generated_from_curriculum", "generated_from_historical_analysis", "generated_from_exam_pattern", "original_source_linked"]).optional(),
  verificationStatus: z.enum(["unverified", "source_linked", "human_reviewed", "approved"]).optional(),
  cognitiveLevel: z.enum(["recall", "understanding", "application", "analysis", "evaluation"]).optional(),
  reasoningMode: z.enum(["conceptual", "numerical", "mixed"]).optional(),
  difficultyScore: z.number().int().min(1).max(10).optional(),
  examDifficultyProfile: z.string().max(80).optional(),
  historicalFrequency: z.number().int().min(0).max(10_000).optional(),
  chapterFrequency: z.number().int().min(0).max(10_000).optional(),
  topicFrequency: z.number().int().min(0).max(10_000).optional(),
  importanceScore: z.number().int().min(0).max(100).optional(),
  recurrenceScore: z.number().int().min(0).max(100).optional(),
  formulaUsed: z.string().max(360).optional(),
  commonMistake: z.string().max(2000).optional(),
  generationBasis: z.string().max(3000).optional(),
}).optional();
