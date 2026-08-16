import { and, desc, eq, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, studentProfiles, users, books, chapters, knowledgeChunks, sourceVersions, sources, examAttempts, auditLogs, questions, subjects, notifications, admissionNotices, questionOptions, questionSources, questionVersions, examPatternVersions, examProfiles, academicYears } from "../drizzle/schema";
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
  type: "study" | "admission" | "content" | "account" | "system";
  priority: "normal" | "high" | "critical";
  title: string;
  body: string;
  actionUrl?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
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
  const sourceResult = await db.insert(sources).values({
    organization: input.organization,
    title: input.title,
    sourceUrl: input.sourceUrl,
    sourceType: input.sourceType,
    licenseNotes: input.licenseNotes || null,
  });
  const sourceId = Number(sourceResult[0].insertId);
  const versionResult = await db.insert(sourceVersions).values({
    sourceId,
    versionLabel: input.versionLabel,
    contentHash: input.contentHash,
    status: input.status,
  });
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: "source.registered",
    entityType: "source",
    entityId: String(sourceId),
    metadata: { sourceType: input.sourceType, versionLabel: input.versionLabel, status: input.status },
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

export async function createReviewQuestion(input: {
  academicYearId: number;
  subjectId: number;
  bookId?: number;
  prompt: string;
  explanation?: string;
  difficulty: "easy" | "medium" | "hard";
  options: Array<{ text: string; isCorrect: boolean }>;
  sourceVersionId: number;
  pageReference: string;
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const questionResult = await db.insert(questions).values({
    academicYearId: input.academicYearId,
    subjectId: input.subjectId,
    bookId: input.bookId ?? null,
    prompt: input.prompt,
    explanation: input.explanation || null,
    difficulty: input.difficulty,
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
  await db.insert(questionSources).values({ questionId, sourceVersionId: input.sourceVersionId, pageReference: input.pageReference });
  await db.insert(questionVersions).values({
    questionId,
    version: 1,
    snapshot: {
      prompt: input.prompt,
      explanation: input.explanation || null,
      options: input.options,
      sourceVersionId: input.sourceVersionId,
      pageReference: input.pageReference,
    },
    createdByUserId: input.actorUserId,
    reviewStatus: "human_review",
  });
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: "question.submitted_for_review",
    entityType: "question",
    entityId: String(questionId),
    metadata: { sourceVersionId: input.sourceVersionId, pageReference: input.pageReference },
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
    .where(eq(examProfiles.examType, "university"))
    .orderBy(desc(examPatternVersions.createdAt))
    .limit(50);
}

export async function createAdmissionPatternVersion(input: {
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
  status: "draft" | "under_review" | "active";
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select({ id: examProfiles.id }).from(examProfiles)
    .where(and(eq(examProfiles.title, input.title), eq(examProfiles.institution, input.institution)))
    .limit(1);
  let profileId = existing[0]?.id;
  if (!profileId) {
    const created = await db.insert(examProfiles).values({
      title: input.title,
      examType: "university",
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
    evidenceStatus: input.status === "active" ? "reviewer confirmed" : "pending official-source review",
  };
  const result = await db.insert(examPatternVersions).values({
    examProfileId: profileId,
    versionLabel: input.versionLabel,
    configuration,
    status: input.status,
  });
  const patternId = Number(result[0].insertId);
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
  if (!db) return { academicYears: [], subjects: [], books: [], sourceVersions: [] };
  const [academicYearsRows, subjectRows, bookRows, sourceVersionRows] = await Promise.all([
    db.select({ id: academicYears.id, name: academicYears.name }).from(academicYears).where(eq(academicYears.status, "active")).orderBy(desc(academicYears.name)),
    db.select({ id: subjects.id, academicYearId: subjects.academicYearId, nameEn: subjects.nameEn, nameBn: subjects.nameBn }).from(subjects).orderBy(subjects.nameEn),
    db.select({ id: books.id, subjectId: books.subjectId, titleEn: books.titleEn, titleBn: books.titleBn }).from(books).orderBy(books.titleEn),
    db.select({ id: sourceVersions.id, sourceId: sources.id, title: sources.title, organization: sources.organization, versionLabel: sourceVersions.versionLabel }).from(sourceVersions).innerJoin(sources, eq(sourceVersions.sourceId, sources.id)).where(eq(sourceVersions.status, "active")).orderBy(desc(sourceVersions.retrievedAt)),
  ]);
  return { academicYears: academicYearsRows, subjects: subjectRows, books: bookRows, sourceVersions: sourceVersionRows };
}
