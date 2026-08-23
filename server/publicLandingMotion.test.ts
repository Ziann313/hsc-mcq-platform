import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingPath = new URL("../client/src/pages/PublicLandingPage.tsx", import.meta.url);
const appPath = new URL("../client/src/App.tsx", import.meta.url);
const stylesPath = new URL("../client/src/index.css", import.meta.url);

describe("public landing motion", () => {
  it("keeps the original landing connected to secure sign-in and published capacity", () => {
    const source = readFileSync(landingPath, "utf8");
    expect(source).toContain("publishedContentAvailability");
    expect(source).toContain("startLogin()");
    expect(source).toContain('startLogin("/practice")');
    expect(source).toContain("mcq-signal-board");
    expect(source).not.toContain("mcqguru.net");
    expect(source).not.toContain("animated-logo.svg");
  });

  it("uses the original learning-signal loader while retaining reduced-motion support", () => {
    const app = readFileSync(appPath, "utf8");
    const styles = readFileSync(stylesPath, "utf8");
    expect(app).toContain("Finding your next learning signal");
    expect(app).toContain("mcq-route-loader__ring");
    expect(styles).toContain("mcq-signal-board__orbit");
    expect(styles).toContain("prefers-reduced-motion");
  });
});
