import { createYouTubeSearch } from "../lib/youtube.mjs";
// The build appends the Next client assets and the shared official search handler.
const search = createYouTubeSearch();
const security = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
export function byteRange(value, size) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return false;
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (suffix <= 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start >= size ||
    start > end
  )
    return false;
  return { start, end };
}
function decodeSlice(base64, start, end) {
  const first = Math.floor(start / 3) * 4;
  const last = Math.ceil((end + 1) / 3) * 4;
  const binary = atob(base64.slice(first, last));
  const offset = start - Math.floor(start / 3) * 3;
  return Uint8Array.from(binary.slice(offset, offset + end - start + 1), (c) =>
    c.charCodeAt(0),
  );
}
export function createWorker(assets) {
  return {
    async fetch(request, env = {}) {
      const url = new URL(request.url);
      if (url.pathname === "/api/youtube") return search(request, env);
      if (url.pathname === "/api/status")
        return Response.json(
          {
            youtube: { configured: Boolean(env.YOUTUBE_API_KEY) },
            runtime: "server",
          },
          { headers: { ...security, "Cache-Control": "no-store" } },
        );
      if (request.method !== "GET" && request.method !== "HEAD")
        return new Response("Method not allowed", {
          status: 405,
          headers: security,
        });
      let path;
      try {
        path = decodeURIComponent(url.pathname);
      } catch {
        return new Response("Bad path", { status: 400 });
      }
      if (path === "/") path = "/index.html";
      const asset = assets[path] || assets[path + ".html"];
      if (!asset)
        return new Response("Not found", { status: 404, headers: security });
      const headers = {
        ...security,
        "Content-Type": asset.type,
        "Accept-Ranges": "bytes",
        ETag: asset.etag,
        "Cache-Control": path.startsWith("/_next/")
          ? "private, max-age=31536000, immutable"
          : path === "/index.html"
            ? "no-cache"
            : "private, max-age=3600",
      };
      if (request.headers.get("If-None-Match") === asset.etag)
        return new Response(null, { status: 304, headers });
      const range = byteRange(request.headers.get("Range"), asset.size);
      if (range === false)
        return new Response(null, {
          status: 416,
          headers: { ...headers, "Content-Range": `bytes */${asset.size}` },
        });
      const start = range ? range.start : 0,
        end = range ? range.end : asset.size - 1;
      headers["Content-Length"] = String(end - start + 1);
      if (range)
        headers["Content-Range"] = `bytes ${start}-${end}/${asset.size}`;
      return new Response(
        request.method === "HEAD" ? null : decodeSlice(asset.data, start, end),
        { status: range ? 206 : 200, headers },
      );
    },
  };
}

export default createWorker(globalThis.__VOLTA_ASSETS__ || {});
