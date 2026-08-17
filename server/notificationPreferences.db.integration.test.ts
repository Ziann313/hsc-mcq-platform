import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { studentNotificationPreferences, users } from "../drizzle/schema";
import { getDb, getNotificationPreferences, saveNotificationPreferences } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;

afterEach(async () => {
  await cleanup?.();
  cleanup = undefined;
});

describe.skipIf(!enabled)("notification-preference database integration", () => {
  it("returns safe defaults and persists a student’s selected notification categories", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const stamp = Date.now();
    const userResult = await db.insert(users).values({
      openId: `mcq-guru-notification-preference-${stamp}`,
      name: "Notification preference integration test",
      role: "student",
    });
    const userId = Number(userResult[0].insertId);
    cleanup = async () => {
      await db.delete(studentNotificationPreferences).where(eq(studentNotificationPreferences.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    };

    await expect(getNotificationPreferences(userId)).resolves.toMatchObject({
      studyEnabled: true,
      admissionEnabled: true,
      contentEnabled: true,
    });

    await expect(saveNotificationPreferences(userId, {
      studyEnabled: false,
      admissionEnabled: true,
      contentEnabled: false,
    })).resolves.toMatchObject({
      studyEnabled: false,
      admissionEnabled: true,
      contentEnabled: false,
    });

    await expect(saveNotificationPreferences(userId, { contentEnabled: true })).resolves.toMatchObject({
      studyEnabled: true,
      admissionEnabled: true,
      contentEnabled: true,
    });
  });
});
