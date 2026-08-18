import { describe, expect, it } from "vitest";
import { catalogBookEntries, catalogSourceLeads, catalogSubjects } from "../drizzle/schema";

describe("catalogue registry schema", () => {
  it("stores subject, source, and book metadata without a textbook-content column", () => {
    expect(Object.keys(catalogSubjects)).toEqual(expect.arrayContaining(["subjectCode", "paperLabel", "englishVersionAvailability", "verificationStatus"]));
    expect(Object.keys(catalogSourceLeads)).toEqual(expect.arrayContaining(["eligibility", "permittedUse", "reusePermission", "reviewNotes"]));
    expect(Object.keys(catalogBookEntries)).toEqual(expect.arrayContaining(["listingType", "useStatus", "sourceUrl", "attribution"]));
    expect(Object.keys(catalogBookEntries)).not.toEqual(expect.arrayContaining(["content", "fileBytes", "downloadUrl"]));
  });

  it("keeps the controlled source classifications required for lawful question development", () => {
    expect(catalogSourceLeads.eligibility.enumValues).toEqual(["official_evidence", "supplementary_reference", "discovery_only", "blocked_unverified"]);
    expect(catalogBookEntries.useStatus.enumValues).toEqual(["official_metadata", "commercial_discovery_only", "pending_verification"]);
  });
});
