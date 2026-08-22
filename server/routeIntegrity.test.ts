import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { dedicatedRoutePaths, homeRoutePaths, legacyRouteRedirects, publicRoutePaths, registeredRoutePaths } from "../client/src/routePaths";
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

  it("keeps the authenticated dashboard Home-backed and gives student destinations dedicated routes or clear modern redirects", () => {
    expect(homeRoutePaths).toEqual(["/dashboard"]);
    expect(publicRoutePaths).toEqual(expect.arrayContaining(["/", "/about", "/privacy", "/terms", "/contact"]));
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

  it("registers direct-link compatibility routes requested by learning and legacy flows", () => {
    expect(registeredRoutePaths.has("/dashboard")).toBe(true);
    expect(dedicatedRoutePaths).toEqual(expect.arrayContaining(["/practice", "/exams"]));
    expect(legacyRouteRedirects).toMatchObject({
      "/admission-prep": "/admission",
      "/hsc-prep": "/exams",
      "/previous-year-questions": "/historical-analysis",
    });
  });

  it("keeps an explicit final NotFound fallback instead of a broad rest-route that masks student pages", () => {
    const routerSource = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    expect(routerSource).not.toContain('path="/:rest*"');
    expect(routerSource).not.toContain('path={":rest*"}');
    expect(routerSource).toContain("<Route component={NotFound} />");
  });
});
