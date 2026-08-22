import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema.ts";
import { getDb } from "../server/db.ts";
import { releaseReviewedQuestionCapacity } from "../server/reviewedQuestionCapacity.ts";

const ownerOpenId = process.env.OWNER_OPEN_ID;
if (!ownerOpenId) throw new Error("OWNER_OPEN_ID is required for an audited bilingual-capacity release.");

const db = await getDb();
if (!db) throw new Error("Database unavailable.");

const [owner] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.openId, ownerOpenId)).limit(1);
if (!owner || owner.role !== "admin") throw new Error("The configured owner must hold the administrator role to publish bilingual capacity.");

const outcome = await releaseReviewedQuestionCapacity(owner.id);
console.log(JSON.stringify({ created: outcome.created.length, published: outcome.published.length, skipped: outcome.skipped.length, total: outcome.total }));
