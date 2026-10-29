import { NextRequest, NextResponse } from "next/server";

type StremioRawLibraryItem = {
  _id?: string;
  id?: string;
  name?: string;
  type?: string;
  poster?: string;
  year?: string;
  removed?: boolean;
  state?: {
    timeOffset?: number;
    duration?: number;
  };
};

type StremioRawStream = {
  name?: string;
  title?: string;
  url?: string;
  ytId?: string;
  behaviorHints?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = searchParams.get("action") || (typeof body.action === "string" ? body.action : "");

    if (action === "login") {
      const email = typeof body.email === "string" ? body.email : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!email || !password) {
        return NextResponse.json(
          { error: "Email and password are required." },
          { status: 400 },
        );
      }

      const res = await fetch("https://api.strem.io/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as {
        error?: { message?: string };
        result?: {
          authKey?: string;
          user?: { _id?: string; email?: string };
          auth?: { key?: string };
          key?: string;
        };
      };

      if (data.error) {
        return NextResponse.json(
          { error: data.error.message || "Failed to log in to Stremio. Please verify your credentials." },
          { status: 401 },
        );
      }

      const user = data.result?.user;
      const authKey = data.result?.authKey || data.result?.auth?.key || data.result?.key;

      if (!authKey) {
        return NextResponse.json(
          { error: "Stremio did not return an auth session key." },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user?._id || "",
          email: user?.email || email,
        },
        authKey,
      });
    }

    if (action === "addons") {
      const authKey = typeof body.authKey === "string" ? body.authKey : undefined;
      const res = await fetch("https://api.strem.io/api/addonCollectionGet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "AddonCollectionGet",
          authKey,
        }),
      });

      const data = (await res.json()) as {
        result?: { addons?: unknown[] };
      };
      const addons = data.result?.addons || [];
      return NextResponse.json({ addons });
    }

    if (action === "library") {
      const authKey = typeof body.authKey === "string" ? body.authKey : "";
      if (!authKey) {
        return NextResponse.json(
          { error: "Auth key required for library." },
          { status: 401 },
        );
      }

      const res = await fetch("https://api.strem.io/api/datastoreGet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authKey,
          collection: "library",
          all: true,
        }),
      });

      const data = (await res.json()) as {
        result?: StremioRawLibraryItem[] | { items?: StremioRawLibraryItem[] };
      };
      const raw: StremioRawLibraryItem[] = Array.isArray(data.result)
        ? data.result
        : data.result?.items || [];

      const items = raw
        .filter((item) => !item.removed)
        .map((item) => ({
          id: item._id || item.id || "",
          name: item.name || "Untitled",
          type: item.type || "movie",
          poster: item.poster || "",
          year: item.year || "",
          progress: item.state?.timeOffset || 0,
          duration: item.state?.duration || 0,
        }));

      return NextResponse.json({ items });
    }

    if (action === "streams") {
      const type = typeof body.type === "string" ? body.type : "";
      const id = typeof body.id === "string" ? body.id : "";
      if (!type || !id) {
        return NextResponse.json(
          { error: "Type and id are required." },
          { status: 400 },
        );
      }

      const defaultAddons = [
        "https://torrentio.strem.fun/manifest.json",
        "https://v3-cinemeta.strem.io/manifest.json",
      ];
      const addonList: string[] = Array.isArray(body.addons) && body.addons.length > 0
        ? Array.from(new Set([...(body.addons as string[]), ...defaultAddons]))
        : defaultAddons;

      const streamPromises = addonList.map(async (transportUrl) => {
        try {
          const base = transportUrl.replace(/\/manifest\.json$/, "");
          const streamUrl = `${base}/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
          const r = await fetch(streamUrl, {
            headers: { "User-Agent": "Volta-Tesla/1.0" },
            signal: AbortSignal.timeout(8000),
          });
          if (!r.ok) return [];
          const d = (await r.json()) as { streams?: StremioRawStream[] };
          return (d.streams || []).map((s) => ({
            name: s.name || "Stream",
            title: s.title || s.name || "Playback Source",
            url: s.url,
            ytId: s.ytId,
            infoHash: (s as Record<string, unknown>).infoHash as string | undefined,
            behaviorHints: s.behaviorHints,
          }));
        } catch {
          return [];
        }
      });

      const streamArrays = await Promise.all(streamPromises);
      const allStreams = streamArrays.flat();

      return NextResponse.json({ streams: allStreams });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
