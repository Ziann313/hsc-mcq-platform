import { afterEach, describe, expect, it } from "vitest";
import { academicYears, knowledgeChunks, sourceVersions, sources } from "../drizzle/schema";
import { getActiveSourceEvidence, getDb } from "./db";
import { eq, inArray } from "drizzle-orm";

const enabled = Boolean(process.env.DATABASE_URL);
let cleanup: (() => Promise<void>) | undefined;
afterEach(async () => { await cleanup?.(); cleanup = undefined; });

(enabled ? describe : describe.skip)("active source evidence academic-year scope", () => {
  it("returns only active evidence linked to the requested academic year", async () => {
    const db = await getDb();
    if (!db) return;
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1_000_000).toString(36)}`;
    const firstYearName = `sa-${stamp}`.slice(0, 20);
    const secondYearName = `sb-${stamp}`.slice(0, 20);
    let sourceId = 0; let versionId = 0; const yearIds: number[] = []; const chunkIds: number[] = [];
    cleanup = async () => {
      if (chunkIds.length) await db.delete(knowledgeChunks).where(inArray(knowledgeChunks.id, chunkIds));
      if (versionId) await db.delete(sourceVersions).where(eq(sourceVersions.id, versionId));
      if (sourceId) await db.delete(sources).where(eq(sources.id, sourceId));
      if (yearIds.length) await db.delete(academicYears).where(inArray(academicYears.id, yearIds));
    };
    const firstYear = await db.insert(academicYears).values({ name: firstYearName });
    const secondYear = await db.insert(academicYears).values({ name: secondYearName });
    yearIds.push(Number(firstYear[0].insertId), Number(secondYear[0].insertId));
    const source = await db.insert(sources).values({ organization: "Test source", title: "Academic-year scoped evidence", sourceUrl: `https://example.invalid/source-scope-${stamp}`, sourceType: "official_syllabus", languageVersion: "en", accessClassification: "official_public" });
    sourceId = Number(source[0].insertId);
    const version = await db.insert(sourceVersions).values({ sourceId, versionLabel: "test", contentHash: `scope-${stamp}`, status: "active" });
    versionId = Number(version[0].insertId);
    const chunks = await db.insert(knowledgeChunks).values([
      { sourceVersionId: versionId, academicYearId: yearIds[0], pageReference: "A", content: "curriculum scope-proof shared phrase alpha", contentHash: `scope-a-${stamp}` },
      { sourceVersionId: versionId, academicYearId: yearIds[1], pageReference: "B", content: "curriculum scope-proof shared phrase beta", contentHash: `scope-b-${stamp}` },
    ]);
    const firstChunkId = Number(chunks[0].insertId);
    chunkIds.push(firstChunkId, firstChunkId + 1);
    const evidence = await getActiveSourceEvidence("scope-proof shared phrase", firstYearName);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ pageReference: "A", content: expect.stringContaining("alpha") });
  });
});
