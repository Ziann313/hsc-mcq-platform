import { describe, expect, it } from "vitest";
import { filterContentBySearch, normaliseContentSearch } from "../client/src/lib/contentDiscovery";

const content = [
  { title: "Physics 2nd Paper", subtitle: "Current Electricity and Circuit Fundamentals", keywords: ["বিদ্যুৎ"] },
  { title: "Business Organization and Management 1st Paper", subtitle: "Partnership", keywords: ["ব্যবসায় শিক্ষা"] },
  { title: "Sociology 1st Paper", subtitle: "Family and Socialization", keywords: ["সমাজবিজ্ঞান"] },
];

describe("content discovery filtering", () => {
  it("normalises whitespace and case before matching a search", () => {
    expect(normaliseContentSearch("  PHYSICS   2nd ")).toBe("physics 2nd");
    expect(filterContentBySearch(content, "physics current").map(item => item.title)).toEqual(["Physics 2nd Paper"]);
  });

  it("matches Bengali keywords and returns an empty result for unknown content", () => {
    expect(filterContentBySearch(content, "সমাজবিজ্ঞান").map(item => item.title)).toEqual(["Sociology 1st Paper"]);
    expect(filterContentBySearch(content, "unavailable topic")).toEqual([]);
  });
});
