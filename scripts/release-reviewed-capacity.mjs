import { releaseReviewedQuestionCapacity } from "../server/reviewedQuestionCapacity.ts";

const actorUserId = Number(process.env.REVIEWER_USER_ID ?? "1");
if (!Number.isInteger(actorUserId) || actorUserId <= 0) {
  throw new Error("REVIEWER_USER_ID must be a positive integer");
}

const result = await releaseReviewedQuestionCapacity(actorUserId);
console.log(JSON.stringify({ release: "reviewed-hsc-admission-capacity", actorUserId, ...result }, null, 2));
