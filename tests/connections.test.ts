import test from "node:test";
import assert from "node:assert/strict";
import { createConnections, seal, unseal } from "../lib/connections.mjs";
const env = {
  CONNECTION_ENCRYPTION_KEY: "ab".repeat(32),
  GOOGLE_CLIENT_ID: "test-client",
  GOOGLE_CLIENT_SECRET: "test-secret",
};
const req = (path: string, options: RequestInit = {}) =>
  new Request("https://volta.example/api/connections/" + path, options);
test("encrypted connection sessions reject modification and wrong keys", async () => {
  const value = await seal({ auth: "sensitive-fixture" }, env);
  assert.equal(value.includes("sensitive-fixture"), false);
  assert.equal((await unseal(value, env)).auth, "sensitive-fixture");
  assert.equal(
    await unseal(value, { CONNECTION_ENCRYPTION_KEY: "cd".repeat(32) }),
    null,
  );
  assert.equal(await unseal("invalid", env), null);
});
test("Google sign-in uses official OAuth, PKCE and an HttpOnly state cookie", async () => {
  const r = await createConnections()(req("youtube/start"), env);
  const u = new URL(r.headers.get("Location")!);
  assert.equal(u.hostname, "accounts.google.com");
  assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  assert.equal(
    u.searchParams.get("redirect_uri"),
    "https://volta.example/api/connections/youtube/callback",
  );
  assert.match(r.headers.get("Set-Cookie")!, /HttpOnly; Secure; SameSite=Lax/);
  assert.ok(u.searchParams.get("state"));
});
test("OAuth callback rejects state without exchanging tokens", async () => {
  let called = false;
  const r = await createConnections({
    fetcher: async () => {
      called = true;
      return Response.json({});
    },
  })(req("youtube/callback?state=bad&code=bad"), env);
  assert.equal(r.status, 302);
  assert.equal(r.headers.get("Location"), "/?connection=youtube-failed");
  assert.equal(called, false);
});
test("cross-origin disconnect and link creation are rejected", async () => {
  for (const provider of ["youtube", "stremio"]) {
    const r = await createConnections()(
      req(provider + "/disconnect", {
        method: "POST",
        headers: { Origin: "https://evil.example" },
      }),
      env,
    );
    assert.equal(r.status, 403);
  }
});
test("Stremio links through the official endpoint and seals the pending code", async () => {
  const handler = createConnections({
    fetcher: async (input: Parameters<typeof fetch>[0]) => {
      assert.equal(new URL(String(input)).hostname, "link.stremio.com");
      return Response.json({
        result: {
          code: "test-code",
          link: "https://link.stremio.com/test-code",
        },
      });
    },
  });
  const r = await handler(
    req("stremio/start", {
      method: "POST",
      headers: { Origin: "https://volta.example" },
    }),
    env,
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).link, "https://link.stremio.com/test-code");
  assert.equal(r.headers.get("Set-Cookie")!.includes("test-code"), false);
});
test("linked credentials are never returned by status", async () => {
  const s = await seal(
    { sub: "browser", auth: "test-sensitive-auth", until: Date.now() + 60000 },
    env,
  );
  const r = await createConnections()(
    req("stremio/status", { headers: { Cookie: "__Host-volta-stremio=" + s } }),
    env,
  );
  const text = await r.text();
  assert.equal(JSON.parse(text).connected, true);
  assert.equal(text.includes("test-sensitive-auth"), false);
});
