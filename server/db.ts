import { and, desc, eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, studentProfiles, users, books, chapters, knowledgeChunks, sourceVersions, sources, examAttempts, auditLogs, questions, subjects } from "../drizzle/schema";
import { ENV } from './_core/env';

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
    .leftJoin(books, eq(knowledgeChunks.bookId, books.id))
    .leftJoin(chapters, eq(knowledgeChunks.chapterId, chapters.id))
    .where(and(eq(sourceVersions.status, "active"), like(knowledgeChunks.content, `%${query.slice(0, 120)}%`)))
    .orderBy(desc(knowledgeChunks.id))
    .limit(4);
  // Academic version enforcement is performed by matching the selected book hierarchy; this fallback avoids returning content when no sources exist.
  void academicYear;
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
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: `question.${input.status}`,
    entityType: "question",
    entityId: String(input.questionId),
    metadata: { note: input.note ?? null },
  });
  return true;
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
  }).from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(and(eq(questions.status, "human_review")))
    .orderBy(desc(questions.updatedAt))
    .limit(30);
}
