import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const bytes = await readFile("dist/server/index.js");
const { default: worker } = await import(
  `data:text/javascript;base64,${bytes.toString("base64")}`
);
assert.equal(typeof worker.fetch, "function");
const page = await worker.fetch(new Request("https://example.com/"), {});
assert.equal(page.status, 200);
assert.ok((await page.text()).includes("volta"));
const sample = await worker.fetch(
  new Request("https://example.com/media/afterglow.mp4", {
    headers: { Range: "bytes=0-31" },
  }),
  {},
);
assert.equal(sample.status, 206);
assert.equal((await sample.arrayBuffer()).byteLength, 32);
const status = await worker.fetch(
  new Request("https://example.com/api/status"),
  {},
);
assert.equal((await status.json()).runtime, "server");
const missing = await worker.fetch(
  new Request("https://example.com/api/youtube?q=nature"),
  {},
);
assert.equal(missing.status, 503);
assert.equal((await missing.json()).code, "YOUTUBE_SETUP_REQUIRED");
console.log(
  `Hosted artifact verified: HTML 200, video 206, API routes active; module ${(bytes.length / 1048576).toFixed(2)} MiB, gzip ${(gzipSync(bytes).length / 1048576).toFixed(2)} MiB.`,
);
