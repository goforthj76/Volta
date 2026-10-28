import test from "node:test";
import assert from "node:assert/strict";
import { addonResource, browserStreams } from "../lib/addons";
test("addon resource URLs preserve user query authorization and safely encode IDs", () => {
  assert.equal(
    addonResource(
      "https://example.com/account/manifest.json?token=test",
      "stream",
      "movie",
      "tt:1/a",
    ),
    "https://example.com/account/stream/movie/tt%3A1%2Fa.json?token=test",
  );
});
test("browser adapter keeps HTTPS/YouTube sources and excludes unsupported transports", () => {
  const streams = browserStreams([
    { name: "HLS", url: "https://example.com/live.m3u8" },
    { name: "Duplicate", url: "https://example.com/live.m3u8" },
    { ytId: "abcdefghijk" },
    { infoHash: "torrent", url: "https://example.com/x" },
    { externalUrl: "https://example.com/" },
    { url: "http://example.com/x" },
    { url: "javascript:alert(1)" },
    { url: "https://u:p@example.com/x" },
    { url: "https://example.com/native", behaviorHints: { notWebReady: true } },
  ]);
  assert.equal(streams.length, 2);
  assert.equal(streams[0].name, "HLS");
  assert.equal(streams[1].youtubeId, "abcdefghijk");
});
test("invalid addon origins and manifests are rejected before fetching", () => {
  assert.throws(() =>
    addonResource("http://example.com/manifest.json", "stream", "movie", "id"),
  );
  assert.throws(() =>
    addonResource("https://example.com/not-manifest", "stream", "movie", "id"),
  );
  assert.deepEqual(browserStreams(null), []);
});
