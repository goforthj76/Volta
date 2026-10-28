import {
  readFile,
  readdir,
  mkdir,
  writeFile,
  rm,
  copyFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
const types = {
  html: "text/html; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  css: "text/css; charset=utf-8",
  json: "application/json",
  txt: "text/plain; charset=utf-8",
  svg: "image/svg+xml",
  jpg: "image/jpeg",
  png: "image/png",
  mp4: "video/mp4",
  glb: "model/gltf-binary",
  webmanifest: "application/manifest+json",
  ico: "image/x-icon",
  woff2: "font/woff2",
};
const assets = {};
async function walk(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const name = prefix + "/" + entry.name;
    if (entry.isDirectory()) await walk(path, name);
    else {
      const bytes = await readFile(path);
      assets[name] = {
        type: types[entry.name.split(".").pop()] || "application/octet-stream",
        size: bytes.length,
        etag:
          '"' +
          createHash("sha256").update(bytes).digest("hex").slice(0, 24) +
          '"',
        data: bytes.toString("base64"),
      };
    }
  }
}
await walk("out");
await rm("dist", { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
const shared = (await readFile("lib/youtube.mjs", "utf8")).replace(
  "export function createYouTubeSearch",
  "function createYouTubeSearch",
);
const runtime = (await readFile("worker/index.mjs", "utf8")).replace(
  /import \{\s*createYouTubeSearch\s*\} from [^;]+;/,
  "",
);
await writeFile(
  "dist/server/index.js",
  `globalThis.__VOLTA_ASSETS__=${JSON.stringify(assets)};\n${shared}\n${runtime}`,
);
await copyFile(".openai/hosting.json", "dist/.openai/hosting.json");
console.log(
  `Built hosted Worker with ${Object.keys(assets).length} embedded client assets and /api/youtube.`,
);
