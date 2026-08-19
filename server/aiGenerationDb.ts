import { and, desc, eq, inArray } from "drizzle-orm";
import { aiGenerationJobSources, aiQuestionGenerationJobs, auditLogs, books, chapters, concepts, examProfiles, knowledgeChunks, sourceVersions, sources, subjects, topics } from "../drizzle/schema";
import { validateQuestionIntelligence } from "../shared/questionIntelligence";
import { independentlyVerified } from "../shared/aiGeneration";
import { createReviewQuestion, getDb } from "./db";
import { invokeLLM, listLLMModels } from "./_core/llm";

type SourceReference = { sourceVersionId: number; pageReference: string };
type Candidate = { prompt: string; explanation: string; options: string[]; correctOptionIndex: number; cognitiveLevel: "recall" | "understanding" | "application" | "analysis" | "evaluation"; reasoningMode: "conceptual" | "numerical" | "mixed"; difficultyScore: number; formulaUsed: string; commonMistake: string; generationBasis: string };
type Verification = { supported: boolean; correctOptionIndex: number; calculationChecked: boolean; reason: string; evidencePages: string[] };

const authorisedSource = and(eq(sourceVersions.status, "active"), inArray(sources.accessClassification, ["official_public", "licensed_public"]), inArray(sources.sourceType, ["official_syllabus", "official_admission", "licensed"]));

async function resolveModels() {
  const { data } = await listLLMModels();
  const generator = data.find(model => model.id === "gpt-5-mini")?.id;
  const verifier = data.find(model => model.id === "claude-sonnet-4-6")?.id;
  if (!generator || !verifier || generator === verifier) throw new Error("Separate approved generation and verification models are not currently available");
  return { generator, verifier };
}

async function validateScope(input: { academicYearId: number; subjectId: number; bookId: number; chapterId: number; topicId?: number; conceptId?: number; examProfileId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [subject] = await db.select({ id: subjects.id, academicYearId: subjects.academicYearId }).from(subjects).where(eq(subjects.id, input.subjectId)).limit(1);
  if (!subject || subject.academicYearId !== input.academicYearId) throw new Error("Selected subject does not belong to the academic year");
  const [book] = await db.select({ id: books.id, subjectId: books.subjectId }).from(books).where(eq(books.id, input.bookId)).limit(1);
  if (!book || book.subjectId !== input.subjectId) throw new Error("Selected book does not belong to the subject");
  const [chapter] = await db.select({ id: chapters.id, bookId: chapters.bookId }).from(chapters).where(eq(chapters.id, input.chapterId)).limit(1);
  if (!chapter || chapter.bookId !== input.bookId) throw new Error("Selected chapter does not belong to the book");
  if (input.topicId) {
    const [topic] = await db.select({ id: topics.id, chapterId: topics.chapterId }).from(topics).where(eq(topics.id, input.topicId)).limit(1);
    if (!topic || topic.chapterId !== input.chapterId) throw new Error("Selected topic does not belong to the chapter");
  }
  if (input.conceptId) {
    if (!input.topicId) throw new Error("A concept requires a selected topic");
    const [concept] = await db.select({ id: concepts.id, topicId: concepts.topicId }).from(concepts).where(eq(concepts.id, input.conceptId)).limit(1);
    if (!concept || concept.topicId !== input.topicId) throw new Error("Selected concept does not belong to the topic");
  }
  if (input.examProfileId) {
    const [profile] = await db.select({ id: examProfiles.id, status: examProfiles.status }).from(examProfiles).where(eq(examProfiles.id, input.examProfileId)).limit(1);
    if (!profile || profile.status !== "active") throw new Error("Selected exam profile is not active");
  }
}

async function resolveGroundedEvidence(references: SourceReference[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!references.length || references.length > 5) throw new Error("Select between 1 and 5 authorised source references");
  const evidence = [] as Array<{ sourceVersionId: number; pageReference: string; content: string; sourceTitle: string }>;
  for (const reference of references) {
    if (!reference.pageReference.trim()) throw new Error("Every selected source requires a page or section reference");
    const [source] = await db.select({ id: sourceVersions.id, sourceTitle: sources.title }).from(sourceVersions).innerJoin(sources, eq(sourceVersions.sourceId, sources.id)).where(and(eq(sourceVersions.id, reference.sourceVersionId), authorisedSource)).limit(1);
    if (!source) throw new Error("A selected source is not active and authorised for AI grounding");
    const chunks = await db.select({ content: knowledgeChunks.content, pageReference: knowledgeChunks.pageReference }).from(knowledgeChunks)
      .where(and(eq(knowledgeChunks.sourceVersionId, reference.sourceVersionId), eq(knowledgeChunks.pageReference, reference.pageReference))).limit(8);
    if (!chunks.length) throw new Error(`No approved evidence chunk is registered for ${source.sourceTitle}, ${reference.pageReference}`);
    chunks.forEach(chunk => evidence.push({ sourceVersionId: reference.sourceVersionId, pageReference: chunk.pageReference, content: chunk.content, sourceTitle: source.sourceTitle }));
  }
  return evidence;
}

export async function createAiGenerationJob(input: { requestedByUserId: number; academicYearId: number; examProfileId?: number; subjectId: number; bookId: number; chapterId: number; topicId?: number; conceptId?: number; contentLanguage: "bn" | "en"; difficulty: "easy" | "medium" | "hard"; requestInstructions: string; sourceReferences: SourceReference[] }) {
  await validateScope(input);
  await resolveGroundedEvidence(input.sourceReferences);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const primary = input.sourceReferences[0]!;
  const result = await db.insert(aiQuestionGenerationJobs).values({
    requestedByUserId: input.requestedByUserId, academicYearId: input.academicYearId, examProfileId: input.examProfileId ?? null, subjectId: input.subjectId, bookId: input.bookId, chapterId: input.chapterId, topicId: input.topicId ?? null, conceptId: input.conceptId ?? null, contentLanguage: input.contentLanguage, difficulty: input.difficulty, pageReference: primary.pageReference, requestInstructions: input.requestInstructions.trim(),
  });
  const jobId = Number(result[0].insertId);
  await db.insert(aiGenerationJobSources).values(input.sourceReferences.map(reference => ({ jobId, sourceVersionId: reference.sourceVersionId, pageReference: reference.pageReference.trim() })));
  await db.insert(auditLogs).values({ actorUserId: input.requestedByUserId, action: "ai_generation.job_requested", entityType: "ai_generation_job", entityId: String(jobId), metadata: { sourceReferences: input.sourceReferences } });
  return jobId;
}

const candidateSchema = {
  type: "json_schema" as const,
  json_schema: { name: "mcq_candidate", strict: true, schema: { type: "object", additionalProperties: false, properties: { prompt: { type: "string" }, explanation: { type: "string" }, options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 }, correctOptionIndex: { type: "integer", minimum: 0, maximum: 3 }, cognitiveLevel: { type: "string", enum: ["recall", "understanding", "application", "analysis", "evaluation"] }, reasoningMode: { type: "string", enum: ["conceptual", "numerical", "mixed"] }, difficultyScore: { type: "integer", minimum: 1, maximum: 10 }, formulaUsed: { type: "string" }, commonMistake: { type: "string" }, generationBasis: { type: "string" } }, required: ["prompt", "explanation", "options", "correctOptionIndex", "cognitiveLevel", "reasoningMode", "difficultyScore", "formulaUsed", "commonMistake", "generationBasis"] } },
};

const verificationSchema = {
  type: "json_schema" as const,
  json_schema: { name: "mcq_answer_verification", strict: true, schema: { type: "object", additionalProperties: false, properties: { supported: { type: "boolean" }, correctOptionIndex: { type: "integer", minimum: 0, maximum: 3 }, calculationChecked: { type: "boolean" }, reason: { type: "string" }, evidencePages: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 10 } }, required: ["supported", "correctOptionIndex", "calculationChecked", "reason", "evidencePages"] } },
};

function parseCandidate(value: unknown): Candidate {
  if (!value || typeof value !== "object") throw new Error("AI did not return a structured candidate");
  const candidate = value as Candidate;
  if (typeof candidate.prompt !== "string" || candidate.prompt.trim().length < 10 || !Array.isArray(candidate.options) || candidate.options.length !== 4 || candidate.options.some(option => typeof option !== "string" || !option.trim()) || !Number.isInteger(candidate.correctOptionIndex) || candidate.correctOptionIndex < 0 || candidate.correctOptionIndex > 3) throw new Error("AI candidate did not satisfy structural MCQ requirements");
  validateQuestionIntelligence({ provenance: "generated_from_curriculum", cognitiveLevel: candidate.cognitiveLevel, reasoningMode: candidate.reasoningMode, difficultyScore: candidate.difficultyScore, generationBasis: candidate.generationBasis });
  return candidate;
}

export async function runAiGenerationJob(input: { jobId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [job] = await db.select().from(aiQuestionGenerationJobs).where(eq(aiQuestionGenerationJobs.id, input.jobId)).limit(1);
  if (!job || job.status !== "draft") return { outcome: "not_ready" as const };
  const references = await db.select({ sourceVersionId: aiGenerationJobSources.sourceVersionId, pageReference: aiGenerationJobSources.pageReference }).from(aiGenerationJobSources).where(eq(aiGenerationJobSources.jobId, input.jobId));
  const evidence = await resolveGroundedEvidence(references);
  const { generator, verifier } = await resolveModels();
  await db.update(aiQuestionGenerationJobs).set({ status: "generation_running", generationModel: generator, verificationModel: verifier, failureReason: null }).where(eq(aiQuestionGenerationJobs.id, input.jobId));
  const evidenceText = evidence.map(item => `[${item.sourceTitle}; ${item.pageReference}]\n${item.content}`).join("\n---\n");
  try {
    const generated = await invokeLLM({ model: generator, maxTokens: 1800, response_format: candidateSchema, messages: [{ role: "system", content: `Create exactly one original ${job.contentLanguage === "bn" ? "Bangla" : "English"} MCQ for Bangladesh HSC/admission preparation. Use only the authorised evidence below. Do not copy question text, invent facts, cite absent sources, or present historical questions. Match requested difficulty ${job.difficulty}. Your generationBasis must describe the supplied evidence, not an unsupported claim.\n\n${evidenceText}` }, { role: "user", content: `Scope: academic year ${job.academicYearId}; subject ${job.subjectId}; book ${job.bookId}; chapter ${job.chapterId}; topic ${job.topicId ?? "not specified"}; concept ${job.conceptId ?? "not specified"}; exam profile ${job.examProfileId ?? "HSC curriculum"}. Additional reviewer constraints: ${job.requestInstructions}` }] });
    const generatedContent = generated.choices[0]?.message?.content;
    if (typeof generatedContent !== "string") throw new Error("Generation model returned no textual structured candidate");
    const candidate = parseCandidate(JSON.parse(generatedContent));
    await db.update(aiQuestionGenerationJobs).set({ status: "generated", generatedCandidate: candidate }).where(eq(aiQuestionGenerationJobs.id, input.jobId));
    await db.update(aiQuestionGenerationJobs).set({ status: "answer_verification_running" }).where(eq(aiQuestionGenerationJobs.id, input.jobId));
    const verified = await invokeLLM({ model: verifier, maxTokens: 1400, response_format: verificationSchema, messages: [{ role: "system", content: `Independently verify this proposed MCQ using only the authorised evidence below. Do not defer to the candidate's stated answer. Mark supported false if evidence is insufficient, facts conflict, the calculation cannot be independently checked, or another option is correct. Return only the required structured result.\n\n${evidenceText}` }, { role: "user", content: JSON.stringify(candidate) }] });
    const verificationContent = verified.choices[0]?.message?.content;
    if (typeof verificationContent !== "string") throw new Error("Verification model returned no textual structured result");
    const verification = JSON.parse(verificationContent) as Verification;
    const passed = independentlyVerified(candidate.correctOptionIndex, verification);
    await db.update(aiQuestionGenerationJobs).set({ status: passed ? "answer_verified" : "answer_verification_failed", verificationResult: verification, failureReason: passed ? null : "Independent answer verification did not confirm the generated key" }).where(eq(aiQuestionGenerationJobs.id, input.jobId));
    await db.insert(auditLogs).values({ actorUserId: input.actorUserId, action: passed ? "ai_generation.answer_verified" : "ai_generation.answer_verification_failed", entityType: "ai_generation_job", entityId: String(input.jobId), metadata: { generationModel: generator, verificationModel: verifier } });
    return { outcome: passed ? "answer_verified" as const : "verification_failed" as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation pipeline failed";
    await db.update(aiQuestionGenerationJobs).set({ status: "draft", failureReason: message }).where(eq(aiQuestionGenerationJobs.id, input.jobId));
    throw error;
  }
}

export async function submitVerifiedAiJobForHumanReview(input: { jobId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [job] = await db.select().from(aiQuestionGenerationJobs).where(eq(aiQuestionGenerationJobs.id, input.jobId)).limit(1);
  if (!job || job.status !== "answer_verified" || !job.generatedCandidate || !job.verificationResult) return { outcome: "not_verified" as const };
  const candidate = parseCandidate(job.generatedCandidate);
  const sources = await db.select({ sourceVersionId: aiGenerationJobSources.sourceVersionId, pageReference: aiGenerationJobSources.pageReference }).from(aiGenerationJobSources).where(eq(aiGenerationJobSources.jobId, input.jobId)).limit(1);
  if (!sources[0]) return { outcome: "no_source" as const };
  const questionId = await createReviewQuestion({ academicYearId: job.academicYearId, subjectId: job.subjectId, bookId: job.bookId, chapterId: job.chapterId, topicId: job.topicId ?? undefined, conceptId: job.conceptId ?? undefined, contentLanguage: job.contentLanguage, prompt: candidate.prompt, explanation: candidate.explanation, difficulty: job.difficulty, options: candidate.options.map((text, index) => ({ text, isCorrect: index === candidate.correctOptionIndex })), sourceVersionId: sources[0].sourceVersionId, pageReference: sources[0].pageReference, intelligence: { examProfileId: job.examProfileId ?? undefined, provenance: "generated_from_curriculum", verificationStatus: "human_reviewed", cognitiveLevel: candidate.cognitiveLevel, reasoningMode: candidate.reasoningMode, difficultyScore: candidate.difficultyScore, formulaUsed: candidate.formulaUsed, commonMistake: candidate.commonMistake, generationBasis: `AI job #${job.id}; independently answer-verified; ${candidate.generationBasis}` }, actorUserId: input.actorUserId });
  await db.update(aiQuestionGenerationJobs).set({ status: "human_review", submittedQuestionId: questionId, reviewedByUserId: input.actorUserId, reviewedAt: new Date() }).where(eq(aiQuestionGenerationJobs.id, input.jobId));
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, action: "ai_generation.sent_to_human_review", entityType: "ai_generation_job", entityId: String(input.jobId), metadata: { questionId } });
  return { outcome: "submitted" as const, questionId };
}

export async function reviewAiGenerationJob(input: { jobId: number; actorUserId: number; status: "rejected" | "archived" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(aiQuestionGenerationJobs).set({ status: input.status, reviewedByUserId: input.actorUserId, reviewedAt: new Date() }).where(and(eq(aiQuestionGenerationJobs.id, input.jobId), inArray(aiQuestionGenerationJobs.status, ["draft", "generated", "answer_verification_failed", "answer_verified"])));
  if (!result[0].affectedRows) return false;
  await db.insert(auditLogs).values({ actorUserId: input.actorUserId, action: `ai_generation.${input.status}`, entityType: "ai_generation_job", entityId: String(input.jobId), metadata: {} });
  return true;
}

export async function getAiGenerationJobs() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: aiQuestionGenerationJobs.id, status: aiQuestionGenerationJobs.status, contentLanguage: aiQuestionGenerationJobs.contentLanguage, difficulty: aiQuestionGenerationJobs.difficulty, requestInstructions: aiQuestionGenerationJobs.requestInstructions, generatedCandidate: aiQuestionGenerationJobs.generatedCandidate, verificationResult: aiQuestionGenerationJobs.verificationResult, failureReason: aiQuestionGenerationJobs.failureReason, generationModel: aiQuestionGenerationJobs.generationModel, verificationModel: aiQuestionGenerationJobs.verificationModel, submittedQuestionId: aiQuestionGenerationJobs.submittedQuestionId, createdAt: aiQuestionGenerationJobs.createdAt, subject: subjects.nameEn, chapter: chapters.titleEn, sourcePage: aiQuestionGenerationJobs.pageReference })
    .from(aiQuestionGenerationJobs).innerJoin(subjects, eq(aiQuestionGenerationJobs.subjectId, subjects.id)).innerJoin(chapters, eq(aiQuestionGenerationJobs.chapterId, chapters.id)).orderBy(desc(aiQuestionGenerationJobs.createdAt)).limit(60);
}
