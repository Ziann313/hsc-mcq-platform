import { and, desc, eq, inArray } from "drizzle-orm";
import { academicYears, books, chapters, concepts, examProfiles, historicalAnalysisImportBatches, historicalPatternMetrics, sourceVersions, sources, subjects, topics } from "../drizzle/schema";
import { validateHistoricalRowShape, type HistoricalAnalysisRow } from "../shared/historicalAnalysis";
import { getDb } from "./db";

type HistoricalImportInput = {
  userId: number;
  sourceVersionId: number;
  fileName: string;
  fileType: "json" | "csv";
  rows: HistoricalAnalysisRow[];
};

const authorisedSource = and(eq(sourceVersions.status, "active"), inArray(sources.accessClassification, ["official_public", "licensed_public"]), inArray(sources.sourceType, ["official_syllabus", "official_admission", "licensed"]));

async function validateHistoricalRow(row: HistoricalAnalysisRow, sourceVersionId: number) {
  validateHistoricalRowShape(row);
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [profile] = await db.select({ id: examProfiles.id, type: examProfiles.examType, status: examProfiles.status }).from(examProfiles).where(eq(examProfiles.id, row.examProfileId)).limit(1);
  if (!profile || profile.status !== "active") throw new Error("Historical analysis requires an active exam profile");
  if (!row.examYear) throw new Error("Every historical analysis row requires an exam year");
  if (profile.type === "hsc" && !row.boardName?.trim()) throw new Error("HSC historical analysis requires a board name");
  if (row.academicYearId) {
    const [year] = await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, row.academicYearId)).limit(1);
    if (!year) throw new Error("Selected academic year does not exist");
  }
  if (row.subjectId) {
    const [subject] = await db.select({ id: subjects.id, academicYearId: subjects.academicYearId }).from(subjects).where(eq(subjects.id, row.subjectId)).limit(1);
    if (!subject || (row.academicYearId && subject.academicYearId !== row.academicYearId)) throw new Error("Selected subject does not belong to the academic year");
  }
  if (row.bookId) {
    if (!row.subjectId) throw new Error("A book requires a selected subject");
    const [book] = await db.select({ id: books.id, subjectId: books.subjectId }).from(books).where(eq(books.id, row.bookId)).limit(1);
    if (!book || book.subjectId !== row.subjectId) throw new Error("Selected book does not belong to the subject");
  }
  if (row.chapterId) {
    if (!row.bookId) throw new Error("A chapter requires a selected book");
    const [chapter] = await db.select({ id: chapters.id, bookId: chapters.bookId }).from(chapters).where(eq(chapters.id, row.chapterId)).limit(1);
    if (!chapter || chapter.bookId !== row.bookId) throw new Error("Selected chapter does not belong to the book");
  }
  if (row.topicId) {
    if (!row.chapterId) throw new Error("A topic requires a selected chapter");
    const [topic] = await db.select({ id: topics.id, chapterId: topics.chapterId }).from(topics).where(eq(topics.id, row.topicId)).limit(1);
    if (!topic || topic.chapterId !== row.chapterId) throw new Error("Selected topic does not belong to the chapter");
  }
  if (row.conceptId) {
    if (!row.topicId) throw new Error("A concept requires a selected topic");
    const [concept] = await db.select({ id: concepts.id, topicId: concepts.topicId }).from(concepts).where(eq(concepts.id, row.conceptId)).limit(1);
    if (!concept || concept.topicId !== row.topicId) throw new Error("Selected concept does not belong to the topic");
  }
  const evidence = await db.select({ id: sourceVersions.id }).from(sourceVersions).innerJoin(sources, eq(sourceVersions.sourceId, sources.id)).where(and(eq(sourceVersions.id, sourceVersionId), authorisedSource)).limit(1);
  if (!evidence[0]) throw new Error("Historical analysis import requires an active, authorised source version");
}

export async function importHistoricalAnalysis(input: HistoricalImportInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rejected: Array<{ row: number; message: string }> = [];
  for (let index = 0; index < input.rows.length; index += 1) {
    try { await validateHistoricalRow(input.rows[index]!, input.sourceVersionId); }
    catch (error) { rejected.push({ row: index + 1, message: error instanceof Error ? error.message : "Invalid analysis row" }); }
  }
  const acceptedRows = input.rows.length - rejected.length;
  if (!acceptedRows) throw new Error("No historical analysis rows passed validation");
  const batchResult = await db.insert(historicalAnalysisImportBatches).values({
    importedByUserId: input.userId,
    sourceVersionId: input.sourceVersionId,
    fileName: input.fileName,
    fileType: input.fileType,
    totalRows: input.rows.length,
    acceptedRows,
    rejectedRows: rejected.length,
    validationReport: { rejected },
  });
  const batchId = Number(batchResult[0].insertId);
  const accepted = input.rows.filter((_, index) => !rejected.some(item => item.row === index + 1));
  await db.insert(historicalPatternMetrics).values(accepted.map(row => ({
    importBatchId: batchId,
    examProfileId: row.examProfileId,
    sourceVersionId: input.sourceVersionId,
    academicYearId: row.academicYearId ?? null,
    boardName: row.boardName?.trim() || null,
    examYear: row.examYear ?? null,
    subjectId: row.subjectId ?? null,
    bookId: row.bookId ?? null,
    chapterId: row.chapterId ?? null,
    topicId: row.topicId ?? null,
    conceptId: row.conceptId ?? null,
    appearanceCount: row.appearanceCount,
    importanceScore: row.importanceScore ?? null,
    questionTypeDistribution: row.questionTypeDistribution ?? null,
    difficultyDistribution: row.difficultyDistribution ?? null,
    pageReference: row.pageReference.trim(),
    notes: row.notes?.trim() || null,
    verificationStatus: "under_review" as const,
  })));
  return { batchId, acceptedRows, rejected };
}

export async function reviewHistoricalImportBatch(input: { batchId: number; actorUserId: number; status: "verified" | "rejected" | "archived" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [batch] = await db.select({ id: historicalAnalysisImportBatches.id, status: historicalAnalysisImportBatches.status }).from(historicalAnalysisImportBatches).where(eq(historicalAnalysisImportBatches.id, input.batchId)).limit(1);
  if (!batch || batch.status !== "under_review") return false;
  await db.update(historicalAnalysisImportBatches).set({ status: input.status, reviewedByUserId: input.actorUserId, reviewedAt: new Date() }).where(eq(historicalAnalysisImportBatches.id, input.batchId));
  await db.update(historicalPatternMetrics).set({ verificationStatus: input.status === "verified" ? "verified" : "archived" }).where(eq(historicalPatternMetrics.importBatchId, input.batchId));
  return true;
}

export async function getHistoricalImportOptions() {
  const db = await getDb();
  if (!db) return { academicYears: [], subjects: [], books: [], chapters: [], topics: [], concepts: [], examProfiles: [], sourceVersions: [] };
  const [years, subjectRows, bookRows, chapterRows, topicRows, conceptRows, profileRows, sourceRows] = await Promise.all([
    db.select({ id: academicYears.id, name: academicYears.name }).from(academicYears).orderBy(desc(academicYears.name)),
    db.select({ id: subjects.id, academicYearId: subjects.academicYearId, nameEn: subjects.nameEn, nameBn: subjects.nameBn }).from(subjects).orderBy(subjects.nameEn),
    db.select({ id: books.id, subjectId: books.subjectId, titleEn: books.titleEn, titleBn: books.titleBn }).from(books).orderBy(books.titleEn),
    db.select({ id: chapters.id, bookId: chapters.bookId, chapterNo: chapters.chapterNo, titleEn: chapters.titleEn, titleBn: chapters.titleBn }).from(chapters).orderBy(chapters.chapterNo),
    db.select({ id: topics.id, chapterId: topics.chapterId, titleEn: topics.titleEn, titleBn: topics.titleBn }).from(topics).orderBy(topics.titleEn),
    db.select({ id: concepts.id, topicId: concepts.topicId, titleEn: concepts.titleEn, titleBn: concepts.titleBn }).from(concepts).orderBy(concepts.titleEn),
    db.select({ id: examProfiles.id, title: examProfiles.title, examType: examProfiles.examType, institution: examProfiles.institution, unit: examProfiles.unit }).from(examProfiles).where(eq(examProfiles.status, "active")).orderBy(examProfiles.examType, examProfiles.title),
    db.select({ id: sourceVersions.id, title: sources.title, organization: sources.organization, versionLabel: sourceVersions.versionLabel, sourceType: sources.sourceType }).from(sourceVersions).innerJoin(sources, eq(sourceVersions.sourceId, sources.id)).where(authorisedSource).orderBy(sources.organization, sources.title),
  ]);
  return { academicYears: years, subjects: subjectRows, books: bookRows, chapters: chapterRows, topics: topicRows, concepts: conceptRows, examProfiles: profileRows, sourceVersions: sourceRows };
}

export async function getHistoricalImportBatches() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: historicalAnalysisImportBatches.id, fileName: historicalAnalysisImportBatches.fileName, fileType: historicalAnalysisImportBatches.fileType, totalRows: historicalAnalysisImportBatches.totalRows, acceptedRows: historicalAnalysisImportBatches.acceptedRows, rejectedRows: historicalAnalysisImportBatches.rejectedRows, status: historicalAnalysisImportBatches.status, createdAt: historicalAnalysisImportBatches.createdAt, sourceTitle: sources.title, sourceUrl: sources.sourceUrl, sourceVersion: sourceVersions.versionLabel })
    .from(historicalAnalysisImportBatches).innerJoin(sourceVersions, eq(historicalAnalysisImportBatches.sourceVersionId, sourceVersions.id)).innerJoin(sources, eq(sourceVersions.sourceId, sources.id)).orderBy(desc(historicalAnalysisImportBatches.createdAt)).limit(50);
}

export async function getVerifiedHistoricalAnalysis(filters: { examProfileId?: number; subjectId?: number; chapterId?: number; boardName?: string; examYear?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(historicalPatternMetrics.verificationStatus, "verified"), eq(historicalAnalysisImportBatches.status, "verified"), authorisedSource];
  if (filters.examProfileId) conditions.push(eq(historicalPatternMetrics.examProfileId, filters.examProfileId));
  if (filters.subjectId) conditions.push(eq(historicalPatternMetrics.subjectId, filters.subjectId));
  if (filters.chapterId) conditions.push(eq(historicalPatternMetrics.chapterId, filters.chapterId));
  if (filters.boardName) conditions.push(eq(historicalPatternMetrics.boardName, filters.boardName));
  if (filters.examYear) conditions.push(eq(historicalPatternMetrics.examYear, filters.examYear));
  return db.select({ id: historicalPatternMetrics.id, examProfileId: examProfiles.id, examTitle: examProfiles.title, examType: examProfiles.examType, institution: examProfiles.institution, unit: examProfiles.unit, boardName: historicalPatternMetrics.boardName, examYear: historicalPatternMetrics.examYear, subjectId: subjects.id, subject: subjects.nameEn, chapterId: chapters.id, chapter: chapters.titleEn, topicId: topics.id, topic: topics.titleEn, appearanceCount: historicalPatternMetrics.appearanceCount, importanceScore: historicalPatternMetrics.importanceScore, questionTypeDistribution: historicalPatternMetrics.questionTypeDistribution, difficultyDistribution: historicalPatternMetrics.difficultyDistribution, notes: historicalPatternMetrics.notes, pageReference: historicalPatternMetrics.pageReference, sourceTitle: sources.title, sourceUrl: sources.sourceUrl, sourceVersion: sourceVersions.versionLabel })
    .from(historicalPatternMetrics)
    .innerJoin(historicalAnalysisImportBatches, eq(historicalPatternMetrics.importBatchId, historicalAnalysisImportBatches.id))
    .innerJoin(examProfiles, eq(historicalPatternMetrics.examProfileId, examProfiles.id))
    .innerJoin(sourceVersions, eq(historicalPatternMetrics.sourceVersionId, sourceVersions.id))
    .innerJoin(sources, eq(sourceVersions.sourceId, sources.id))
    .leftJoin(subjects, eq(historicalPatternMetrics.subjectId, subjects.id))
    .leftJoin(chapters, eq(historicalPatternMetrics.chapterId, chapters.id))
    .leftJoin(topics, eq(historicalPatternMetrics.topicId, topics.id))
    .where(and(...conditions)).orderBy(desc(historicalPatternMetrics.importanceScore), desc(historicalPatternMetrics.appearanceCount)).limit(200);
}
