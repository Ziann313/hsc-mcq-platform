import { describe, expect, it } from "vitest";
import { isAdministratorRole } from "../shared/authorization";

describe("administrator authorization policy", () => {
  it("accepts only supported administrative roles and rejects ordinary or missing roles", () => {
    expect(isAdministratorRole("admin")).toBe(true);
    expect(isAdministratorRole("content_admin")).toBe(true);
    expect(isAdministratorRole("super_admin")).toBe(true);
    expect(isAdministratorRole("user")).toBe(false);
    expect(isAdministratorRole(undefined)).toBe(false);
  });
});
