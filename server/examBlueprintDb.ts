import { and, eq, inArray, sql } from "drizzle-orm";
import { auditLogs, examBlueprints, examPatternSources, examPatternVersions, examProfiles, questionIntelligence, questionSources, questions, sourceVersions } from "../drizzle/schema";
import { validateExamBlueprint, type ExamBlueprintConfiguration } from "../shared/examBlueprint";
import { getDb } from "./db";

function parseBlueprint(value: unknown) {
  const configuration = value as ExamBlueprintConfiguration;
  return { configuration, validation: validateExamBlueprint(configuration) };
}

function sourceModeCondition(mode: ExamBlueprintConfiguration["sourceMode"]) {
  if (mode === "historical_only") return sql`${questionIntelligence.provenance} IN ('historical_official', 'historical_verified') AND ${questionIntelligence.verificationStatus} = 'approved'`;
  if (mode === "approved_generated_only") return sql`${questionIntelligence.provenance} IN ('generated_from_curriculum', 'generated_from_historical_analysis', 'generated_from_exam_pattern') AND ${questionIntelligence.verificationStatus} = 'approved'`;
  return sql`(${questionIntelligence.id} IS NULL OR ${questionIntelligence.verificationStatus} = 'approved')`;
}

async function capacityValidation(examProfileId: number, configuration: ExamBlueprintConfiguration) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const conditions = [eq(questions.status, "published"), eq(questions.contentLanguage, configuration.contentLanguage), eq(sourceVersions.status, "active"), sourceModeCondition(configuration.sourceMode)];
  if (configuration.sourceMode === "specific_question_set") conditions.push(inArray(questions.id, configuration.specificQuestionIds ?? []));
  const candidates = await db.select({ id: questions.id, subjectId: questions.subjectId, chapterId: questions.chapterId, difficulty: questions.difficulty, questionType: questions.questionType })
    .from(questions).innerJoin(questionSources, eq(questionSources.questionId, questions.id)).innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id)).leftJoin(questionIntelligence, eq(questionIntelligence.questionId, questions.id)).where(and(...conditions));
  const unique = Array.from(new Map(candidates.map(row => [row.id, row])).values());
  const errors: string[] = [];
  if (unique.length < configuration.totalQuestions) errors.push(`Only ${unique.length} approved source-linked questions are available; blueprint requires ${configuration.totalQuestions}.`);
  const requireDistribution = (label: string, distribution: Array<{ id?: number; difficulty?: string; questionType?: string; count: number }>, matches: (row: typeof unique[number], item: typeof distribution[number]) => boolean) => distribution.forEach(item => {
    const available = unique.filter(row => matches(row, item)).length;
    if (available < item.count) errors.push(`${label} lacks approved question capacity for one configured distribution row.`);
  });
  requireDistribution("Subject distribution", configuration.subjectDistribution, (row, item) => row.subjectId === item.id);
  requireDistribution("Chapter distribution", configuration.chapterDistribution, (row, item) => row.chapterId === item.id);
  requireDistribution("Difficulty distribution", configuration.difficultyDistribution, (row, item) => row.difficulty === item.difficulty);
  requireDistribution("Question-type distribution", configuration.questionTypeDistribution, (row, item) => row.questionType === item.questionType);
  if (configuration.sourceMode === "specific_question_set" && unique.length !== configuration.totalQuestions) errors.push("The specific question set does not resolve to the configured number of approved source-linked questions.");
  const [profile] = await db.select({ id: examProfiles.id, examType: examProfiles.examType }).from(examProfiles).where(eq(examProfiles.id, examProfileId)).limit(1);
  if (!profile) errors.push("Exam profile no longer exists.");
  return { valid: errors.length === 0, errors, candidateCount: unique.length };
}

export async function saveExamBlueprint(input: { actorUserId: number; examPatternVersionId: number; configuration: ExamBlueprintConfiguration }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [pattern] = await db.select({ id: examPatternVersions.id, examProfileId: examPatternVersions.examProfileId, status: examPatternVersions.status }).from(examPatternVersions).where(eq(examPatternVersions.id, input.examPatternVersionId)).limit(1);
  if (!pattern) throw new Error("Exam pattern version was not found");
  const structural = validateExamBlueprint(input.configuration);
  const capacity = structural.valid ? await capacityValidation(pattern.examProfileId, input.configuration) : { valid: false, errors: [] as string[], candidateCount: 0 };
  const report = { valid: structural.valid && capacity.valid, errors: [...structural.errors, ...capacity.errors], candidateCount: capacity.candidateCount };
  const [existing] = await db.select({ id: examBlueprints.id, status: examBlueprints.status }).from(examBlueprints).where(eq(examBlueprints.examPatternVersionId, input.examPatternVersionId)).limit(1);
  if (existing?.status === "published") throw new Error("Published exam blueprints are immutable; create a new pattern version instead");
  if (existing) await db.update(examBlueprints).set({ configuration: input.configuration, validationReport: report, status: report.valid ? "validated" : "draft", validatedAt: report.valid ? new Date() : null }).where(eq(examBlueprints.id, existing.id));
  else await db.insert(examBlueprints).values({ examPatternVersionId: input.examPatternVersionId, configuration: input.configuration, validationReport: report, status: report.valid ? "validated" : "draft", createdByUserId: input.actorUserId, validatedAt: report.valid ? new Date() : null });
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, action: "exam_blueprint.saved", entityType: "exam_pattern_version", entityId: String(input.examPatternVersionId), metadata: report });
  return report;
}

export async function publishExamBlueprint(input: { actorUserId: number; examPatternVersionId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [blueprint] = await db.select({ id: examBlueprints.id, configuration: examBlueprints.configuration, status: examBlueprints.status, examProfileId: examPatternVersions.examProfileId, patternStatus: examPatternVersions.status }).from(examBlueprints).innerJoin(examPatternVersions, eq(examBlueprints.examPatternVersionId, examPatternVersions.id)).where(eq(examBlueprints.examPatternVersionId, input.examPatternVersionId)).limit(1);
  if (!blueprint || blueprint.status !== "validated" || blueprint.patternStatus !== "active") throw new Error("Only a validated blueprint on an active pattern can be published");
  const evidence = await db.select({ id: examPatternSources.id }).from(examPatternSources).innerJoin(sourceVersions, eq(examPatternSources.sourceVersionId, sourceVersions.id)).where(and(eq(examPatternSources.examPatternVersionId, input.examPatternVersionId), eq(sourceVersions.status, "active"))).limit(1);
  if (!evidence[0]) throw new Error("Publishing requires active source evidence for the pattern version");
  const { configuration } = parseBlueprint(blueprint.configuration);
  const capacity = await capacityValidation(blueprint.examProfileId, configuration);
  if (!capacity.valid) throw new Error(capacity.errors.join(" "));
  await db.update(examBlueprints).set({ status: "published", publishedAt: new Date(), validationReport: { valid: true, errors: [], candidateCount: capacity.candidateCount } }).where(eq(examBlueprints.id, blueprint.id));
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, action: "exam_blueprint.published", entityType: "exam_pattern_version", entityId: String(input.examPatternVersionId), metadata: { candidateCount: capacity.candidateCount } });
  return { published: true } as const;
}

export async function getExamBlueprints() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: examBlueprints.id, examPatternVersionId: examBlueprints.examPatternVersionId, configuration: examBlueprints.configuration, validationReport: examBlueprints.validationReport, status: examBlueprints.status, title: examProfiles.title, examType: examProfiles.examType, institution: examProfiles.institution, unit: examProfiles.unit, versionLabel: examPatternVersions.versionLabel, patternStatus: examPatternVersions.status, publishedAt: examBlueprints.publishedAt, updatedAt: examBlueprints.updatedAt }).from(examBlueprints).innerJoin(examPatternVersions, eq(examBlueprints.examPatternVersionId, examPatternVersions.id)).innerJoin(examProfiles, eq(examPatternVersions.examProfileId, examProfiles.id)).orderBy(sql`${examBlueprints.updatedAt} desc`).limit(100);
}
