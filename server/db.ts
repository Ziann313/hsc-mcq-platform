import { and, asc, desc, eq, inArray, like } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, aiConversations, aiMessages, studentProfiles, studentNotificationPreferences, users, books, chapters, concepts, knowledgeChunks, sourceVersions, sources, examAttempts, attemptAnswers, auditLogs, questions, subjects, academicGroups, notifications, admissionNotices, questionOptions, questionSources, questionVersions, examPatternSources, examPatternVersions, examProfiles, academicYears, dailyChallengeNotificationDeliveries, mistakes, questionIntelligence, topics } from "../drizzle/schema";
import { ENV } from './_core/env';
import { buildAdmissionBenchmarks, type BenchmarkAttempt } from "../shared/admissionBenchmark";
import { validateAdmissionPatternActivation } from "../shared/admissionPattern";
import { duplicateRisk, normalizeQuestionText, validateQuestionIntelligence, type QuestionIntelligenceInput } from "../shared/questionIntelligence";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getStudentProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  return rows[0];
}

type TutorConversationMessageInput = { role: "user" | "assistant"; content: string };

export async function getTutorConversationHistory(userId: number) {
  const db = await getDb();
  if (!db) return [] as Array<{ id: number; title: string; lastMessagePreview: string; updatedAt: Date }>;
  const conversations = await db.select({ id: aiConversations.id, title: aiConversations.title, updatedAt: aiConversations.updatedAt })
    .from(aiConversations)
    .where(eq(aiConversations.userId, userId))
    .orderBy(desc(aiConversations.updatedAt))
    .limit(30);
  if (!conversations.length) return [];
  const messages = await db.select({ conversationId: aiMessages.conversationId, content: aiMessages.content })
    .from(aiMessages)
    .where(inArray(aiMessages.conversationId, conversations.map(conversation => conversation.id)))
    .orderBy(desc(aiMessages.createdAt), desc(aiMessages.id));
  const latestMessage = new Map<number, string>();
  for (const message of messages) if (!latestMessage.has(message.conversationId)) latestMessage.set(message.conversationId, message.content);
  return conversations.map(conversation => ({
    ...conversation,
    lastMessagePreview: (latestMessage.get(conversation.id) ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
  }));
}

export async function getTutorConversationMessages(userId: number, conversationId: number) {
  const db = await getDb();
  if (!db) return null;
  const conversation = await db.select({ id: aiConversations.id, title: aiConversations.title })
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
    .limit(1);
  if (!conversation[0]) return null;
  const messages = await db.select({ id: aiMessages.id, role: aiMessages.role, content: aiMessages.content, createdAt: aiMessages.createdAt })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt), asc(aiMessages.id));
  return { ...conversation[0], messages };
}

export async function saveTutorConversation(input: { userId: number; conversationId?: number; title: string; messages: TutorConversationMessageInput[] }) {
  const db = await getDb();
  if (!db) return null;
  let conversationId = input.conversationId;
  if (conversationId) {
    const owned = await db.select({ id: aiConversations.id }).from(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, input.userId)))
      .limit(1);
    if (!owned[0]) return null;
    await db.update(aiConversations).set({ title: input.title, updatedAt: new Date() }).where(eq(aiConversations.id, conversationId));
  } else {
    const created = await db.insert(aiConversations).values({ userId: input.userId, title: input.title });
    conversationId = Number(created[0].insertId);
  }
  await db.insert(aiMessages).values(input.messages.map(message => ({ conversationId: conversationId!, role: message.role, content: message.content })));
  return conversationId;
}

type NotificationPreferenceState = {
  studyEnabled: boolean;
  dailyChallengeEnabled: boolean;
  admissionEnabled: boolean;
  contentEnabled: boolean;
};

const defaultNotificationPreferences: NotificationPreferenceState = {
  studyEnabled: true,
  dailyChallengeEnabled: false,
  admissionEnabled: true,
  contentEnabled: true,
};

type NotificationPreferenceInput = Partial<NotificationPreferenceState>;
type NotificationType = "study" | "admission" | "content" | "account" | "system";
type NotificationPriority = "normal" | "high" | "critical";

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) return defaultNotificationPreferences;
  const rows = await db.select().from(studentNotificationPreferences).where(eq(studentNotificationPreferences.userId, userId)).limit(1);
  return rows[0] ?? defaultNotificationPreferences;
}

export async function saveNotificationPreferences(userId: number, input: NotificationPreferenceInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const next = { ...defaultNotificationPreferences, ...input };
  await db.insert(studentNotificationPreferences).values({ userId, ...next }).onDuplicateKeyUpdate({ set: next });
  return getNotificationPreferences(userId);
}

async function shouldDeliverNotification(userId: number, type: NotificationType, priority: NotificationPriority) {
  if (priority === "critical" || type === "account" || type === "system") return true;
  const preferences = await getNotificationPreferences(userId);
  return type === "study"
    ? preferences.studyEnabled
    : type === "admission"
      ? preferences.admissionEnabled
      : preferences.contentEnabled;
}

export async function saveStudentProfile(userId: number, input: {
  language: "bn" | "en";
  academicYear: string;
  session: string;
  group: "science" | "business" | "humanities";
  targetExam: "hsc" | "medical" | "engineering" | "university" | "multiple";
  institution?: string;
  dailyStudyMinutes: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(studentProfiles).values({
    userId,
    preferredLanguage: input.language,
    academicYear: input.academicYear,
    session: input.session,
    group: input.group,
    targetExam: input.targetExam,
    institution: input.institution || null,
    dailyStudyMinutes: input.dailyStudyMinutes,
    onboardingCompletedAt: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      preferredLanguage: input.language,
      academicYear: input.academicYear,
      session: input.session,
      group: input.group,
      targetExam: input.targetExam,
      institution: input.institution || null,
      dailyStudyMinutes: input.dailyStudyMinutes,
      onboardingCompletedAt: new Date(),
    },
  });
}

export async function createExamAttempt(userId: number, input: {
  title: string;
  examVersion: string;
  patternVersion: string;
  questionSet: unknown;
  marksPerCorrect: number;
  negativeMarkPerWrong: number;
  startedAt: Date;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(examAttempts).values({
    userId,
    titleSnapshot: input.title,
    examVersionSnapshot: input.examVersion,
    patternVersionSnapshot: input.patternVersion,
    questionSetSnapshot: input.questionSet,
    markingSchemeSnapshot: {
      marksPerCorrect: input.marksPerCorrect,
      negativeMarkPerWrong: input.negativeMarkPerWrong,
    },
    startedAt: input.startedAt,
    expiresAt: input.expiresAt,
  });
  return result[0].insertId;
}

export async function getActiveSourceEvidence(query: string, academicYear: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    content: knowledgeChunks.content,
    pageReference: knowledgeChunks.pageReference,
    bookTitle: books.titleEn,
    chapterTitle: chapters.titleEn,
  }).from(knowledgeChunks)
    .innerJoin(sourceVersions, eq(knowledgeChunks.sourceVersionId, sourceVersions.id))
    .innerJoin(academicYears, eq(knowledgeChunks.academicYearId, academicYears.id))
    .leftJoin(books, eq(knowledgeChunks.bookId, books.id))
    .leftJoin(chapters, eq(knowledgeChunks.chapterId, chapters.id))
    .where(and(eq(sourceVersions.status, "active"), eq(academicYears.name, academicYear), like(knowledgeChunks.content, `%${query.slice(0, 120)}%`)))
    .orderBy(desc(knowledgeChunks.id))
    .limit(4);
  return rows.map(row => ({
    content: row.content,
    pageReference: row.pageReference,
    bookTitle: row.bookTitle ?? "Approved source",
    chapterTitle: row.chapterTitle ?? "Selected section",
  }));
}

export async function reviewQuestion(input: {
  questionId: number;
  status: "approved" | "needs_review" | "archived";
  actorUserId: number;
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(questions)
    .set({ status: input.status })
    .where(eq(questions.id, input.questionId));
  if (result[0].affectedRows === 0) return false;
  if (input.status === "approved") {
    await db.update(questionVersions)
      .set({ reviewStatus: "approved" })
      .where(and(eq(questionVersions.questionId, input.questionId), eq(questionVersions.version, 1)));
    await db.update(questionIntelligence)
      .set({ verificationStatus: "approved" })
      .where(eq(questionIntelligence.questionId, input.questionId));
  }
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: `question.${input.status}`,
    entityType: "question",
    entityId: String(input.questionId),
    metadata: { note: input.note ?? null },
  });
  return true;
}

export async function getApprovedQuestionPublicationQueue() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: questions.id,
    prompt: questions.prompt,
    difficulty: questions.difficulty,
    subject: subjects.nameEn,
    version: questions.currentVersion,
    sourceVersionStatus: sourceVersions.status,
    sourceTitle: sources.title,
    pageReference: questionSources.pageReference,
  }).from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
    .innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
    .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
    .where(eq(questions.status, "approved"))
    .orderBy(desc(questions.updatedAt))
    .limit(30);
}

export async function publishApprovedQuestion(input: { questionId: number; actorUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const question = await db.select({ id: questions.id, status: questions.status, currentVersion: questions.currentVersion, academicYearId: questions.academicYearId, subjectId: questions.subjectId, bookId: questions.bookId, chapterId: questions.chapterId })
    .from(questions).where(eq(questions.id, input.questionId)).limit(1);
  if (!question[0]) return { outcome: "not_found" as const };
  if (question[0].status !== "approved") return { outcome: "not_approved" as const };
  if (!question[0].bookId || !question[0].chapterId) return { outcome: "invalid_curriculum" as const };
  const [curriculum] = await db.select({ subjectYearId: subjects.academicYearId, bookSubjectId: books.subjectId, chapterBookId: chapters.bookId })
    .from(subjects).innerJoin(books, eq(books.id, question[0].bookId)).innerJoin(chapters, eq(chapters.id, question[0].chapterId))
    .where(eq(subjects.id, question[0].subjectId)).limit(1);
  if (!curriculum || curriculum.subjectYearId !== question[0].academicYearId || curriculum.bookSubjectId !== question[0].subjectId || curriculum.chapterBookId !== question[0].bookId) return { outcome: "invalid_curriculum" as const };
  const evidence = await db.select({ sourceVersionStatus: sourceVersions.status, pageReference: questionSources.pageReference })
    .from(questionSources)
    .innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
    .where(eq(questionSources.questionId, input.questionId));
  if (!evidence.length || evidence.some(item => item.sourceVersionStatus !== "active" || !item.pageReference.trim())) return { outcome: "source_not_active" as const };
  const options = await db.select({ isCorrect: questionOptions.isCorrect })
    .from(questionOptions).where(eq(questionOptions.questionId, input.questionId));
  if (options.length < 2 || options.filter(option => option.isCorrect).length !== 1) return { outcome: "invalid_options" as const };
  const [intelligence] = await db.select({ verificationStatus: questionIntelligence.verificationStatus })
    .from(questionIntelligence).where(eq(questionIntelligence.questionId, input.questionId)).limit(1);
  if (intelligence && intelligence.verificationStatus !== "approved") return { outcome: "intelligence_not_reviewed" as const };
  await db.update(questions).set({ status: "published" }).where(eq(questions.id, input.questionId));
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: "question.published",
    entityType: "question",
    entityId: String(input.questionId),
    metadata: { currentVersion: question[0].currentVersion, sourceReferences: evidence.map(item => item.pageReference) },
  });
  return { outcome: "published" as const };
}

export async function getPublishedContentAvailability(contentLanguage?: "bn" | "en", groupSlug?: "science" | "humanities" | "business-studies") {
  const db = await getDb();
  if (!db) return { publishedQuestionCount: 0, subjects: [] as Array<{ subjectId: number; name: string; nameEn: string; nameBn: string; groupSlug: string | null; questionCount: number }> };
  const published = await db.select({ questionId: questions.id, subjectId: subjects.id, name: subjects.nameEn, nameEn: subjects.nameEn, nameBn: subjects.nameBn, groupSlug: academicGroups.slug })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .leftJoin(academicGroups, eq(subjects.groupId, academicGroups.id))
    .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
    .innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
    .where(and(eq(questions.status, "published"), eq(sourceVersions.status, "active"), ...(contentLanguage ? [eq(questions.contentLanguage, contentLanguage)] : []), ...(groupSlug ? [eq(academicGroups.slug, groupSlug)] : [])));
  const subjectCounts = new Map<number, { subjectId: number; name: string; nameEn: string; nameBn: string; groupSlug: string | null; questionCount: number }>();
  for (const row of Array.from(new Map(published.map(row => [row.questionId, row])).values())) {
    const current = subjectCounts.get(row.subjectId) ?? { subjectId: row.subjectId, name: row.name, nameEn: row.nameEn, nameBn: row.nameBn, groupSlug: row.groupSlug, questionCount: 0 };
    current.questionCount += 1;
    subjectCounts.set(row.subjectId, current);
  }
  return { publishedQuestionCount: published.length, subjects: Array.from(subjectCounts.values()).sort((a, b) => b.questionCount - a.questionCount) };
}

export async function getCurriculumCoverageSummary() {
  const empty = { groups: [] as Array<{ slug: string; nameEn: string; nameBn: string; registeredSubjectCount: number; registeredChapterCount: number; publishedSubjectCount: number; publishedChapterCount: number; publishedQuestionCount: number }>, scienceChapters: [] as Array<{ subjectId: number; subject: string; chapterId: number; chapter: string; questionCount: number }> };
  const db = await getDb();
  if (!db) return empty;

  const groups = await db.select({ id: academicGroups.id, slug: academicGroups.slug, nameEn: academicGroups.nameEn, nameBn: academicGroups.nameBn }).from(academicGroups);
  const coreGroups = groups.filter(group => ["science", "humanities", "business-studies"].includes(group.slug));
  const roster = await db.select({ groupId: academicGroups.id, subjectId: subjects.id, chapterId: chapters.id })
    .from(subjects)
    .leftJoin(academicGroups, eq(subjects.groupId, academicGroups.id))
    .leftJoin(books, eq(books.subjectId, subjects.id))
    .leftJoin(chapters, eq(chapters.bookId, books.id));
  const released = await db.select({ questionId: questions.id, groupId: academicGroups.id, subjectId: subjects.id, subject: subjects.nameEn, chapterId: chapters.id, chapter: chapters.titleEn })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .leftJoin(academicGroups, eq(subjects.groupId, academicGroups.id))
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
    .innerJoin(sourceVersions, eq(sourceVersions.id, questionSources.sourceVersionId))
    .where(and(eq(questions.status, "published"), eq(sourceVersions.status, "active")));

  const counters = new Map(coreGroups.map(group => [group.id, { registeredSubjects: new Set<number>(), registeredChapters: new Set<number>(), publishedSubjects: new Set<number>(), publishedChapters: new Set<number>(), publishedQuestionIds: new Set<number>() }]));
  for (const item of roster) {
    if (!item.groupId) continue;
    const counter = counters.get(item.groupId);
    if (!counter) continue;
    counter.registeredSubjects.add(item.subjectId);
    if (item.chapterId) counter.registeredChapters.add(item.chapterId);
  }
  const chapterCounts = new Map<number, { subjectId: number; subject: string; chapterId: number; chapter: string; questionIds: Set<number> }>();
  for (const item of released) {
    if (!item.groupId) continue;
    const counter = counters.get(item.groupId);
    if (!counter) continue;
    counter.publishedSubjects.add(item.subjectId);
    counter.publishedChapters.add(item.chapterId);
    counter.publishedQuestionIds.add(item.questionId);
    if (coreGroups.find(group => group.id === item.groupId)?.slug === "science") {
      const chapter = chapterCounts.get(item.chapterId) ?? { subjectId: item.subjectId, subject: item.subject, chapterId: item.chapterId, chapter: item.chapter, questionIds: new Set<number>() };
      chapter.questionIds.add(item.questionId);
      chapterCounts.set(item.chapterId, chapter);
    }
  }
  return {
    groups: coreGroups.map(group => {
      const counter = counters.get(group.id)!;
      return { slug: group.slug, nameEn: group.nameEn, nameBn: group.nameBn, registeredSubjectCount: counter.registeredSubjects.size, registeredChapterCount: counter.registeredChapters.size, publishedSubjectCount: counter.publishedSubjects.size, publishedChapterCount: counter.publishedChapters.size, publishedQuestionCount: counter.publishedQuestionIds.size };
    }),
    scienceChapters: Array.from(chapterCounts.values()).map(chapter => ({ subjectId: chapter.subjectId, subject: chapter.subject, chapterId: chapter.chapterId, chapter: chapter.chapter, questionCount: chapter.questionIds.size })).sort((a, b) => a.subject.localeCompare(b.subject) || a.chapter.localeCompare(b.chapter)),
  };
}

export async function getStudentProgressSummary(userId: number) {
  const db = await getDb();
  if (!db) return { completedAttempts: 0, answeredQuestions: 0, correctAnswers: 0, accuracy: null as number | null, averageNetMarks: null as number | null, studyStreakDays: 0 };
  const attempts = await db.select({ status: examAttempts.status, score: examAttempts.score, submittedAt: examAttempts.submittedAt })
    .from(examAttempts).where(eq(examAttempts.userId, userId));
  const completed = attempts.filter(attempt => attempt.status === "submitted" || attempt.status === "expired");
  const answers = await db.select({ isCorrect: attemptAnswers.isCorrect, answeredAt: attemptAnswers.answeredAt })
    .from(attemptAnswers)
    .innerJoin(examAttempts, eq(attemptAnswers.attemptId, examAttempts.id))
    .where(eq(examAttempts.userId, userId));
  const answeredQuestions = answers.filter(answer => Boolean(answer.answeredAt)).length;
  const correctAnswers = answers.filter(answer => answer.isCorrect === true).length;
  const accuracy = answeredQuestions ? Math.round((correctAnswers / answeredQuestions) * 100) : null;
  const scored = completed.map(attempt => Number(attempt.score ?? 0)).filter(score => Number.isFinite(score));
  const averageNetMarks = scored.length ? Math.round((scored.reduce((sum, score) => sum + score, 0) / scored.length) * 100) / 100 : null;
  const activityDays = Array.from(new Set([...completed.map(attempt => attempt.submittedAt), ...answers.map(answer => answer.answeredAt)].filter((date): date is Date => Boolean(date)).map(date => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))))
    .sort((a, b) => b - a);
  let studyStreakDays = 0;
  if (activityDays.length) {
    studyStreakDays = 1;
    for (let index = 1; index < activityDays.length; index += 1) {
      if (activityDays[index - 1]! - activityDays[index]! !== 86_400_000) break;
      studyStreakDays += 1;
    }
  }
  return { completedAttempts: completed.length, answeredQuestions, correctAnswers, accuracy, averageNetMarks, studyStreakDays };
}

export async function getExamReadinessSummary(userId: number) {
  const db = await getDb();
  const empty = { totalAnswered: 0, overallAccuracy: null as number | null, subjectAccuracy: [] as Array<{ subjectId: number; subject: string; total: number; correct: number; accuracy: number }>, weakChapters: [] as Array<{ chapterId: number | null; chapter: string; subject: string; total: number; correct: number; accuracy: number }>, openMistakeCount: 0, recommendedFocus: null as null | { subjectId: number; subject: string; chapterId: number | null; chapter: string; accuracy: number } };
  if (!db) return empty;
  const answered = await db.select({ subjectId: subjects.id, subject: subjects.nameEn, chapterId: chapters.id, chapter: chapters.titleEn, isCorrect: attemptAnswers.isCorrect, answeredAt: attemptAnswers.answeredAt })
    .from(attemptAnswers)
    .innerJoin(examAttempts, eq(attemptAnswers.attemptId, examAttempts.id))
    .innerJoin(questions, eq(attemptAnswers.questionId, questions.id))
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .leftJoin(chapters, eq(questions.chapterId, chapters.id))
    .where(eq(examAttempts.userId, userId));
  const usable = answered.filter(answer => Boolean(answer.answeredAt));
  const [mistakeCount] = await db.select({ count: sql<number>`count(*)` }).from(mistakes).where(and(eq(mistakes.userId, userId), eq(mistakes.status, "open")));
  if (!usable.length) return { ...empty, openMistakeCount: Number(mistakeCount?.count ?? 0) };
  const subjectsById = new Map<number, { subjectId: number; subject: string; total: number; correct: number }>();
  const chaptersByKey = new Map<string, { chapterId: number | null; chapter: string; subject: string; total: number; correct: number }>();
  for (const answer of usable) {
    const subject = subjectsById.get(answer.subjectId) ?? { subjectId: answer.subjectId, subject: answer.subject, total: 0, correct: 0 };
    subject.total += 1; if (answer.isCorrect) subject.correct += 1; subjectsById.set(answer.subjectId, subject);
    const chapterKey = `${answer.subjectId}:${answer.chapterId ?? "general"}`;
    const chapter = chaptersByKey.get(chapterKey) ?? { chapterId: answer.chapterId, chapter: answer.chapter ?? "General", subject: answer.subject, total: 0, correct: 0 };
    chapter.total += 1; if (answer.isCorrect) chapter.correct += 1; chaptersByKey.set(chapterKey, chapter);
  }
  const subjectAccuracy = Array.from(subjectsById.values()).map(item => ({ ...item, accuracy: Math.round((item.correct / item.total) * 100) })).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
  const weakChapters = Array.from(chaptersByKey.values()).map(item => ({ ...item, accuracy: Math.round((item.correct / item.total) * 100) })).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total).slice(0, 3);
  const focus = weakChapters[0] ?? (subjectAccuracy[0] ? { subject: subjectAccuracy[0].subject, chapter: "General", chapterId: null, accuracy: subjectAccuracy[0].accuracy } : null);
  const recommendedFocus = focus && subjectAccuracy.find(item => item.subject === focus.subject) ? { subjectId: subjectAccuracy.find(item => item.subject === focus.subject)!.subjectId, subject: focus.subject, chapterId: focus.chapterId, chapter: focus.chapter, accuracy: focus.accuracy } : null;
  return { totalAnswered: usable.length, overallAccuracy: Math.round((usable.filter(answer => answer.isCorrect).length / usable.length) * 100), subjectAccuracy, weakChapters, openMistakeCount: Number(mistakeCount?.count ?? 0), recommendedFocus };
}

export async function getDailyStudyGuide(userId: number) {
  const db = await getDb();
  const empty = { groups: [] as Array<{ groupId: number | null; group: string; subjects: Array<{ subjectId: number; subject: string; chapters: Array<{ chapterId: number; chapter: string; questionCount: number; answered: number; correct: number; accuracy: number | null; lastPracticedAt: Date | null; openMistakes: number; estimatedMinutes: number }> }> }>, recommendedChapters: [] as Array<{ subjectId: number; subject: string; chapterId: number; chapter: string; questionCount: number; answered: number; correct: number; accuracy: number | null; lastPracticedAt: Date | null; openMistakes: number; estimatedMinutes: number }>, recommendedGroupId: null as number | null, recommendedGroup: null as string | null };
  if (!db) return empty;
  const profile = await db.select({ group: studentProfiles.group }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  const preferredGroupSlug = profile[0]?.group === "business" ? "business-studies" : profile[0]?.group;
  const published = await db.select({ questionId: questions.id, groupId: academicGroups.id, group: academicGroups.nameEn, groupSlug: academicGroups.slug, subjectId: subjects.id, subject: subjects.nameEn, chapterId: chapters.id, chapter: chapters.titleEn })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .leftJoin(academicGroups, eq(subjects.groupId, academicGroups.id))
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
    .innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
    .where(and(eq(questions.status, "published"), eq(sourceVersions.status, "active")));
  const chapterByQuestionId = new Map<number, { groupId: number | null; group: string; groupSlug: string | null; subjectId: number; subject: string; chapterId: number; chapter: string }>();
  for (const item of published) if (!chapterByQuestionId.has(item.questionId)) chapterByQuestionId.set(item.questionId, { groupId: item.groupId, group: item.group ?? "General", groupSlug: item.groupSlug, subjectId: item.subjectId, subject: item.subject, chapterId: item.chapterId, chapter: item.chapter });
  const cards = new Map<number, { groupId: number | null; group: string; groupSlug: string | null; subjectId: number; subject: string; chapterId: number; chapter: string; questionCount: number; answered: number; correct: number; lastPracticedAt: Date | null; openMistakes: number }>();
  for (const item of Array.from(chapterByQuestionId.values())) {
    const card = cards.get(item.chapterId) ?? { ...item, questionCount: 0, answered: 0, correct: 0, lastPracticedAt: null, openMistakes: 0 };
    card.questionCount += 1; cards.set(item.chapterId, card);
  }
  if (!cards.size) return empty;
  const answers = await db.select({ questionId: attemptAnswers.questionId, isCorrect: attemptAnswers.isCorrect, answeredAt: attemptAnswers.answeredAt }).from(attemptAnswers).innerJoin(examAttempts, eq(attemptAnswers.attemptId, examAttempts.id)).where(eq(examAttempts.userId, userId));
  for (const answer of answers) {
    if (!answer.answeredAt) continue;
    const meta = chapterByQuestionId.get(answer.questionId); const card = meta ? cards.get(meta.chapterId) : undefined;
    if (!card) continue;
    card.answered += 1; if (answer.isCorrect) card.correct += 1;
    if (!card.lastPracticedAt || answer.answeredAt > card.lastPracticedAt) card.lastPracticedAt = answer.answeredAt;
  }
  const openMistakes = await db.select({ questionId: mistakes.questionId }).from(mistakes).where(and(eq(mistakes.userId, userId), eq(mistakes.status, "open")));
  for (const item of openMistakes) { const meta = chapterByQuestionId.get(item.questionId); const card = meta ? cards.get(meta.chapterId) : undefined; if (card) card.openMistakes += 1; }
  const chapterCards = Array.from(cards.values()).map(card => ({ ...card, accuracy: card.answered ? Math.round((card.correct / card.answered) * 100) : null, estimatedMinutes: Math.max(5, Math.ceil(card.questionCount * 1.2)) }));
  const groupMap = new Map<string, { groupId: number | null; group: string; subjects: Map<number, { subjectId: number; subject: string; chapters: typeof chapterCards }> }>();
  for (const card of chapterCards) {
    const groupKey = String(card.groupId ?? "general"); const group = groupMap.get(groupKey) ?? { groupId: card.groupId, group: card.group, subjects: new Map() };
    const subject = group.subjects.get(card.subjectId) ?? { subjectId: card.subjectId, subject: card.subject, chapters: [] };
    subject.chapters.push(card); group.subjects.set(card.subjectId, subject); groupMap.set(groupKey, group);
  }
  const groups = Array.from(groupMap.values()).map(group => ({ groupId: group.groupId, group: group.group, subjects: Array.from(group.subjects.values()).map(subject => ({ ...subject, chapters: subject.chapters.sort((a, b) => (a.accuracy ?? -1) - (b.accuracy ?? -1) || b.openMistakes - a.openMistakes || a.chapter.localeCompare(b.chapter)) })).sort((a, b) => a.subject.localeCompare(b.subject)) })).sort((a, b) => a.group.localeCompare(b.group));
  const groupSpecificChapters = preferredGroupSlug ? chapterCards.filter(chapter => chapter.groupSlug === preferredGroupSlug) : [];
  const recommendedPool = groupSpecificChapters.length ? groupSpecificChapters : chapterCards;
  const recommendedChapters = [...recommendedPool].sort((a, b) => Number(Boolean(a.answered)) - Number(Boolean(b.answered)) || (a.accuracy ?? -1) - (b.accuracy ?? -1) || b.openMistakes - a.openMistakes || a.questionCount - b.questionCount).slice(0, 3);
  const recommendationGroup = preferredGroupSlug ? groups.find(group => groupSpecificChapters[0]?.groupId === group.groupId) : undefined;
  return { groups, recommendedChapters, recommendedGroupId: recommendationGroup?.groupId ?? null, recommendedGroup: recommendationGroup?.group ?? null };
}

export async function getQuestionReviewQueue() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: questions.id,
    prompt: questions.prompt,
    status: questions.status,
    difficulty: questions.difficulty,
    subject: subjects.nameEn,
    version: questions.currentVersion,
    provenance: questionIntelligence.provenance,
    verificationStatus: questionIntelligence.verificationStatus,
    cognitiveLevel: questionIntelligence.cognitiveLevel,
    reasoningMode: questionIntelligence.reasoningMode,
    difficultyScore: questionIntelligence.difficultyScore,
    importanceScore: questionIntelligence.importanceScore,
    formulaUsed: questionIntelligence.formulaUsed,
    commonMistake: questionIntelligence.commonMistake,
    generationBasis: questionIntelligence.generationBasis,
    sourceTitle: sources.title,
    sourceUrl: sources.sourceUrl,
    sourcePage: questionSources.pageReference,
  }).from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .leftJoin(questionIntelligence, eq(questionIntelligence.questionId, questions.id))
    .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
    .innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
    .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
    .where(and(eq(questions.status, "human_review")))
    .orderBy(desc(questions.updatedAt))
    .limit(30);
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(60);
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  return result[0].affectedRows > 0;
}

export async function createNotification(input: {
  userId: number;
  actorUserId?: number;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  body: string;
  actionUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!await shouldDeliverNotification(input.userId, input.type, input.priority)) return null;
  const result = await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    priority: input.priority,
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl || null,
  });
  const notificationId = Number(result[0].insertId);
  if (input.actorUserId) {
    await db.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      action: "notification.created",
      entityType: "notification",
      entityId: String(notificationId),
      metadata: { targetUserId: input.userId, type: input.type, priority: input.priority },
    });
  }
  return notificationId;
}

export async function deliverDailyChallengeNotifications(input: { scheduleId: number; roomId: number; challengeDate: string; title: string; durationMinutes: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const recipients = await db.select({ userId: users.id, role: users.role, language: studentProfiles.preferredLanguage }).from(users)
    .innerJoin(studentNotificationPreferences, eq(studentNotificationPreferences.userId, users.id))
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(eq(studentNotificationPreferences.dailyChallengeEnabled, true));
  let delivered = 0;
  for (const recipient of recipients) {
    if (!(["user", "student"] as string[]).includes(recipient.role)) continue;
    const [existing] = await db.select({ id: dailyChallengeNotificationDeliveries.id, notificationId: dailyChallengeNotificationDeliveries.notificationId }).from(dailyChallengeNotificationDeliveries)
      .where(and(eq(dailyChallengeNotificationDeliveries.dailyChallengeScheduleId, input.scheduleId), eq(dailyChallengeNotificationDeliveries.challengeDate, input.challengeDate), eq(dailyChallengeNotificationDeliveries.userId, recipient.userId))).limit(1);
    if (existing?.notificationId) continue;
    let deliveryId = existing?.id;
    if (!deliveryId) {
      try {
        const created = await db.insert(dailyChallengeNotificationDeliveries).values({ dailyChallengeScheduleId: input.scheduleId, liveExamRoomId: input.roomId, userId: recipient.userId, challengeDate: input.challengeDate });
        deliveryId = Number(created[0].insertId);
      } catch (error) {
        if (!(error instanceof Error) || !/duplicate|unique/i.test(error.message)) throw error;
        continue;
      }
    }
    const bn = recipient.language === "bn";
    const notification = await db.insert(notifications).values({ userId: recipient.userId, type: "study", priority: "normal", title: bn ? "নতুন ডেইলি চ্যালেঞ্জ শুরু হয়েছে" : "A new daily challenge is open", body: bn ? `“${input.title}” এখন শুরু হয়েছে। ${input.durationMinutes} মিনিটের মধ্যে অংশ নাও।` : `“${input.title}” is now open. Join within ${input.durationMinutes} minutes.`, actionUrl: `/live-exams/${input.roomId}` });
    await db.update(dailyChallengeNotificationDeliveries).set({ notificationId: Number(notification[0].insertId) }).where(eq(dailyChallengeNotificationDeliveries.id, deliveryId));
    delivered += 1;
  }
  return { delivered, eligible: recipients.filter(recipient => (["user", "student"] as string[]).includes(recipient.role)).length };
}

export async function updateStudentPreferences(userId: number, input: {
  preferredLanguage?: "bn" | "en";
  institution?: string | null;
  dailyStudyMinutes?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.update(studentProfiles).set(input).where(eq(studentProfiles.userId, userId));
  return result[0].affectedRows > 0;
}

export async function getApprovedSources() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: sources.id,
    organization: sources.organization,
    title: sources.title,
    sourceUrl: sources.sourceUrl,
    sourceType: sources.sourceType,
    versionLabel: sourceVersions.versionLabel,
    status: sourceVersions.status,
    retrievedAt: sourceVersions.retrievedAt,
  }).from(sources)
    .leftJoin(sourceVersions, eq(sourceVersions.sourceId, sources.id))
    .orderBy(desc(sourceVersions.retrievedAt))
    .limit(80);
}

export async function registerOfficialSource(input: {
  organization: string;
  title: string;
  sourceUrl: string;
  sourceType: "nctb" | "official_syllabus" | "official_admission" | "licensed";
  licenseNotes?: string;
  versionLabel: string;
  contentHash: string;
  status: "under_review" | "active";
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [existingSource] = await db.select({ id: sources.id }).from(sources).where(eq(sources.sourceUrl, input.sourceUrl)).limit(1);
  const sourceId = existingSource ? existingSource.id : Number((await db.insert(sources).values({
    organization: input.organization,
    title: input.title,
    sourceUrl: input.sourceUrl,
    sourceType: input.sourceType,
    licenseNotes: input.licenseNotes || null,
  }))[0].insertId);
  const [activeVersion] = await db.select({ id: sourceVersions.id }).from(sourceVersions)
    .where(and(eq(sourceVersions.sourceId, sourceId), eq(sourceVersions.status, "active"))).limit(1);
  const versionStatus = input.status === "active" && activeVersion ? "under_review" : input.status;
  const versionResult = await db.insert(sourceVersions).values({
    sourceId,
    versionLabel: input.versionLabel,
    contentHash: input.contentHash,
    status: versionStatus,
  });
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: "source.registered",
    entityType: "source",
    entityId: String(sourceId),
    metadata: { sourceType: input.sourceType, versionLabel: input.versionLabel, status: versionStatus, activationDeferred: input.status === "active" && versionStatus !== "active" },
  });
  return { sourceId, sourceVersionId: Number(versionResult[0].insertId) };
}

export async function getPublishedAdmissionNotices() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: admissionNotices.id,
    institution: admissionNotices.institution,
    title: admissionNotices.title,
    session: admissionNotices.session,
    noticeType: admissionNotices.noticeType,
    sourceUrl: admissionNotices.sourceUrl,
    summary: admissionNotices.summary,
    retrievedAt: admissionNotices.retrievedAt,
    publishedAt: admissionNotices.publishedAt,
  }).from(admissionNotices)
    .where(eq(admissionNotices.status, "published"))
    .orderBy(desc(admissionNotices.publishedAt))
    .limit(40);
}

export async function createAdmissionNotice(input: {
  sourceId: number;
  institution: string;
  title: string;
  session: string;
  noticeType: "application" | "schedule" | "result" | "pattern" | "other";
  sourceUrl: string;
  summary?: string;
  status: "under_review" | "published";
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(admissionNotices).values({
    sourceId: input.sourceId,
    institution: input.institution,
    title: input.title,
    session: input.session,
    noticeType: input.noticeType,
    sourceUrl: input.sourceUrl,
    summary: input.summary || null,
    status: input.status,
    publishedAt: input.status === "published" ? new Date() : null,
  });
  const noticeId = Number(result[0].insertId);
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: `admission_notice.${input.status}`,
    entityType: "admission_notice",
    entityId: String(noticeId),
    metadata: { institution: input.institution, noticeType: input.noticeType, sourceUrl: input.sourceUrl },
  });
  return noticeId;
}

function optionSignature(options: Array<{ text: string; isCorrect: boolean }>) {
  return options.map(option => `${option.isCorrect ? "1" : "0"}:${normalizeQuestionText(option.text)}`).sort().join("|");
}

async function validateQuestionIntake(input: {
  academicYearId: number;
  subjectId: number;
  bookId: number;
  chapterId: number;
  topicId?: number;
  conceptId?: number;
  contentLanguage: "bn" | "en";
  sourceVersionId: number;
  pageReference: string;
  additionalSourceReferences?: Array<{ sourceVersionId: number; pageReference: string }>;
  prompt: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  intelligence?: QuestionIntelligenceInput;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [year] = await db.select({ id: academicYears.id, status: academicYears.status }).from(academicYears).where(eq(academicYears.id, input.academicYearId)).limit(1);
  if (!year || year.status !== "active") throw new Error("Question intake requires an active academic year");
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
  const [source] = await db.select({ id: sourceVersions.id, status: sourceVersions.status }).from(sourceVersions).where(eq(sourceVersions.id, input.sourceVersionId)).limit(1);
  if (!source || source.status !== "active" || !input.pageReference.trim()) throw new Error("Question intake requires an active source version and page reference");
  const additionalReferences = input.additionalSourceReferences ?? [];
  const referenceSignatures = new Set<string>();
  for (const reference of [{ sourceVersionId: input.sourceVersionId, pageReference: input.pageReference }, ...additionalReferences]) {
    const signature = `${reference.sourceVersionId}:${reference.pageReference.trim()}`;
    if (!reference.pageReference.trim()) throw new Error("Every source reference requires a page or section reference");
    if (referenceSignatures.has(signature)) throw new Error("Duplicate source references are not allowed");
    referenceSignatures.add(signature);
    const [referencedSource] = await db.select({ id: sourceVersions.id, status: sourceVersions.status }).from(sourceVersions).where(eq(sourceVersions.id, reference.sourceVersionId)).limit(1);
    if (!referencedSource || referencedSource.status !== "active") throw new Error("Every source reference must use an active source version");
  }
  validateQuestionIntelligence(input.intelligence);

  const candidates = await db.select({ id: questions.id, prompt: questions.prompt }).from(questions)
    .where(and(eq(questions.academicYearId, input.academicYearId), eq(questions.subjectId, input.subjectId), eq(questions.bookId, input.bookId), eq(questions.chapterId, input.chapterId), eq(questions.contentLanguage, input.contentLanguage))).limit(500);
  const signature = optionSignature(input.options);
  for (const candidate of candidates) {
    const risk = duplicateRisk(candidate.prompt, input.prompt);
    if (risk.kind === "none") continue;
    const candidateOptions = await db.select({ text: questionOptions.text, isCorrect: questionOptions.isCorrect }).from(questionOptions).where(eq(questionOptions.questionId, candidate.id));
    if (risk.kind === "exact" && optionSignature(candidateOptions) === signature) throw new Error(`Duplicate question matches existing source-linked record #${candidate.id}`);
    if (risk.kind === "near" && optionSignature(candidateOptions) === signature) throw new Error(`Near-duplicate risk (${Math.round(risk.score * 100)}%) matches question #${candidate.id}; revise or document the distinction before review`);
  }
}

export async function createReviewQuestion(input: {
  academicYearId: number;
  subjectId: number;
  bookId: number;
  chapterId: number;
  topicId?: number;
  conceptId?: number;
  contentLanguage: "bn" | "en";
  prompt: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  boardStandard?: "board_standard" | "varsity_admission_standard";
  admissionTrack?: "du" | "buet" | "medical";
  options: Array<{ text: string; isCorrect: boolean }>;
  sourceVersionId: number;
  pageReference: string;
  additionalSourceReferences?: Array<{ sourceVersionId: number; pageReference: string }>;
  intelligence?: QuestionIntelligenceInput & { examProfileId?: number };
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await validateQuestionIntake(input);
  const questionResult = await db.insert(questions).values({
    academicYearId: input.academicYearId,
    subjectId: input.subjectId,
    bookId: input.bookId,
    chapterId: input.chapterId,
    topicId: input.topicId ?? null,
    conceptId: input.conceptId ?? null,
    contentLanguage: input.contentLanguage,
    prompt: input.prompt,
    explanation: input.explanation || null,
    difficulty: input.difficulty,
    boardStandard: input.boardStandard ?? "board_standard",
    admissionTrack: input.admissionTrack ?? null,
    status: "human_review",
  });
  const questionId = Number(questionResult[0].insertId);
  const optionRows = input.options.map((option, index) => ({
    questionId,
    optionKey: String.fromCharCode(65 + index),
    text: option.text,
    isCorrect: option.isCorrect,
  }));
  await db.insert(questionOptions).values(optionRows);
  const sourceReferences = [{ sourceVersionId: input.sourceVersionId, pageReference: input.pageReference }, ...(input.additionalSourceReferences ?? [])];
  await db.insert(questionSources).values(sourceReferences.map(reference => ({ questionId, ...reference })));
  await db.insert(questionIntelligence).values({
    questionId,
    examProfileId: input.intelligence?.examProfileId ?? null,
    provenance: input.intelligence?.provenance ?? "original_source_linked",
    verificationStatus: input.intelligence?.verificationStatus ?? "source_linked",
    cognitiveLevel: input.intelligence?.cognitiveLevel ?? "understanding",
    reasoningMode: input.intelligence?.reasoningMode ?? "conceptual",
    difficultyScore: input.intelligence?.difficultyScore ?? null,
    examDifficultyProfile: input.intelligence?.examDifficultyProfile?.trim() || null,
    historicalFrequency: input.intelligence?.historicalFrequency ?? 0,
    chapterFrequency: input.intelligence?.chapterFrequency ?? 0,
    topicFrequency: input.intelligence?.topicFrequency ?? 0,
    importanceScore: input.intelligence?.importanceScore ?? null,
    recurrenceScore: input.intelligence?.recurrenceScore ?? null,
    formulaUsed: input.intelligence?.formulaUsed?.trim() || null,
    commonMistake: input.intelligence?.commonMistake?.trim() || null,
    generationBasis: input.intelligence?.generationBasis?.trim() || null,
  });
  await db.insert(questionVersions).values({
    questionId,
    version: 1,
    snapshot: {
      prompt: input.prompt,
      explanation: input.explanation || null,
      options: input.options,
      contentLanguage: input.contentLanguage,
      boardStandard: input.boardStandard ?? "board_standard",
      admissionTrack: input.admissionTrack ?? null,
      topicId: input.topicId ?? null,
      conceptId: input.conceptId ?? null,
      intelligence: input.intelligence ?? null,
      sourceVersionId: input.sourceVersionId,
      pageReference: input.pageReference,
      sourceReferences,
    },
    createdByUserId: input.actorUserId,
    reviewStatus: "human_review",
  });
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: "question.submitted_for_review",
    entityType: "question",
    entityId: String(questionId),
    metadata: { sourceVersionId: input.sourceVersionId, pageReference: input.pageReference, sourceReferences, admissionTrack: input.admissionTrack ?? null, provenance: input.intelligence?.provenance ?? "original_source_linked" },
  });
  return questionId;
}

export async function getAdmissionPatternVersions() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: examPatternVersions.id,
    profileId: examProfiles.id,
    institution: examProfiles.institution,
    title: examProfiles.title,
    examType: examProfiles.examType,
    unit: examProfiles.unit,
    versionLabel: examPatternVersions.versionLabel,
    configuration: examPatternVersions.configuration,
    status: examPatternVersions.status,
    createdAt: examPatternVersions.createdAt,
  }).from(examPatternVersions)
    .innerJoin(examProfiles, eq(examPatternVersions.examProfileId, examProfiles.id))
    .orderBy(desc(examPatternVersions.createdAt))
    .limit(50);
}

type AdmissionPatternConfiguration = {
  sourceUrl?: string;
  notes?: string | null;
  questionCount?: number | null;
  durationMinutes?: number | null;
  marksPerCorrect?: number | null;
  negativeMarkPerWrong?: number | null;
  session?: string | null;
  examDateIso?: string | null;
  eligibilitySummary?: string | null;
  cutoffScore?: number | null;
  evidenceStatus?: string;
};

function admissionConfiguration(value: unknown): AdmissionPatternConfiguration {
  return value && typeof value === "object" && !Array.isArray(value) ? value as AdmissionPatternConfiguration : {};
}

export async function getActiveAdmissionTracks() {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: examPatternVersions.id,
    institution: examProfiles.institution,
    title: examProfiles.title,
    examType: examProfiles.examType,
    unit: examProfiles.unit,
    versionLabel: examPatternVersions.versionLabel,
    configuration: examPatternVersions.configuration,
  }).from(examPatternVersions)
    .innerJoin(examProfiles, eq(examPatternVersions.examProfileId, examProfiles.id))
    .where(eq(examPatternVersions.status, "active"))
    .orderBy(desc(examPatternVersions.createdAt));
  return rows.map(row => ({ ...row, configuration: admissionConfiguration(row.configuration) }));
}

export async function getAdmissionReadiness(userId: number) {
  const [progress, activeTracks] = await Promise.all([getStudentProgressSummary(userId), getActiveAdmissionTracks()]);
  return { progress, activeTracks };
}

export async function getStudentAdmissionScoreBenchmarks(userId: number) {
  const [tracks, db] = await Promise.all([getActiveAdmissionTracks(), getDb()]);
  if (!db) return [];
  const attempts = await db.select({ id: examAttempts.id, score: examAttempts.score, questionSetSnapshot: examAttempts.questionSetSnapshot, markingSchemeSnapshot: examAttempts.markingSchemeSnapshot, submittedAt: examAttempts.submittedAt, status: examAttempts.status })
    .from(examAttempts).where(eq(examAttempts.userId, userId));
  const completed: BenchmarkAttempt[] = attempts.filter(attempt => (attempt.status === "submitted" || attempt.status === "expired") && attempt.score !== null)
    .map(attempt => {
      const marking = attempt.markingSchemeSnapshot && typeof attempt.markingSchemeSnapshot === "object" && !Array.isArray(attempt.markingSchemeSnapshot) ? attempt.markingSchemeSnapshot as { admissionTrack?: unknown; maxMarks?: unknown } : {};
      const frozen = Array.isArray(attempt.questionSetSnapshot) ? attempt.questionSetSnapshot : [];
      const summedMarks = frozen.reduce((total, question) => total + (question && typeof question === "object" && "marks" in question && Number.isFinite(Number((question as { marks?: unknown }).marks)) ? Number((question as { marks?: unknown }).marks) : 0), 0);
      const maxMarks = Number.isFinite(Number(marking.maxMarks)) ? Number(marking.maxMarks) : summedMarks;
      const track: BenchmarkAttempt["track"] = marking.admissionTrack === "du" || marking.admissionTrack === "buet" || marking.admissionTrack === "medical" ? marking.admissionTrack : null;
      return { id: attempt.id, score: Number(attempt.score), maxMarks, track, submittedAt: attempt.submittedAt };
    }).filter(attempt => Number.isFinite(attempt.score) && attempt.maxMarks > 0);
  return buildAdmissionBenchmarks(tracks, completed);
}

export async function createAdmissionPatternVersion(input: {
  examType: "medical" | "engineering" | "university";
  institution: string;
  title: string;
  unit?: string;
  versionLabel: string;
  sourceUrl: string;
  notes?: string;
  questionCount?: number;
  durationMinutes?: number;
  marksPerCorrect?: number;
  negativeMarkPerWrong?: number;
  session?: string;
  examDateIso?: string;
  eligibilitySummary?: string;
  cutoffScore?: number;
  status: "draft" | "under_review" | "active";
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [sourceEvidence] = await db.select({ sourceVersionId: sourceVersions.id }).from(sources)
    .innerJoin(sourceVersions, eq(sourceVersions.sourceId, sources.id))
    .where(and(eq(sources.sourceUrl, input.sourceUrl), eq(sources.sourceType, "official_admission"), eq(sourceVersions.status, "active"))).limit(1);
  if (input.status === "active" && !sourceEvidence) throw new Error("Activating an admission pattern requires an active official-admission source record");
  if (input.status === "active") {
    const activation = validateAdmissionPatternActivation(input);
    if (!activation.valid) throw new Error(activation.errors.join(" "));
  }
  const existing = await db.select({ id: examProfiles.id }).from(examProfiles)
    .where(and(eq(examProfiles.title, input.title), eq(examProfiles.institution, input.institution), eq(examProfiles.examType, input.examType), ...(input.unit ? [eq(examProfiles.unit, input.unit)] : [sql`${examProfiles.unit} is null`])))
    .limit(1);
  let profileId = existing[0]?.id;
  if (!profileId) {
    const created = await db.insert(examProfiles).values({
      title: input.title,
      examType: input.examType,
      institution: input.institution,
      unit: input.unit || null,
      status: "active",
    });
    profileId = Number(created[0].insertId);
  }
  const configuration = {
    sourceUrl: input.sourceUrl,
    notes: input.notes || null,
    questionCount: input.questionCount ?? null,
    durationMinutes: input.durationMinutes ?? null,
    marksPerCorrect: input.marksPerCorrect ?? null,
    negativeMarkPerWrong: input.negativeMarkPerWrong ?? null,
    session: input.session || null,
    examDateIso: input.examDateIso || null,
    eligibilitySummary: input.eligibilitySummary || null,
    cutoffScore: input.cutoffScore ?? null,
    sourceVersionId: sourceEvidence?.sourceVersionId ?? null,
    evidenceStatus: input.status === "active" ? "active official-source evidence" : "pending official-source review",
  };
  const result = await db.insert(examPatternVersions).values({
    examProfileId: profileId,
    versionLabel: input.versionLabel,
    configuration,
    status: input.status,
  });
  const patternId = Number(result[0].insertId);
  if (sourceEvidence) await db.insert(examPatternSources).values({ examPatternVersionId: patternId, sourceVersionId: sourceEvidence.sourceVersionId, evidenceRole: "pattern" });
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: "admission_pattern.version_created",
    entityType: "exam_pattern_version",
    entityId: String(patternId),
    metadata: { institution: input.institution, versionLabel: input.versionLabel, status: input.status, sourceUrl: input.sourceUrl },
  });
  return { patternId, profileId };
}

export async function getQuestionIntakeOptions() {
  const db = await getDb();
  if (!db) return { academicYears: [], subjects: [], books: [], chapters: [], topics: [], concepts: [], examProfiles: [], sourceVersions: [] };
  const [academicYearsRows, subjectRows, bookRows, chapterRows, topicRows, conceptRows, examProfileRows, sourceVersionRows] = await Promise.all([
    db.select({ id: academicYears.id, name: academicYears.name }).from(academicYears).where(eq(academicYears.status, "active")).orderBy(desc(academicYears.name)),
    db.select({ id: subjects.id, academicYearId: subjects.academicYearId, nameEn: subjects.nameEn, nameBn: subjects.nameBn }).from(subjects).orderBy(subjects.nameEn),
    db.select({ id: books.id, subjectId: books.subjectId, titleEn: books.titleEn, titleBn: books.titleBn }).from(books).orderBy(books.titleEn),
    db.select({ id: chapters.id, bookId: chapters.bookId, chapterNo: chapters.chapterNo, titleEn: chapters.titleEn, titleBn: chapters.titleBn }).from(chapters).orderBy(chapters.chapterNo),
    db.select({ id: topics.id, chapterId: topics.chapterId, titleEn: topics.titleEn, titleBn: topics.titleBn }).from(topics).orderBy(topics.titleEn),
    db.select({ id: concepts.id, topicId: concepts.topicId, titleEn: concepts.titleEn, titleBn: concepts.titleBn }).from(concepts).orderBy(concepts.titleEn),
    db.select({ id: examProfiles.id, title: examProfiles.title, examType: examProfiles.examType, institution: examProfiles.institution, unit: examProfiles.unit }).from(examProfiles).where(eq(examProfiles.status, "active")).orderBy(examProfiles.examType, examProfiles.title),
    db.select({ id: sourceVersions.id, sourceId: sources.id, title: sources.title, organization: sources.organization, versionLabel: sourceVersions.versionLabel }).from(sourceVersions).innerJoin(sources, eq(sourceVersions.sourceId, sources.id)).where(eq(sourceVersions.status, "active")).orderBy(desc(sourceVersions.retrievedAt)),
  ]);
  return { academicYears: academicYearsRows, subjects: subjectRows, books: bookRows, chapters: chapterRows, topics: topicRows, concepts: conceptRows, examProfiles: examProfileRows, sourceVersions: sourceVersionRows };
}
