import test from "node:test";
import assert from "node:assert/strict";
import { createSlingService } from "../lib/sling";

const freeId = "a".repeat(32);
const paidId = "b".repeat(32);
const source = (id: string, extra = {}) => ({
  channel_guid: id,
  title: "NEWS",
  qvt_url: "schedule.qvt",
  metadata: {
    channel_name: "Example News",
    is_free: true,
    is_linear_channel: true,
    genre: ["News"],
  },
  ...extra,
});

function fixture(
  options: {
    catalog?: unknown[];
    licenseStatus?: number;
    manifest?: string;
  } = {},
) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/summary/ums/1.json"))
      return Response.json({ channels: options.catalog || [source(freeId)] });
    if (url.endsWith("/schedule.qvt"))
      return Response.json({
        playback_info: {
          dash_manifest_url:
            options.manifest || "http://media.example.test/live.mpd",
        },
      });
    assert.equal(url, "https://p-drmwv.movetv.com/widevine/proxy");
    return options.licenseStatus
      ? new Response("private provider diagnostic", {
          status: options.licenseStatus,
        })
      : new Response(new Uint8Array([1, 2, 3]));
  };
  return { service: createSlingService(fetcher), calls };
}

function licenseRequest(
  id = freeId,
  origin = "https://volta.test",
  extraHeaders = {},
) {
  return new Request(`https://volta.test/api/sling/license?channel=${id}`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/octet-stream",
      ...extraHeaders,
    },
    body: new Uint8Array([9, 8, 7]),
  });
}

test("Sling catalog includes only visible, free, live channels and coalesces requests", async () => {
  const { service, calls } = fixture({
    catalog: [
      source(freeId),
      source(paidId, { metadata: { is_free: false, is_linear_channel: true } }),
      source("c".repeat(32), { visibility: { visible: false } }),
      source("d".repeat(32), {
        metadata: { is_free: true, is_linear_channel: false },
      }),
      source("e".repeat(32), {
        metadata: {
          is_free: true,
          is_linear_channel: true,
          call_sign: "SLATEPO11",
        },
      }),
      source("../../private"),
    ],
  });
  const responses = await Promise.all([service.catalog(), service.catalog()]);
  assert.deepEqual(
    (await responses[0].json()).channels.map(
      (channel: { id: string }) => channel.id,
    ),
    [freeId],
  );
  assert.equal(calls.length, 1);
});

test("Sling resolves only catalog members and supplies HTTPS without exposing license credentials", async () => {
  const { service, calls } = fixture();
  const response = await service.stream(
    new Request(`https://volta.test/api/sling/stream?channel=${freeId}`),
  );
  assert.deepEqual(await response.json(), {
    manifest: "https://media.example.test/live.mpd",
  });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(
    (
      await service.stream(
        new Request(`https://volta.test/api/sling/stream?channel=${paidId}`),
      )
    ).status,
    404,
  );
  assert.equal(
    calls.filter((call) => call.url.endsWith("schedule.qvt")).length,
    1,
  );
});

test("Sling refuses unsafe manifest schemes", async () => {
  const { service } = fixture({ manifest: "javascript:alert(1)" });
  assert.equal(
    (
      await service.stream(
        new Request(`https://volta.test/api/sling/stream?channel=${freeId}`),
      )
    ).status,
    502,
  );
});

test("Sling license route rejects cross-origin, paid, malformed and oversized requests", async () => {
  const { service, calls } = fixture();
  assert.equal(
    (await service.license(licenseRequest(freeId, "https://other.test")))
      .status,
    403,
  );
  assert.equal(
    (
      await service.license(
        licenseRequest(freeId, "https://volta.test", {
          "Content-Length": "999999",
        }),
      )
    ).status,
    413,
  );
  assert.equal(
    (
      await service.license(
        licenseRequest(freeId, "https://volta.test", {
          "Content-Type": "text/plain",
        }),
      )
    ).status,
    415,
  );
  assert.equal(calls.length, 0);
  assert.equal((await service.license(licenseRequest("invalid"))).status, 404);
  assert.equal((await service.license(licenseRequest(paidId))).status, 404);
  assert.equal(calls.filter((call) => call.url.includes("widevine")).length, 0);
});

test("Sling forwards the native challenge only to its fixed license endpoint", async () => {
  const { service, calls } = fixture();
  const response = await service.license(licenseRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(
    [...new Uint8Array(await response.arrayBuffer())],
    [1, 2, 3],
  );
  const sent = calls.at(-1)!;
  const envelope = JSON.parse(String(sent.init?.body));
  assert.equal(envelope.channel_id, freeId);
  assert.deepEqual(envelope.message, [9, 8, 7]);
  assert.match(envelope.user_id, /^[\da-f-]{36}$/);
  assert.equal(sent.init?.redirect, "error");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("Sling never returns upstream license diagnostics", async () => {
  const { service } = fixture({ licenseStatus: 403 });
  const response = await service.license(licenseRequest());
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /private provider diagnostic/);
});

test("Sling checks the public origin when Next runs behind a reverse proxy", async () => {
  const { service } = fixture();
  const makeRequest = (origin: string) =>
    new Request(`http://internal:3000/api/sling/license?channel=${freeId}`, {
      method: "POST",
      headers: {
        Host: "volta.test",
        "X-Forwarded-Proto": "https",
        Origin: origin,
        "Content-Type": "application/octet-stream",
      },
      body: new Uint8Array([9]),
    });
  assert.equal(
    (await service.license(makeRequest("https://volta.test"))).status,
    200,
  );
  assert.equal(
    (await service.license(makeRequest("http://volta.test"))).status,
    403,
  );
});
