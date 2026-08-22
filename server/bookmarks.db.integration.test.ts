import { afterEach, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { bookmarks, questions, questionSources, sourceVersions, users } from "../drizzle/schema";
import { getDb } from "./db";
import { addBookmark, getBookmarks, removeBookmark } from "./mcqDb";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

describe.skipIf(!enabled)("bookmark database integration", () => {
  it("stores only an owner’s source-valid published bookmark and denies cross-user removal", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;
    const [published] = await db.select({ id: questions.id }).from(questions)
      .innerJoin(questionSources, eq(questionSources.questionId, questions.id))
      .innerJoin(sourceVersions, eq(questionSources.sourceVersionId, sourceVersions.id))
      .where(and(eq(questions.status, "published"), eq(sourceVersions.status, "active")))
      .limit(1);
    expect(published).toBeTruthy();
    if (!published) return;

    const stamp = Date.now();
    const owner = await db.insert(users).values({ openId: `mcq-guru-bookmark-owner-${stamp}`, name: "Bookmark owner", role: "student" });
    const outsider = await db.insert(users).values({ openId: `mcq-guru-bookmark-outsider-${stamp}`, name: "Bookmark outsider", role: "student" });
    const ownerId = Number(owner[0].insertId);
    const outsiderId = Number(outsider[0].insertId);
    cleanup = async () => {
      await db.delete(bookmarks).where(inArray(bookmarks.userId, [ownerId, outsiderId]));
      await db.delete(users).where(inArray(users.id, [ownerId, outsiderId]));
    };

    await expect(addBookmark(ownerId, published.id)).resolves.toBe(true);
    await expect(addBookmark(ownerId, published.id)).resolves.toBe(true);
    const saved = await getBookmarks(ownerId);
    expect(saved.filter(item => item.questionId === published.id)).toHaveLength(1);
    const bookmark = saved.find(item => item.questionId === published.id);
    expect(bookmark).toBeTruthy();
    if (!bookmark) return;
    await expect(removeBookmark(outsiderId, bookmark.id)).resolves.toBe(false);
    await expect(removeBookmark(ownerId, bookmark.id)).resolves.toBe(true);
  });
});
