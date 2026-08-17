import { describe, expect, it } from "vitest";
import { canAccessGovernance, visibleNavigationItems } from "../client/src/components/PlatformShell";

describe("visibleNavigationItems", () => {
  it("keeps governance tools out of student and unauthenticated navigation", () => {
    for (const role of [undefined, "user", "student"]) {
      const paths = visibleNavigationItems(role).map(item => item.path);

      expect(paths).not.toContain("/import");
      expect(paths).not.toContain("/questions/new");
      expect(paths).not.toContain("/governance");
      expect(paths).not.toContain("/admission-patterns");
      expect(paths).toContain("/notices");
    }
  });

  it("exposes review tools only to content governance roles", () => {
    for (const role of ["admin", "reviewer", "content_admin", "super_admin"]) {
      const paths = visibleNavigationItems(role).map(item => item.path);

      expect(paths).toEqual(expect.arrayContaining([
        "/admin",
        "/governance",
        "/import",
        "/questions/new",
        "/admission-patterns",
      ]));
    }
  });

  it("does not label the live-exam runner as a question bank", () => {
    const liveExam = visibleNavigationItems("user").find(item => item.path === "/live-exam");

    expect(liveExam).toMatchObject({ label: "Live exam", bn: "লাইভ এক্সাম" });
  });

  it("uses the same role policy for direct governance URLs and hidden navigation", () => {
    expect(canAccessGovernance("student")).toBe(false);
    expect(canAccessGovernance("reviewer")).toBe(true);
    expect(canAccessGovernance("admin")).toBe(true);
  });
});
