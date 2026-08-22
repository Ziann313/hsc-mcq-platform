import { and, eq, sql } from "drizzle-orm";
import { questions, users } from "../drizzle/schema";
import { allReviewedQuestionCapacity, validateReviewedQuestionCapacity } from "../shared/reviewedQuestionCapacity";
import { createReviewQuestion, getDb, publishApprovedQuestion, reviewQuestion } from "./db";

export async function releaseReviewedQuestionCapacity(actorUserId: number) {
  validateReviewedQuestionCapacity();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [actor] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, actorUserId)).limit(1);
  if (!actor || actor.role !== "admin") throw new Error("A platform administrator must run the reviewed capacity release");

  const created: number[] = [];
  const published: number[] = [];
  const skipped: number[] = [];
  for (const definition of allReviewedQuestionCapacity) {
    const admissionClause = definition.admissionTrack ? eq(questions.admissionTrack, definition.admissionTrack) : sql`${questions.admissionTrack} is null`;
    const [existing] = await db.select({ id: questions.id, status: questions.status }).from(questions).where(and(
      eq(questions.academicYearId, definition.academicYearId),
      eq(questions.subjectId, definition.subjectId),
      eq(questions.bookId, definition.bookId),
      eq(questions.chapterId, definition.chapterId),
      eq(questions.contentLanguage, definition.contentLanguage),
      eq(questions.prompt, definition.prompt),
      admissionClause,
    )).limit(1);

    let questionId = existing?.id;
    let status = existing?.status;
    if (!questionId) {
      questionId = await createReviewQuestion({ ...definition, actorUserId });
      status = "human_review";
      created.push(questionId);
    }
    if (status === "human_review") {
      const reviewed = await reviewQuestion({ questionId, status: "approved", actorUserId, note: "Capacity release: answer key, explanation, source references, curriculum mapping, and original-content disclosure reviewed." });
      if (!reviewed) throw new Error(`Unable to approve reviewed capacity question #${questionId}`);
      status = "approved";
    }
    if (status === "approved") {
      const outcome = await publishApprovedQuestion({ questionId, actorUserId });
      if (outcome.outcome !== "published") throw new Error(`Unable to publish reviewed capacity question #${questionId}: ${outcome.outcome}`);
      published.push(questionId);
    } else if (status === "published") {
      skipped.push(questionId);
    } else {
      throw new Error(`Question #${questionId} has incompatible release status: ${status}`);
    }
  }
  return { created, published, skipped, total: allReviewedQuestionCapacity.length };
}
