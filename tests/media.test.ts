import test from "node:test";
import assert from "node:assert/strict";
import { parseM3U, safeStream, xmltvTime } from "../lib/media";
import { validVehicle } from "../lib/vehicle";
test("M3U imports groups, quoted attributes, logos and CRLF", () => {
  const rows = parseM3U(
    '\uFEFF#EXTM3U\r\n#EXTINF:-1 tvg-id="news" tvg-logo="https://example.com/logo.png" group-title="News",My channel\r\nhttps://example.com/live.m3u8\r\n',
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].epgId, "news");
  assert.equal(rows[0].group, "News");
  assert.equal(rows[0].title, "My channel");
});
test("playlist does not import insecure or executable sources", () => {
  assert.deepEqual(
    parseM3U(
      "#EXTM3U\n#EXTINF:-1,Unsafe\njavascript:alert(1)\n#EXTINF:-1,Insecure\nhttp://example.com/live",
    ),
    [],
  );
});
test("malformed playlists report a useful error", () =>
  assert.throws(() => parseM3U("not a playlist"), /valid extended M3U/));
test("URLs reject embedded username and password", () => {
  assert.equal(safeStream("https://user:pass@example.com/x"), null);
  assert.equal(safeStream("data:video/mp4,xxx"), null);
  assert.equal(
    safeStream("https://example.com/a.m3u8?token=abc"),
    "https://example.com/a.m3u8?token=abc",
  );
});
test("XMLTV times honor timezone offsets", () => {
  assert.equal(
    xmltvTime("20261028120000 +0200"),
    Date.parse("2026-10-28T10:00:00Z"),
  );
  assert.ok(Number.isNaN(xmltvTime("invalid")));
});
test("vehicle preferences include Model 3 and phone without arbitrary values", () => {
  assert.ok(validVehicle("Tesla Model 3"));
  assert.ok(validVehicle("Phone / tablet"));
  assert.equal(validVehicle("Unknown"), false);
});
import { sanitizeLibrary } from "../lib/storage";
test("provider credentials never persist in favorites/history", () => {
  const state = sanitizeLibrary({
    favorites: [
      {
        id: "c",
        title: "Channel",
        subtitle: "",
        image: "",
        source: "Live TV",
        url: "https://example.com/live?secret=x",
      },
    ],
    history: [],
  });
  assert.equal(state.favorites[0].url, undefined);
});
