import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentPath = new URL("../client/src/components/OfflineIndicator.tsx", import.meta.url);
const appPath = new URL("../client/src/App.tsx", import.meta.url);

describe("shared offline indicator", () => {
  it("reports browser connectivity without introducing protected-response caching", () => {
    const source = readFileSync(componentPath, "utf8");
    expect(source).toContain('window.addEventListener("online", updateStatus)');
    expect(source).toContain('window.addEventListener("offline", updateStatus)');
    expect(source).toContain('aria-live="polite"');
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("caches.");
  });

  it("is mounted once at the application root", () => {
    const source = readFileSync(appPath, "utf8");
    expect(source).toContain('import OfflineIndicator from "./components/OfflineIndicator"');
    expect(source).toContain("<OfflineIndicator />");
  });
});
