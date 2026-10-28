const enc = new TextEncoder(),
  dec = new TextDecoder();
const PREFIX = "__Host-volta-";
function b64(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
function un64(s) {
  return Uint8Array.from(
    atob(s.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );
}
function subject(req) {
  return req.headers.get("oai-authenticated-user-id") || "browser";
}
async function key(env) {
  if (!/^[a-f0-9]{64}$/i.test(env.CONNECTION_ENCRYPTION_KEY || ""))
    throw new Error("setup");
  return crypto.subtle.importKey(
    "raw",
    Uint8Array.from(env.CONNECTION_ENCRYPTION_KEY.match(/../g), (s) =>
      parseInt(s, 16),
    ),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(env),
    enc.encode(JSON.stringify(value)),
  );
  return b64(iv) + "." + b64(new Uint8Array(ciphertext));
}
export async function unseal(value, env) {
  try {
    const [iv, body] = value.split(".");
    return JSON.parse(
      dec.decode(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: un64(iv) },
          await key(env),
          un64(body),
        ),
      ),
    );
  } catch {
    return null;
  }
}
function cookie(name, value, seconds = 604800) {
  if (value.length > 3600) throw new Error("session too large");
  return `${PREFIX}${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}
async function session(req, env, name) {
  const raw = req.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(PREFIX + name + "="))
    ?.split("=")
    .slice(1)
    .join("=");
  const data = raw ? await unseal(raw, env) : null;
  return data && data.sub === subject(req) && data.until > Date.now()
    ? data
    : null;
}
const json = (data, status = 200, headers = {}) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
function redirect(url, headers = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
}
function ready(env) {
  return /^[a-f0-9]{64}$/i.test(env.CONNECTION_ENCRYPTION_KEY || "");
}
async function officialJSON(fetcher, url, options = {}) {
  const r = await fetcher(url, {
    ...options,
    signal: AbortSignal.timeout(12000),
  });
  if (!r.ok) throw new Error("PROVIDER_HTTP_" + r.status);
  const d = await r.json();
  if (d.error) throw new Error("PROVIDER_REJECTED");
  return d.result ?? d;
}
async function stremioLink(fetcher, action, code) {
  const query = new URLSearchParams({
    type: action === "create" ? "Create" : "Read",
    ...(code ? { code } : {}),
  });
  let failure;
  for (const prefix of ["/api/v2/", "/api/v1/", "/"]) {
    try {
      return await officialJSON(
        fetcher,
        "https://link.stremio.com" + prefix + action + "?" + query,
        { headers: { "User-Agent": "Volta/1.0" } },
      );
    } catch (error) {
      failure = error;
      if (error.message !== "PROVIDER_HTTP_404") throw error;
    }
  }
  throw failure;
}
export function createConnections({ fetcher = fetch } = {}) {
  const attempts = new Map();
  return async function connections(req, env = {}) {
    const url = new URL(req.url),
      path = url.pathname.split("/").slice(3),
      provider = path[0],
      action = path[1] || "status";
    if (!["youtube", "stremio"].includes(provider))
      return json({ error: "Unknown connection." }, 404);
    if (req.method === "POST" && req.headers.get("origin") !== url.origin)
      return json({ error: "Request origin did not match." }, 403);
    if (!["GET", "POST"].includes(req.method))
      return json({ error: "Method not allowed." }, 405);
    if (action === "status") {
      const s = await session(req, env, provider);
      return json({
        configured:
          ready(env) &&
          (provider === "stremio" ||
            Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)),
        connected: Boolean(s),
        callback:
          provider === "youtube"
            ? url.origin + "/api/connections/youtube/callback"
            : undefined,
      });
    }
    if (!ready(env))
      return json(
        { error: "Account connections are not configured yet." },
        503,
      );
    if (action === "disconnect" && req.method === "POST")
      return json({ connected: false }, 200, {
        "Set-Cookie": cookie(provider, "", 0),
      });
    try {
      if (provider === "youtube") {
        if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)
          return json(
            {
              error:
                "YouTube account login needs the site owner’s Google OAuth client configuration. Keyword search remains available.",
            },
            503,
          );
        const callback = url.origin + "/api/connections/youtube/callback";
        if (action === "start" && req.method === "GET") {
          const state = b64(crypto.getRandomValues(new Uint8Array(24))),
            verifier = b64(crypto.getRandomValues(new Uint8Array(32)));
          const oauth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
          oauth.search = new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            redirect_uri: callback,
            response_type: "code",
            scope: "https://www.googleapis.com/auth/youtube.readonly",
            access_type: "offline",
            prompt: "consent",
            state,
            code_challenge: b64(
              new Uint8Array(
                await crypto.subtle.digest("SHA-256", enc.encode(verifier)),
              ),
            ),
            code_challenge_method: "S256",
          }).toString();
          return redirect(oauth.href, {
            "Set-Cookie": cookie(
              "youtube-state",
              await seal(
                {
                  sub: subject(req),
                  state,
                  verifier,
                  until: Date.now() + 600000,
                },
                env,
              ),
              600,
            ),
          });
        }
        if (action === "callback") {
          const state = await session(req, env, "youtube-state");
          if (
            !state ||
            state.state !== url.searchParams.get("state") ||
            !url.searchParams.get("code")
          )
            return redirect("/?connection=youtube-failed", {
              "Set-Cookie": cookie("youtube-state", "", 0),
            });
          const tokens = await officialJSON(
            fetcher,
            "https://oauth2.googleapis.com/token",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: env.GOOGLE_CLIENT_ID,
                client_secret: env.GOOGLE_CLIENT_SECRET,
                redirect_uri: callback,
                code: url.searchParams.get("code"),
                code_verifier: state.verifier,
              }),
            },
          );
          if (!tokens.access_token) throw new Error("tokens");
          const headers = new Headers({
            Location: "/?connection=youtube-connected",
            "Cache-Control": "no-store",
            "Referrer-Policy": "no-referrer",
          });
          headers.append(
            "Set-Cookie",
            cookie(
              "youtube",
              await seal(
                {
                  sub: subject(req),
                  access: tokens.access_token,
                  refresh: tokens.refresh_token,
                  expires:
                    Date.now() + Number(tokens.expires_in || 3600) * 1000,
                  until: Date.now() + 604800000,
                },
                env,
              ),
            ),
          );
          headers.append("Set-Cookie", cookie("youtube-state", "", 0));
          return new Response(null, { status: 302, headers });
        }
        if (action === "data") {
          const s = await session(req, env, "youtube");
          if (!s)
            return json({ error: "Connect your YouTube account first." }, 401);
          let updated;
          if (s.expires < Date.now() + 60000) {
            if (!s.refresh)
              return json({ error: "Please reconnect YouTube." }, 401);
            const t = await officialJSON(
              fetcher,
              "https://oauth2.googleapis.com/token",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  grant_type: "refresh_token",
                  refresh_token: s.refresh,
                  client_id: env.GOOGLE_CLIENT_ID,
                  client_secret: env.GOOGLE_CLIENT_SECRET,
                }),
              },
            );
            if (!t.access_token) throw new Error("refresh");
            s.access = t.access_token;
            s.expires = Date.now() + Number(t.expires_in || 3600) * 1000;
            updated = cookie("youtube", await seal(s, env));
          }
          const kind = url.searchParams.get("kind") || "playlists";
          if (!["playlists", "subscriptions", "playlistItems"].includes(kind))
            return json({ error: "Unknown library view." }, 400);
          const api = new URL("https://www.googleapis.com/youtube/v3/" + kind);
          const params = { part: "snippet", maxResults: "50" };
          if (kind === "playlistItems") {
            const id = url.searchParams.get("playlist");
            if (!/^[\w-]{5,120}$/.test(id || ""))
              return json({ error: "Invalid playlist." }, 400);
            params.playlistId = id;
          } else params.mine = "true";
          api.search = new URLSearchParams(params).toString();
          const d = await officialJSON(fetcher, api, {
            headers: { Authorization: "Bearer " + s.access },
          });
          return json(
            {
              kind,
              items: (d.items || []).map((i) => ({
                id: i.id,
                title: i.snippet?.title || "Untitled",
                image: i.snippet?.thumbnails?.medium?.url || "",
                youtubeId: i.snippet?.resourceId?.videoId,
                channelId: i.snippet?.resourceId?.channelId,
                subtitle:
                  i.snippet?.videoOwnerChannelTitle ||
                  i.snippet?.channelTitle ||
                  "YouTube",
              })),
            },
            200,
            updated ? { "Set-Cookie": updated } : {},
          );
        }
      }
      if (provider === "stremio") {
        if (action === "start" && req.method === "POST") {
          const identity = subject(req),
            old = attempts.get(identity) || 0;
          if (Date.now() - old < 10000)
            return json(
              { error: "Wait a few seconds before creating another code." },
              429,
            );
          attempts.set(identity, Date.now());
          if (attempts.size > 5000)
            attempts.delete(attempts.keys().next().value);
          const d = await stremioLink(fetcher, "create");
          if (!d.code || !d.link) throw new Error("link");
          const link = new URL(d.link);
          if (
            link.protocol !== "https:" ||
            ![
              "stremio.com",
              "link.stremio.com",
              "strem.io",
              "www.stremio.com",
            ].includes(link.hostname)
          )
            throw new Error("link");
          return json({ code: d.code, link: link.href }, 200, {
            "Set-Cookie": cookie(
              "stremio-link",
              await seal(
                { sub: subject(req), code: d.code, until: Date.now() + 600000 },
                env,
              ),
              600,
            ),
          });
        }
        if (action === "poll" && req.method === "POST") {
          const pending = await session(req, env, "stremio-link");
          if (!pending)
            return json(
              { error: "Your connection code expired. Start again." },
              401,
            );
          let d;
          try {
            d = await stremioLink(fetcher, "read", pending.code);
          } catch {
            return json({ connected: false });
          }
          const auth = d.authKey ?? d.data?.authKey;
          if (!auth) return json({ connected: false });
          return json({ connected: true }, 200, {
            "Set-Cookie": cookie(
              "stremio",
              await seal(
                { sub: subject(req), auth, until: Date.now() + 604800000 },
                env,
              ),
            ),
          });
        }
        if (action === "data") {
          const s = await session(req, env, "stremio");
          if (!s)
            return json({ error: "Connect your Stremio account first." }, 401);
          const d = await officialJSON(
            fetcher,
            "https://api.strem.io/api/datastoreGet",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                authKey: s.auth,
                collection: "library",
                all: true,
              }),
            },
          );
          const items = Array.isArray(d) ? d : d.items || [];
          return json({
            items: items
              .filter((i) => !i.removed)
              .slice(0, 100)
              .map((i) => ({
                id: i._id || i.id,
                title: i.name || "Untitled",
                image: i.poster || "",
                subtitle: i.type || "Stremio library",
                source: "Stremio",
                metadataOnly: true,
              })),
          });
        }
      }
      return json({ error: "Unknown connection action." }, 404);
    } catch (failure) {
      return json(
        {
          code: /^PROVIDER_HTTP_\d+$/.test(failure?.message || "")
            ? failure.message
            : "CONNECTION_FAILED",
          error:
            "The provider could not complete this connection. Please retry or reconnect.",
        },
        502,
      );
    }
  };
}
