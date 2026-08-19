import { describe, expect, it } from "vitest";
import { dedicatedRoutePaths, homeRoutePaths, legacyRouteRedirects, registeredRoutePaths } from "../client/src/routePaths";
import { adminNavigationItems, studentNavigationItems } from "../client/src/components/PlatformShell";

describe("application route integrity", () => {
  it("registers every destination exposed to students", () => {
    for (const item of studentNavigationItems) {
      expect(registeredRoutePaths.has(item.path)).toBe(true);
    }
  });

  it("registers every destination exposed to governance roles", () => {
    for (const item of adminNavigationItems) {
      expect(registeredRoutePaths.has(item.path)).toBe(true);
    }
  });

  it("keeps only the dashboard Home-backed and gives student destinations dedicated routes or clear modern redirects", () => {
    expect(homeRoutePaths).toEqual(["/"]);
    expect(dedicatedRoutePaths).toEqual(expect.arrayContaining(["/practice", "/tutor", "/exams", "/admission", "/progress", "/settings", "/profile", "/live-exam", "/live-exams"]));
    expect(studentNavigationItems.map(item => item.path)).not.toEqual(expect.arrayContaining(["/study-plan", "/mistakes", "/bookmarks", "/mcq-lab"]));
    expect(studentNavigationItems.filter(item => item.path === "/practice")).toHaveLength(1);
    expect(studentNavigationItems.filter(item => item.path === "/mistake-vault")).toHaveLength(1);
  });

  it("maps historic navigation targets to valid modern destinations", () => {
    for (const destination of Object.values(legacyRouteRedirects)) {
      expect(registeredRoutePaths.has(destination)).toBe(true);
    }
  });
});
