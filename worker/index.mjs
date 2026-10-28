import { createConnections } from "../lib/connections.mjs";
import { createYouTubeSearch } from "../lib/youtube.mjs";
// The build appends the Next client assets and the shared official search handler.
const search = createYouTubeSearch();
const connections = createConnections();
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

async function handleStremio(request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...security },
    });
  }
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  let body = {};
  try {
    body = await request.json();
  } catch {}

  if (action === "login") {
    const { email, password } = body;
    if (!email || !password) {
      return Response.json({ error: "Email and password are required." }, { status: 400, headers: security });
    }
    const res = await fetch("https://api.strem.io/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) {
      return Response.json({ error: data.error.message || "Failed to log in to Stremio." }, { status: 401, headers: security });
    }
    const user = data.result?.user;
    const authKey = data.result?.auth?.key;
    return Response.json({
      success: true,
      user: { id: user?._id || "", email: user?.email || email },
      authKey,
    }, { headers: security });
  }

  if (action === "addons") {
    const res = await fetch("https://api.strem.io/api/addonCollectionGet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "AddonCollectionGet", authKey: body.authKey }),
    });
    const data = await res.json();
    return Response.json({ addons: data.result?.addons || [] }, { headers: security });
  }

  if (action === "library") {
    if (!body.authKey) {
      return Response.json({ error: "Auth key required for library." }, { status: 401, headers: security });
    }
    const res = await fetch("https://api.strem.io/api/datastoreGet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authKey: body.authKey, collection: "library", all: true }),
    });
    const data = await res.json();
    const raw = Array.isArray(data.result) ? data.result : data.result?.items || [];
    const items = raw.filter((i) => !i.removed).map((i) => ({
      id: i._id || i.id,
      name: i.name || "Untitled",
      type: i.type || "movie",
      poster: i.poster || "",
      year: i.year || "",
      progress: i.state?.timeOffset || 0,
      duration: i.state?.duration || 0,
    }));
    return Response.json({ items }, { headers: security });
  }

  if (action === "streams") {
    const { addons, type, id } = body;
    const addonList = Array.isArray(addons) && addons.length > 0 ? addons : ["https://v3-cinemeta.strem.io/manifest.json"];
    const streamPromises = addonList.map(async (transportUrl) => {
      try {
        const base = transportUrl.replace(/\/manifest\.json$/, "");
        const streamUrl = `${base}/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
        const r = await fetch(streamUrl, { headers: { "User-Agent": "Volta-Tesla/1.0" }, signal: AbortSignal.timeout(8000) });
        if (!r.ok) return [];
        const d = await r.json();
        return (d.streams || []).map((s) => ({
          name: s.name || "Stream",
          title: s.title || s.name || "Playback Source",
          url: s.url,
          ytId: s.ytId,
          behaviorHints: s.behaviorHints,
        }));
      } catch {
        return [];
      }
    });
    const streamArrays = await Promise.all(streamPromises);
    return Response.json({ streams: streamArrays.flat() }, { headers: security });
  }

  return Response.json({ error: "Unknown action" }, { status: 404, headers: security });
}

export function createWorker(assets) {
  return {
    async fetch(request, env = {}) {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/connections/"))
        return connections(request, env);
      if (url.pathname === "/api/stremio")
        return handleStremio(request);
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
