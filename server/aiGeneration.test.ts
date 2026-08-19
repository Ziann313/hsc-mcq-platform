import { describe, expect, it } from "vitest";
import { independentlyVerified } from "../shared/aiGeneration";

describe("independent AI answer verification gate", () => {
  it("permits only a supported, calculated, matching answer key with a written rationale", () => {
    expect(independentlyVerified(2, { supported: true, correctOptionIndex: 2, calculationChecked: true, reason: "Evidence confirms option C." })).toBe(true);
  });

  it("blocks unsupported evidence, answer disagreement, missing calculation checks, and empty rationales", () => {
    expect(independentlyVerified(2, { supported: false, correctOptionIndex: 2, calculationChecked: true, reason: "Insufficient evidence" })).toBe(false);
    expect(independentlyVerified(2, { supported: true, correctOptionIndex: 1, calculationChecked: true, reason: "Different key" })).toBe(false);
    expect(independentlyVerified(2, { supported: true, correctOptionIndex: 2, calculationChecked: false, reason: "Not checked" })).toBe(false);
    expect(independentlyVerified(2, { supported: true, correctOptionIndex: 2, calculationChecked: true, reason: "  " })).toBe(false);
  });
});
