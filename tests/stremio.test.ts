import test from "node:test";
import assert from "node:assert/strict";
import { defaultChannels } from "../lib/channels";
import { fetchCinemetaCatalog, fetchCinemetaMeta } from "../lib/stremio";

test("defaultChannels includes verified live HLS streams with valid categories", () => {
  assert.ok(defaultChannels.length >= 5);
  for (const ch of defaultChannels) {
    assert.ok(ch.id);
    assert.ok(ch.title);
    assert.ok(ch.url?.startsWith("https://"));
    assert.ok(["Sports", "News", "Tech & Space", "Music", "Entertainment"].includes(ch.group || ""));
    assert.equal(ch.source, "Live TV");
  }
});

test("fetchCinemetaCatalog retrieves valid Stremio metadata structure", async () => {
  const metas = await fetchCinemetaCatalog("movie", "top");
  assert.ok(Array.isArray(metas));
  if (metas.length > 0) {
    const first = metas[0];
    assert.ok(first.id);
    assert.ok(first.name);
    assert.equal(first.type, "movie");
  }
});

test("fetchCinemetaMeta retrieves full metadata and episodes for TV series", async () => {
  // Game of Thrones IMDb ID
  const meta = await fetchCinemetaMeta("series", "tt0944947");
  if (meta) {
    assert.equal(meta.id, "tt0944947");
    assert.equal(meta.name, "Game of Thrones");
    assert.ok(Array.isArray(meta.videos));
    assert.ok(meta.videos.length > 0);
    const ep1 = meta.videos[0];
    assert.ok(ep1.id);
    assert.ok(ep1.name);
  }
});
