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

  it("keeps the Home-backed student surfaces explicitly registered", () => {
    expect(homeRoutePaths).toEqual(expect.arrayContaining([
      "/", "/practice", "/exams", "/tutor", "/progress", "/study-plan", "/mistakes", "/bookmarks",
    ]));
    expect(dedicatedRoutePaths).toEqual(expect.arrayContaining(["/settings", "/profile", "/live-exam"]));
  });

  it("maps historic navigation targets to valid modern destinations", () => {
    for (const destination of Object.values(legacyRouteRedirects)) {
      expect(registeredRoutePaths.has(destination)).toBe(true);
    }
  });
});
