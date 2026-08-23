import { describe, expect, it } from "vitest";
import { createImageSolverRequestPolicy } from "./imageSolverPolicy";
import { sanitizeOptionalPlainText, sanitizePlainText } from "../shared/sanitizeInput";

describe("P0 request hardening", () => {
  it("limits image solver use to two requests per rolling hour independently per learner", () => {
    const policy = createImageSolverRequestPolicy();
    const now = 1_000_000;
    expect(policy.consume(7, now).allowed).toBe(true);
    expect(policy.consume(7, now + 1).allowed).toBe(true);
    expect(policy.consume(7, now + 2).allowed).toBe(false);
    expect(policy.consume(8, now + 2).allowed).toBe(true);
    expect(policy.consume(7, now + 3_600_000).allowed).toBe(true);
  });

  it("removes tags and control characters from learner-supplied plain text", () => {
    expect(sanitizePlainText("  <b>Force</b>\u0000  ")).toBe("Force");
    expect(sanitizeOptionalPlainText("<script>alert(1)</script>")).toBe("alert(1)");
    expect(sanitizeOptionalPlainText("<br> ")).toBeNull();
  });
});
