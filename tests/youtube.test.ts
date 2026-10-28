import test from "node:test";
import assert from "node:assert/strict";
import { createYouTubeSearch } from "../lib/youtube.mjs";
import { byteRange, createWorker } from "../worker/index.mjs";

test("search reports owner setup rather than pretending a missing key works", async () => {
  const search = createYouTubeSearch();
  const response = await search(
    new Request("https://example.com/api/youtube?q=tesla"),
    {},
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "YOUTUBE_SETUP_REQUIRED");
});
test("official search requests embeddable videos and caches matching queries", async () => {
  let calls = 0;
  const search = createYouTubeSearch({
    fetcher: async (input: Parameters<typeof fetch>[0]) => {
      const url = new URL(input instanceof Request ? input.url : input);
      calls++;
      assert.equal(url.hostname, "www.googleapis.com");
      assert.equal(url.searchParams.get("videoEmbeddable"), "true");
      assert.equal(url.searchParams.get("key"), "test-placeholder");
      return Response.json({
        items: [
          {
            id: { videoId: "abcdefghijk" },
            snippet: { title: "Test film", channelTitle: "Creator" },
          },
          { id: { videoId: "bad" }, snippet: { title: "Invalid" } },
        ],
      });
    },
  });
  for (let i = 0; i < 2; i++) {
    const r = await search(
      new Request("https://example.com/api/youtube?q=nature"),
      { YOUTUBE_API_KEY: "test-placeholder" },
    );
    const d = await r.json();
    assert.equal(d.items.length, 1);
    assert.equal(d.items[0].youtubeId, "abcdefghijk");
    assert.equal(JSON.stringify(d).includes("test-placeholder"), false);
  }
  assert.equal(calls, 1);
});
test("quota errors do not disclose key or upstream error text", async () => {
  const search = createYouTubeSearch({
    fetcher: async () =>
      new Response("secret upstream diagnostic", { status: 403 }),
  });
  const r = await search(
    new Request("https://example.com/api/youtube?q=film"),
    { YOUTUBE_API_KEY: "test-placeholder" },
  );
  assert.equal(r.status, 502);
  assert.equal((await r.text()).includes("secret upstream"), false);
});
test("search rate limits repeated requests, even cache hits", async () => {
  const search = createYouTubeSearch({
    fetcher: async () => Response.json({ items: [] }),
  });
  let r;
  for (let i = 0; i < 13; i++)
    r = await search(new Request("https://example.com/api/youtube?q=film"), {
      YOUTUBE_API_KEY: "test-placeholder",
    });
  assert.equal(r!.status, 429);
});
test("media byte ranges support open end, suffix and invalid requests", () => {
  assert.deepEqual(byteRange("bytes=2-4", 10), { start: 2, end: 4 });
  assert.deepEqual(byteRange("bytes=8-", 10), { start: 8, end: 9 });
  assert.deepEqual(byteRange("bytes=-3", 10), { start: 7, end: 9 });
  assert.equal(byteRange("bytes=10-20", 10), false);
  assert.equal(byteRange("bytes=2-1", 10), false);
  assert.equal(byteRange("bytes=0-1,3-4", 10), false);
});
test("hosted client supports native video Range, HEAD and API status", async () => {
  const bytes = Uint8Array.from({ length: 20 }, (_, i) => i);
  const worker = createWorker({
    "/media/test.mp4": {
      data: Buffer.from(bytes).toString("base64"),
      size: 20,
      type: "video/mp4",
      etag: '"test"',
    },
  });
  for (const [start, end] of [
    [0, 1],
    [1, 5],
    [3, 18],
    [19, 19],
  ]) {
    const r = await worker.fetch(
      new Request("https://example.com/media/test.mp4", {
        headers: { Range: `bytes=${start}-${end}` },
      }),
      {},
    );
    assert.equal(r.status, 206);
    assert.deepEqual(
      new Uint8Array(await r.arrayBuffer()),
      bytes.slice(start, end + 1),
    );
    assert.equal(r.headers.get("Content-Range"), `bytes ${start}-${end}/20`);
  }
  const head = await worker.fetch(
    new Request("https://example.com/media/test.mp4", { method: "HEAD" }),
    {},
  );
  assert.equal(head.headers.get("Content-Length"), "20");
  assert.equal(await head.text(), "");
  const status = await worker.fetch(
    new Request("https://example.com/api/status"),
    {},
  );
  assert.equal((await status.json()).youtube.configured, false);
});
