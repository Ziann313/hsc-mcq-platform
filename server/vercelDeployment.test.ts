import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

describe("Vercel deployment contract", () => {
  it("uses a shared Express app with a serverless entrypoint and bundled static assets", () => {
    const appFactory = fs.readFileSync(path.join(root, "server/_core/app.ts"), "utf8");
    const entry = fs.readFileSync(path.join(root, "api/index.ts"), "utf8");
    const config = fs.readFileSync(path.join(root, "vercel.json"), "utf8");
    const staticServer = fs.readFileSync(path.join(root, "server/_core/vite.ts"), "utf8");

    expect(appFactory).toContain("export function createApp");
    expect(entry).toContain("export default app");
    expect(entry).toContain("serveStatic(app)");
    expect(config).toContain('"includeFiles": "dist/public/**"');
    expect(config).toContain('"source": "/(.*)"');
    expect(staticServer).toContain("process.env.VERCEL");
  });
});
