import { describe, expect, it } from "vitest";
import { getCurriculumCoverageSummary } from "./db";

const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("curriculum coverage summary", () => {
  it("keeps the three HSC groups visible and returns source-governed science chapter availability", async () => {
    const summary = await getCurriculumCoverageSummary();
    expect(summary.groups.map(group => group.slug)).toEqual(expect.arrayContaining(["science", "humanities", "business-studies"]));
    expect(summary.groups.every(group => group.registeredSubjectCount >= group.publishedSubjectCount && group.registeredChapterCount >= group.publishedChapterCount)).toBe(true);
    const higherMathematics = summary.scienceChapters.find(chapter => chapter.subject === "Higher Mathematics 2nd Paper");
    expect(higherMathematics).toEqual(expect.objectContaining({ subject: "Higher Mathematics 2nd Paper" }));
    expect(higherMathematics?.questionCount).toBeGreaterThanOrEqual(8);
  });
});
