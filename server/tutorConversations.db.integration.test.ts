import { afterEach, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { aiConversations, aiMessages, users } from "../drizzle/schema";
import { getDb, getTutorConversationHistory, getTutorConversationMessages, saveTutorConversation } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

describe.skipIf(!enabled)("Tutor conversation database integration", () => {
  it("persists a private grounded exchange and never returns another student’s conversation", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const stamp = Date.now();
    const first = await db.insert(users).values({ openId: `mcq-guru-tutor-first-${stamp}`, name: "Tutor conversation owner", role: "student" });
    const second = await db.insert(users).values({ openId: `mcq-guru-tutor-second-${stamp}`, name: "Tutor conversation outsider", role: "student" });
    const ownerId = Number(first[0].insertId);
    const outsiderId = Number(second[0].insertId);
    cleanup = async () => {
      const conversations = await db.select({ id: aiConversations.id }).from(aiConversations).where(inArray(aiConversations.userId, [ownerId, outsiderId]));
      if (conversations.length) await db.delete(aiMessages).where(inArray(aiMessages.conversationId, conversations.map(item => item.id)));
      await db.delete(aiConversations).where(inArray(aiConversations.userId, [ownerId, outsiderId]));
      await db.delete(users).where(inArray(users.id, [ownerId, outsiderId]));
    };

    const conversationId = await saveTutorConversation({
      userId: ownerId,
      title: "Explain Ohm's law",
      messages: [
        { role: "user", content: "Explain Ohm's law." },
        { role: "assistant", content: "A source-grounded explanation." },
      ],
    });
    expect(conversationId).toBeTypeOf("number");
    if (!conversationId) return;

    await saveTutorConversation({
      userId: ownerId,
      conversationId,
      title: "Explain Ohm's law",
      messages: [{ role: "user", content: "Give one practical example." }],
    });
    const history = await getTutorConversationHistory(ownerId);
    expect(history[0]).toMatchObject({ id: conversationId, title: "Explain Ohm's law", lastMessagePreview: "Give one practical example." });
    const messages = await getTutorConversationMessages(ownerId, conversationId);
    expect(messages?.messages.map(item => item.role)).toEqual(["user", "assistant", "user"]);
    await expect(getTutorConversationMessages(outsiderId, conversationId)).resolves.toBeNull();
    await expect(saveTutorConversation({ userId: outsiderId, conversationId, title: "Attempted access", messages: [{ role: "user", content: "No access" }] })).resolves.toBeNull();
  });
});
