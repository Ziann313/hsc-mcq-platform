import { describe, expect, it } from "vitest";
import { getSafeInternalPath } from "../client/src/lib/safeNavigation";

describe("safe internal navigation", () => {
  it("keeps valid local app destinations for post-login recovery", () => {
    expect(getSafeInternalPath("/practice")).toBe("/practice");
    expect(getSafeInternalPath("/exams/77/attempt")).toBe("/exams/77/attempt");
  });

  it("rejects empty, external-style, and backslash-containing destinations", () => {
    expect(getSafeInternalPath(undefined)).toBeUndefined();
    expect(getSafeInternalPath("https://example.com")).toBeUndefined();
    expect(getSafeInternalPath("//example.com")).toBeUndefined();
    expect(getSafeInternalPath("/\\example.com")).toBeUndefined();
  });
});
