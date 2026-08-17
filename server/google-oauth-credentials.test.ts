import { describe, expect, it } from "vitest";

const googleOAuthEnabled = process.env.GOOGLE_OAUTH_ENABLED === "true";

describe("Google OAuth configuration", () => {
  it.skipIf(!googleOAuthEnabled)("is recognized by Google without completing an authorization flow", async () => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    expect(clientId, "GOOGLE_OAUTH_CLIENT_ID must be configured").toBeTruthy();
    expect(clientSecret, "GOOGLE_OAUTH_CLIENT_SECRET must be configured").toBeTruthy();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: "authorization_code",
        code: "credential-validation-only",
        redirect_uri: "https://hscmcqapp-euxpe52h.manus.space/api/auth/google/callback",
      }),
    });
    const body = await response.json() as { error?: string };
    // An invalid authorization code is expected. An invalid client proves the configured credentials cannot be used.
    expect(body.error).not.toBe("invalid_client");
  }, 15_000);
});
