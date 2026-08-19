import { and, desc, eq, inArray, like, sql } from "drizzle-orm";
import { attemptAnswers, attemptIntegrityEvents, books, chapterCheatSheets, chapters, examAttempts, leaderboardScores, mistakes, questionComments, questionOptions, questionSources, questions, questionStems, sourceVersions, subjects, users } from "../drizzle/schema";
import { scoreMcqExam, type McqSelection } from "../shared/mcq";
import { isReviewDue, nextReviewAt } from "../shared/spacedReview";
import { shouldFinalizeExpiredAttempt } from "../shared/attemptExpiry";
import { buildExpiredAttemptFinalization, type FrozenAttemptQuestion } from "../shared/expiredAttemptFlow";
import { getDb } from "./db";

export async function getLeaderboard(periodType: "global" | "weekly", periodKey: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    userId: leaderboardScores.userId,
    name: users.name,
    netMarks: leaderboardScores.netMarks,
    attemptsCount: leaderboardScores.attemptsCount,
    updatedAt: leaderboardScores.updatedAt,
  }).from(leaderboardScores)
    .innerJoin(users, eq(leaderboardScores.userId, users.id))
    .where(and(eq(leaderboardScores.periodType, periodType), eq(leaderboardScores.periodKey, periodKey)))
    .orderBy(desc(leaderboardScores.netMarks), desc(leaderboardScores.attemptsCount))
    .limit(100);
}

export async function getPublishedCheatSheets() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: chapterCheatSheets.id,
    title: chapterCheatSheets.title,
    markdownContent: chapterCheatSheets.markdownContent,
    chapter: chapters.titleEn,
    subject: subjects.nameEn,
    updatedAt: chapterCheatSheets.updatedAt,
  }).from(chapterCheatSheets)
    .innerJoin(chapters, eq(chapterCheatSheets.chapterId, chapters.id))
    .innerJoin(books, eq(chapters.bookId, books.id))
    .innerJoin(subjects, eq(books.subjectId, subjects.id))
    .where(eq(chapterCheatSheets.status, "published"))
    .orderBy(desc(chapterCheatSheets.updatedAt))
    .limit(50);
}

export async function getQuestionComments(questionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: questionComments.id,
    parentCommentId: questionComments.parentCommentId,
    content: questionComments.content,
    createdAt: questionComments.createdAt,
    userName: users.name,
  }).from(questionComments)
    .innerJoin(users, eq(questionComments.userId, users.id))
    .where(and(eq(questionComments.questionId, questionId), eq(questionComments.status, "visible")))
    .orderBy(questionComments.createdAt)
    .limit(200);
}

export async function addQuestionComment(input: { questionId: number; userId: number; content: string; parentCommentId?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const exists = await db.select({ id: questions.id }).from(questions).where(eq(questions.id, input.questionId)).limit(1);
  if (!exists[0]) return undefined;
  const result = await db.insert(questionComments).values({
    questionId: input.questionId,
    userId: input.userId,
    parentCommentId: input.parentCommentId ?? null,
    content: input.content,
  });
  return Number(result[0].insertId);
}

export async function recordImportBatch(input: { userId: number; fileName: string; fileType: "json" | "csv"; totalRows: number; acceptedRows: number; rejectedRows: number; validationReport: unknown }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const { questionImportBatches } = await import("../drizzle/schema");
  const result = await db.insert(questionImportBatches).values({
    importedByUserId: input.userId,
    fileName: input.fileName,
    fileType: input.fileType,
    totalRows: input.totalRows,
    acceptedRows: input.acceptedRows,
    rejectedRows: input.rejectedRows,
    validationReport: input.validationReport,
  });
  return Number(result[0].insertId);
}

function weekKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

async function updateLeaderboard(userId: number, netMarks: number) {
  const db = await getDb();
  if (!db) return;
  const periods = [{ periodType: "global" as const, periodKey: "all-time" }, { periodType: "weekly" as const, periodKey: weekKey() }];
  await Promise.all(periods.map(period => db.insert(leaderboardScores).values({ userId, ...period, netMarks: String(netMarks), attemptsCount: 1 }).onDuplicateKeyUpdate({
    set: {
      netMarks: sql`${leaderboardScores.netMarks} + ${netMarks}`,
      attemptsCount: sql`${leaderboardScores.attemptsCount} + 1`,
    },
  })));
}

export async function submitFrozenAttempt(input: { userId: number; attemptId: number; selections: McqSelection[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(examAttempts).where(and(eq(examAttempts.id, input.attemptId), eq(examAttempts.userId, input.userId), eq(examAttempts.status, "in_progress"))).limit(1);
  const attempt = rows[0];
  if (!attempt) return undefined;
  const frozen = attempt.questionSetSnapshot as unknown as FrozenAttemptQuestion[];
  if (!Array.isArray(frozen) || frozen.length === 0 || !frozen.every(item => typeof item.questionId === "number" && typeof item.correctOptionId === "number")) return undefined;
  const frozenQuestionIds = new Set(frozen.map(question => question.questionId));
  if (input.selections.some(selection => !frozenQuestionIds.has(selection.questionId) || new Set(selection.selectedOptionIds).size !== selection.selectedOptionIds.length)) return undefined;
  const optionRows = await db.select({ id: questionOptions.id, questionId: questionOptions.questionId }).from(questionOptions).where(inArray(questionOptions.questionId, Array.from(frozenQuestionIds)));
  const optionIdsByQuestion = new Map<number, Set<number>>();
  optionRows.forEach(option => optionIdsByQuestion.set(option.questionId, (optionIdsByQuestion.get(option.questionId) ?? new Set()).add(option.id)));
  if (input.selections.some(selection => selection.selectedOptionIds.some(optionId => !optionIdsByQuestion.get(selection.questionId)?.has(optionId)))) return undefined;
  const finalized = buildExpiredAttemptFinalization(frozen, input.selections);
  const result = finalized.result;
  const submittedAt = new Date();
  await db.update(examAttempts).set({ status: submittedAt > attempt.expiresAt ? "expired" : "submitted", submittedAt, score: String(result.netMarks) }).where(eq(examAttempts.id, input.attemptId));
  const existingMistakes = await db.select({ id: mistakes.id, questionId: mistakes.questionId, reviewCount: mistakes.reviewCount }).from(mistakes).where(and(eq(mistakes.userId, input.userId), inArray(mistakes.questionId, frozen.map(question => question.questionId))));
  const existingByQuestion = new Map<number, Array<{ id: number; reviewCount: number }>>();
  existingMistakes.forEach(mistake => existingByQuestion.set(mistake.questionId, [...(existingByQuestion.get(mistake.questionId) ?? []), { id: mistake.id, reviewCount: mistake.reviewCount }]));
  for (const answer of finalized.answers) {
    await db.insert(attemptAnswers).values({
      attemptId: input.attemptId,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId,
      selectedOptionIds: answer.selectedOptionIds,
      isCorrect: answer.isCorrect,
      awardedMarks: String(answer.awardedMarks),
      answeredAt: answer.selectedOptionIds.length ? submittedAt : null,
    }).onDuplicateKeyUpdate({ set: { selectedOptionId: answer.selectedOptionId, selectedOptionIds: answer.selectedOptionIds, isCorrect: answer.isCorrect, awardedMarks: String(answer.awardedMarks), answeredAt: answer.selectedOptionIds.length ? submittedAt : null } });
    const existingForQuestion = existingByQuestion.get(answer.questionId) ?? [];
    if (finalized.mistakeQuestionIds.includes(answer.questionId)) {
      if (existingForQuestion.length) await db.update(mistakes).set({ status: "open", reviewCount: 0, lastReviewedAt: null }).where(and(eq(mistakes.userId, input.userId), eq(mistakes.questionId, answer.questionId)));
      else await db.insert(mistakes).values({ userId: input.userId, questionId: answer.questionId, sourceAttemptId: input.attemptId });
    } else if (answer.isCorrect && existingForQuestion.length) {
      const nextReviewCount = Math.max(...existingForQuestion.map(mistake => mistake.reviewCount)) + 1;
      await db.update(mistakes).set({ reviewCount: nextReviewCount, lastReviewedAt: submittedAt, status: nextReviewCount >= 5 ? "mastered" : "open" }).where(and(eq(mistakes.userId, input.userId), eq(mistakes.questionId, answer.questionId)));
    }
  }
  await updateLeaderboard(input.userId, result.netMarks);
  return result;
}

export async function saveAttemptSelection(input: { userId: number; attemptId: number; questionId: number; selectedOptionIds: number[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select({ id: examAttempts.id, expiresAt: examAttempts.expiresAt, status: examAttempts.status, questionSetSnapshot: examAttempts.questionSetSnapshot }).from(examAttempts)
    .where(and(eq(examAttempts.id, input.attemptId), eq(examAttempts.userId, input.userId))).limit(1);
  const attempt = rows[0];
  if (!attempt || attempt.status !== "in_progress") return false;
  if (Date.now() >= attempt.expiresAt.getTime()) return false;
  const frozen = attempt.questionSetSnapshot as unknown as FrozenAttemptQuestion[];
  if (!Array.isArray(frozen) || !frozen.some(question => question.questionId === input.questionId) || new Set(input.selectedOptionIds).size !== input.selectedOptionIds.length) return false;
  const optionRows = await db.select({ id: questionOptions.id }).from(questionOptions).where(eq(questionOptions.questionId, input.questionId));
  const validOptionIds = new Set(optionRows.map(option => option.id));
  if (input.selectedOptionIds.some(optionId => !validOptionIds.has(optionId))) return false;
  await db.insert(attemptAnswers).values({
    attemptId: input.attemptId,
    questionId: input.questionId,
    selectedOptionId: input.selectedOptionIds[0] ?? null,
    selectedOptionIds: input.selectedOptionIds,
    answeredAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: { selectedOptionId: input.selectedOptionIds[0] ?? null, selectedOptionIds: input.selectedOptionIds, answeredAt: new Date() },
  });
  return true;
}

export async function recordAttemptIntegrityEvent(input: { userId: number; attemptId: number; eventType: "tab_blur" | "visibility_hidden" | "fullscreen_exit"; metadata?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [attempt] = await db.select({ id: examAttempts.id }).from(examAttempts).where(and(eq(examAttempts.id, input.attemptId), eq(examAttempts.userId, input.userId), eq(examAttempts.status, "in_progress"))).limit(1);
  if (!attempt) return false;
  await db.insert(attemptIntegrityEvents).values({ attemptId: input.attemptId, userId: input.userId, eventType: input.eventType, metadata: input.metadata ?? null });
  return true;
}

export async function getMistakeVault(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ id: mistakes.id, questionId: mistakes.questionId, status: mistakes.status, reviewCount: mistakes.reviewCount, lastReviewedAt: mistakes.lastReviewedAt, createdAt: mistakes.createdAt, prompt: questions.prompt, subject: subjects.nameEn, chapter: chapters.titleEn }).from(mistakes)
    .innerJoin(questions, eq(mistakes.questionId, questions.id))
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .leftJoin(chapters, eq(questions.chapterId, chapters.id))
    .where(and(eq(mistakes.userId, userId), eq(mistakes.status, "open")))
    .orderBy(desc(mistakes.createdAt))
    .limit(100);
  return rows.map(row => {
    const base = (row.lastReviewedAt ?? row.createdAt).getTime();
    const nextDueAt = nextReviewAt(new Date(base), row.reviewCount);
    return { ...row, nextReviewAt: nextDueAt, isDue: isReviewDue(new Date(base), row.reviewCount) };
  });
}

type QuestionFilter = { subjectId?: number; chapterId?: number; boardExamYear?: number; boardName?: string; collegePaper?: string; boardStandard?: "board_standard" | "varsity_admission_standard"; admissionTrack?: "du" | "buet" | "medical"; questionType?: "single_mcq" | "multi_statement" | "stem_subquestion"; contentLanguage?: "bn" | "en"; questionIds?: number[]; limit: number };

export async function getPublishedChapterAvailability(subjectId?: number, contentLanguage?: "bn" | "en") {
  const db = await getDb();
  if (!db) return [] as Array<{ subjectId: number; subject: string; chapterId: number; chapter: string; questionCount: number }>;
  const conditions = [eq(questions.status, "published"), eq(sourceVersions.status, "active")];
  if (subjectId) conditions.push(eq(questions.subjectId, subjectId));
  if (contentLanguage) conditions.push(eq(questions.contentLanguage, contentLanguage));
  const rows = await db.select({ questionId: questions.id, subjectId: subjects.id, subject: subjects.nameEn, chapterId: chapters.id, chapter: chapters.titleEn })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
    .innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
    .where(and(...conditions));
  const grouped = new Map<string, { subjectId: number; subject: string; chapterId: number; chapter: string; questionIds: number[] }>();
  for (const row of rows) {
    const key = `${row.subjectId}:${row.chapterId}`;
    const current = grouped.get(key) ?? { subjectId: row.subjectId, subject: row.subject, chapterId: row.chapterId, chapter: row.chapter, questionIds: [] };
    if (!current.questionIds.includes(row.questionId)) current.questionIds.push(row.questionId);
    grouped.set(key, current);
  }
  return Array.from(grouped.values()).map(({ questionIds, ...chapter }) => ({ ...chapter, questionCount: questionIds.length })).sort((a, b) => a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter));
}

export async function getPublishedQuestions(filters: QuestionFilter) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(questions.status, "published")];
  if (filters.subjectId) conditions.push(eq(questions.subjectId, filters.subjectId));
  if (filters.chapterId) conditions.push(eq(questions.chapterId, filters.chapterId));
  if (filters.boardExamYear) conditions.push(eq(questions.boardExamYear, filters.boardExamYear));
  if (filters.boardName) conditions.push(like(questions.boardName, `%${filters.boardName}%`));
  if (filters.collegePaper) conditions.push(like(questions.collegePaper, `%${filters.collegePaper}%`));
  if (filters.boardStandard) conditions.push(eq(questions.boardStandard, filters.boardStandard));
  if (filters.admissionTrack) conditions.push(eq(questions.admissionTrack, filters.admissionTrack));
  if (filters.questionType) conditions.push(eq(questions.questionType, filters.questionType));
  if (filters.contentLanguage) conditions.push(eq(questions.contentLanguage, filters.contentLanguage));
  if (filters.questionIds?.length) conditions.push(inArray(questions.id, filters.questionIds));
  const rows = await db.select({
    id: questions.id, prompt: questions.prompt, questionType: questions.questionType, boardStandard: questions.boardStandard,
    boardName: questions.boardName, boardExamYear: questions.boardExamYear, collegePaper: questions.collegePaper,
    chapterTags: questions.chapterTags, negativeMarkWeight: questions.negativeMarkWeight, explanation: questions.explanation,
    solutionImageUrl: questions.solutionImageUrl, subject: subjects.nameEn, chapter: chapters.titleEn,
    stemContext: questionStems.contextParagraph,
  }).from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .leftJoin(chapters, eq(questions.chapterId, chapters.id))
    .leftJoin(questionStems, eq(questions.stemId, questionStems.id))
    .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
    .innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
    .where(and(...conditions, eq(sourceVersions.status, "active")))
    .orderBy(desc(questions.updatedAt))
    .limit(filters.limit);
  const distinctRows = Array.from(new Map(rows.map(row => [row.id, row])).values());
  if (!distinctRows.length) return [];
  const optionRows = await db.select().from(questionOptions).where(inArray(questionOptions.questionId, distinctRows.map(row => row.id)));
  return distinctRows.map(row => ({ ...row, options: optionRows.filter(option => option.questionId === row.id).map(option => ({ id: option.id, optionKey: option.optionKey, text: option.text, isCorrect: option.isCorrect })) }));
}

export async function startFilteredAttempt(input: { userId: number; filters: QuestionFilter; durationMinutes: number; mistakeRetest?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  let mistakeQuestionIds: number[] = [];
  if (input.mistakeRetest) {
    const queuedMistakes = await getMistakeVault(input.userId);
    const due = queuedMistakes.filter(item => item.isDue);
    mistakeQuestionIds = (due.length ? due : queuedMistakes).slice(0, input.filters.limit).map(item => item.questionId);
    if (!mistakeQuestionIds.length) return undefined;
  }
  const questionsForAttempt = await getPublishedQuestions({ ...input.filters, ...(mistakeQuestionIds.length ? { questionIds: mistakeQuestionIds } : {}) });
  if (!questionsForAttempt.length) return undefined;
  if (input.mistakeRetest) await db.update(mistakes).set({ status: "reviewing" }).where(and(eq(mistakes.userId, input.userId), inArray(mistakes.questionId, questionsForAttempt.map(question => question.id))));
  const frozen = questionsForAttempt.map(question => ({
    questionId: question.id,
    correctOptionId: question.options.find(option => option.isCorrect)?.id,
    subject: question.subject,
    chapter: question.chapter ?? "General",
    marks: 1,
    negativeMarkWeight: Number(question.negativeMarkWeight),
  }));
  if (frozen.some(question => !question.correctOptionId)) throw new Error("Published question is missing a correct option");
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + input.durationMinutes * 60_000);
  const result = await db.insert(examAttempts).values({
    userId: input.userId,
    titleSnapshot: input.mistakeRetest ? "MCQ GURU spaced mistake re-test" : "MCQ GURU filtered practice",
    examVersionSnapshot: "mcq-guru-v1",
    patternVersionSnapshot: input.mistakeRetest ? "mistake-retest-v1" : "filter-snapshot-v1",
    questionSetSnapshot: frozen,
    markingSchemeSnapshot: { marksPerCorrect: 1, negativeMarkPolicy: "per_question", admissionTrack: input.filters.admissionTrack ?? null, maxMarks: frozen.reduce((total, question) => total + question.marks, 0) },
    startedAt,
    expiresAt,
  });
  return {
    attemptId: Number(result[0].insertId),
    startedAt,
    expiresAt,
    questions: questionsForAttempt.map(question => ({
      ...question,
      options: question.options.map(({ isCorrect: _isCorrect, ...option }) => option),
    })),
  };
}

export async function getAttemptResult(userId: number, attemptId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const attempts = await db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, userId))).limit(1);
  const attempt = attempts[0];
  if (!attempt) return undefined;
  if (attempt.status === "in_progress") {
    if (!shouldFinalizeExpiredAttempt(attempt.status, attempt.expiresAt)) return undefined;
    const storedSelections = await db.select({ questionId: attemptAnswers.questionId, selectedOptionIds: attemptAnswers.selectedOptionIds }).from(attemptAnswers).where(eq(attemptAnswers.attemptId, attemptId));
    await submitFrozenAttempt({
      userId,
      attemptId,
      selections: storedSelections.map(item => ({ questionId: item.questionId, selectedOptionIds: Array.isArray(item.selectedOptionIds) ? item.selectedOptionIds as number[] : [] })),
    });
    return getAttemptResult(userId, attemptId);
  }
  const answers = await db.select({ questionId: attemptAnswers.questionId, selectedOptionId: attemptAnswers.selectedOptionId, isCorrect: attemptAnswers.isCorrect, awardedMarks: attemptAnswers.awardedMarks, prompt: questions.prompt, explanation: questions.explanation, solutionImageUrl: questions.solutionImageUrl, subject: subjects.nameEn, chapter: chapters.titleEn }).from(attemptAnswers)
    .innerJoin(questions, eq(attemptAnswers.questionId, questions.id))
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .leftJoin(chapters, eq(questions.chapterId, chapters.id))
    .where(eq(attemptAnswers.attemptId, attemptId));
  return { attempt, answers };
}
