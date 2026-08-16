import { boolean, decimal, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "student", "reviewer", "content_admin", "super_admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const studentProfiles = mysqlTable("student_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique().references(() => users.id),
  preferredLanguage: mysqlEnum("preferredLanguage", ["bn", "en"]).default("bn").notNull(),
  academicYear: varchar("academicYear", { length: 20 }).notNull(),
  session: varchar("session", { length: 40 }).notNull(),
  group: mysqlEnum("group", ["science", "business", "humanities"]).notNull(),
  targetExam: mysqlEnum("targetExam", ["hsc", "medical", "engineering", "university", "multiple"]).notNull(),
  institution: varchar("institution", { length: 160 }),
  dailyStudyMinutes: int("dailyStudyMinutes").notNull(),
  onboardingCompletedAt: timestamp("onboardingCompletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const academicYears = mysqlTable("academic_years", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 20 }).notNull().unique(),
  status: mysqlEnum("status", ["active", "superseded", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const academicGroups = mysqlTable("academic_groups", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull().references(() => academicYears.id),
  slug: varchar("slug", { length: 40 }).notNull(),
  nameEn: varchar("nameEn", { length: 80 }).notNull(),
  nameBn: varchar("nameBn", { length: 120 }).notNull(),
}, table => [uniqueIndex("academic_group_year_slug").on(table.academicYearId, table.slug)]);

export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull().references(() => academicYears.id),
  groupId: int("groupId").references(() => academicGroups.id),
  code: varchar("code", { length: 40 }).notNull(),
  nameEn: varchar("nameEn", { length: 120 }).notNull(),
  nameBn: varchar("nameBn", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("subject_year_code").on(table.academicYearId, table.code), index("subject_group_idx").on(table.groupId)]);

export const books = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  subjectId: int("subjectId").notNull().references(() => subjects.id),
  titleEn: varchar("titleEn", { length: 220 }).notNull(),
  titleBn: varchar("titleBn", { length: 260 }).notNull(),
  paper: mysqlEnum("paper", ["first", "second", "combined"]).default("combined").notNull(),
  edition: varchar("edition", { length: 80 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("book_subject_idx").on(table.subjectId)]);

export const chapters = mysqlTable("chapters", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull().references(() => books.id),
  chapterNo: varchar("chapterNo", { length: 40 }).notNull(),
  titleEn: varchar("titleEn", { length: 220 }).notNull(),
  titleBn: varchar("titleBn", { length: 260 }).notNull(),
}, table => [index("chapter_book_idx").on(table.bookId)]);

export const topics = mysqlTable("topics", {
  id: int("id").autoincrement().primaryKey(),
  chapterId: int("chapterId").notNull().references(() => chapters.id),
  titleEn: varchar("titleEn", { length: 220 }).notNull(),
  titleBn: varchar("titleBn", { length: 260 }).notNull(),
}, table => [index("topic_chapter_idx").on(table.chapterId)]);

export const concepts = mysqlTable("concepts", {
  id: int("id").autoincrement().primaryKey(),
  topicId: int("topicId").notNull().references(() => topics.id),
  titleEn: varchar("titleEn", { length: 220 }).notNull(),
  titleBn: varchar("titleBn", { length: 260 }).notNull(),
}, table => [index("concept_topic_idx").on(table.topicId)]);

export const sources = mysqlTable("sources", {
  id: int("id").autoincrement().primaryKey(),
  organization: varchar("organization", { length: 180 }).notNull(),
  title: varchar("title", { length: 300 }).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1000 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["nctb", "official_syllabus", "official_admission", "licensed"]).notNull(),
  licenseNotes: text("licenseNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const sourceVersions = mysqlTable("source_versions", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull().references(() => sources.id),
  versionLabel: varchar("versionLabel", { length: 80 }).notNull(),
  contentHash: varchar("contentHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["draft", "under_review", "active", "superseded", "archived"]).default("draft").notNull(),
  supersedesVersionId: int("supersedesVersionId"),
  retrievedAt: timestamp("retrievedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("source_hash_unique").on(table.sourceId, table.contentHash), index("source_version_status_idx").on(table.status)]);

export const knowledgeChunks = mysqlTable("knowledge_chunks", {
  id: int("id").autoincrement().primaryKey(),
  sourceVersionId: int("sourceVersionId").notNull().references(() => sourceVersions.id),
  academicYearId: int("academicYearId").references(() => academicYears.id),
  bookId: int("bookId").references(() => books.id),
  chapterId: int("chapterId").references(() => chapters.id),
  pageReference: varchar("pageReference", { length: 100 }).notNull(),
  content: text("content").notNull(),
  contentHash: varchar("contentHash", { length: 128 }).notNull(),
  embeddingReference: varchar("embeddingReference", { length: 260 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("knowledge_source_idx").on(table.sourceVersionId), index("knowledge_academic_idx").on(table.academicYearId, table.bookId, table.chapterId)]);

export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  academicYearId: int("academicYearId").notNull().references(() => academicYears.id),
  subjectId: int("subjectId").notNull().references(() => subjects.id),
  bookId: int("bookId").references(() => books.id),
  chapterId: int("chapterId").references(() => chapters.id),
  topicId: int("topicId").references(() => topics.id),
  conceptId: int("conceptId").references(() => concepts.id),
  prompt: text("prompt").notNull(),
  explanation: text("explanation"),
  difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
  status: mysqlEnum("status", ["draft", "ai_validated", "human_review", "approved", "published", "needs_review", "superseded", "archived"]).default("draft").notNull(),
  currentVersion: int("currentVersion").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("question_catalog_idx").on(table.academicYearId, table.subjectId, table.chapterId, table.topicId), index("question_status_idx").on(table.status)]);

export const questionOptions = mysqlTable("question_options", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull().references(() => questions.id),
  optionKey: varchar("optionKey", { length: 5 }).notNull(),
  text: text("text").notNull(),
  isCorrect: boolean("isCorrect").default(false).notNull(),
}, table => [uniqueIndex("question_option_key").on(table.questionId, table.optionKey)]);

export const questionVersions = mysqlTable("question_versions", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull().references(() => questions.id),
  version: int("version").notNull(),
  snapshot: json("snapshot").notNull(),
  createdByUserId: int("createdByUserId").references(() => users.id),
  reviewStatus: mysqlEnum("reviewStatus", ["draft", "human_review", "approved", "superseded"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("question_version_unique").on(table.questionId, table.version)]);

export const questionSources = mysqlTable("question_sources", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull().references(() => questions.id),
  sourceVersionId: int("sourceVersionId").notNull().references(() => sourceVersions.id),
  pageReference: varchar("pageReference", { length: 100 }).notNull(),
}, table => [index("question_source_idx").on(table.questionId, table.sourceVersionId)]);

export const examProfiles = mysqlTable("exam_profiles", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  examType: mysqlEnum("examType", ["hsc", "medical", "engineering", "university"]).notNull(),
  institution: varchar("institution", { length: 180 }),
  unit: varchar("unit", { length: 120 }),
  status: mysqlEnum("status", ["draft", "active", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const examPatternVersions = mysqlTable("exam_pattern_versions", {
  id: int("id").autoincrement().primaryKey(),
  examProfileId: int("examProfileId").notNull().references(() => examProfiles.id),
  versionLabel: varchar("versionLabel", { length: 80 }).notNull(),
  configuration: json("configuration").notNull(),
  status: mysqlEnum("status", ["draft", "under_review", "active", "superseded", "archived"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("exam_pattern_version_unique").on(table.examProfileId, table.versionLabel)]);

export const exams = mysqlTable("exams", {
  id: int("id").autoincrement().primaryKey(),
  examProfileId: int("examProfileId").references(() => examProfiles.id),
  patternVersionId: int("patternVersionId").references(() => examPatternVersions.id),
  title: varchar("title", { length: 180 }).notNull(),
  examVersion: varchar("examVersion", { length: 60 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const examAttempts = mysqlTable("exam_attempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  examId: int("examId").references(() => exams.id),
  titleSnapshot: varchar("titleSnapshot", { length: 180 }).notNull(),
  examVersionSnapshot: varchar("examVersionSnapshot", { length: 60 }).notNull(),
  patternVersionSnapshot: varchar("patternVersionSnapshot", { length: 60 }).notNull(),
  questionSetSnapshot: json("questionSetSnapshot").notNull(),
  markingSchemeSnapshot: json("markingSchemeSnapshot").notNull(),
  startedAt: timestamp("startedAt").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  submittedAt: timestamp("submittedAt"),
  status: mysqlEnum("status", ["in_progress", "submitted", "expired"]).default("in_progress").notNull(),
  score: decimal("score", { precision: 8, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("attempt_user_status_idx").on(table.userId, table.status)]);

export const attemptAnswers = mysqlTable("attempt_answers", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull().references(() => examAttempts.id),
  questionId: int("questionId").notNull(),
  selectedOptionId: int("selectedOptionId"),
  markedForReview: boolean("markedForReview").default(false).notNull(),
  answeredAt: timestamp("answeredAt"),
}, table => [uniqueIndex("attempt_question_unique").on(table.attemptId, table.questionId)]);

export const practiceSessions = mysqlTable("practice_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  selectionSnapshot: json("selectionSnapshot").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  score: decimal("score", { precision: 8, scale: 2 }),
}, table => [index("practice_user_idx").on(table.userId, table.startedAt)]);

export const mistakes = mysqlTable("mistakes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  questionId: int("questionId").notNull().references(() => questions.id),
  sourceAttemptId: int("sourceAttemptId").references(() => examAttempts.id),
  personalNote: text("personalNote"),
  status: mysqlEnum("status", ["open", "reviewing", "mastered"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("mistake_user_status_idx").on(table.userId, table.status)]);

export const bookmarks = mysqlTable("bookmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  questionId: int("questionId").notNull().references(() => questions.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [uniqueIndex("bookmark_user_question_unique").on(table.userId, table.questionId)]);

export const studyPlans = mysqlTable("study_plans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  targetExam: varchar("targetExam", { length: 80 }).notNull(),
  examDate: timestamp("examDate"),
  status: mysqlEnum("status", ["active", "completed", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const studyPlanItems = mysqlTable("study_plan_items", {
  id: int("id").autoincrement().primaryKey(),
  studyPlanId: int("studyPlanId").notNull().references(() => studyPlans.id),
  scheduledFor: timestamp("scheduledFor").notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  itemType: mysqlEnum("itemType", ["learn", "practice", "exam", "review"]).notNull(),
  estimatedMinutes: int("estimatedMinutes").notNull(),
  completedAt: timestamp("completedAt"),
}, table => [index("study_item_plan_date_idx").on(table.studyPlanId, table.scheduledFor)]);

export const aiConversations = mysqlTable("ai_conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  title: varchar("title", { length: 220 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const aiMessages = mysqlTable("ai_messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull().references(() => aiConversations.id),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  retrievalMetadata: json("retrievalMetadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  type: mysqlEnum("type", ["study", "admission", "content", "account", "system"]).default("system").notNull(),
  priority: mysqlEnum("priority", ["normal", "high", "critical"]).default("normal").notNull(),
  title: varchar("title", { length: 220 }).notNull(),
  body: text("body").notNull(),
  actionUrl: varchar("actionUrl", { length: 500 }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("notification_user_read_idx").on(table.userId, table.readAt, table.createdAt)]);

export const admissionNotices = mysqlTable("admission_notices", {
  id: int("id").autoincrement().primaryKey(),
  sourceId: int("sourceId").notNull().references(() => sources.id),
  examProfileId: int("examProfileId").references(() => examProfiles.id),
  institution: varchar("institution", { length: 180 }).notNull(),
  title: varchar("title", { length: 260 }).notNull(),
  session: varchar("session", { length: 80 }).notNull(),
  noticeType: mysqlEnum("noticeType", ["application", "schedule", "result", "pattern", "other"]).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 1000 }).notNull(),
  summary: text("summary"),
  status: mysqlEnum("status", ["under_review", "published", "archived"]).default("under_review").notNull(),
  retrievedAt: timestamp("retrievedAt").defaultNow().notNull(),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("admission_notice_status_idx").on(table.status, table.retrievedAt), index("admission_notice_source_idx").on(table.sourceId)]);

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").references(() => users.id),
  action: varchar("action", { length: 160 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: varchar("entityId", { length: 80 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("audit_entity_idx").on(table.entityType, table.entityId), index("audit_actor_idx").on(table.actorUserId, table.createdAt)]);
