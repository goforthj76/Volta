export async function scrapeYouTube(q, fetcher = fetch) {
  try {
    const upstream = await fetcher(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
      {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      },
    );
    if (!upstream.ok) return [];
    const html = await upstream.text();
    const match =
      html.match(/ytInitialData\s*=\s*({.+?});<\/script>/) ||
      html.match(/var ytInitialData = ({.*?});/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const sections =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents
        ?.sectionListRenderer?.contents || [];
    const items = [];
    for (const sec of sections) {
      const renderers = sec.itemSectionRenderer?.contents || [];
      for (const item of renderers) {
        const v = item.videoRenderer;
        if (v && v.videoId && /^[\w-]{11}$/.test(v.videoId)) {
          const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "";
          const subtitle =
            v.ownerText?.runs?.[0]?.text ||
            v.shortBylineText?.runs?.[0]?.text ||
            "YouTube";
          if (title) {
            items.push({
              id: v.videoId,
              youtubeId: v.videoId,
              title,
              subtitle,
              image: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              source: "YouTube",
            });
          }
        }
      }
    }
    return items;
  } catch {
    return [];
  }
}

/** Official YouTube search, shared by the Next server and the hosted Worker. */
export function createYouTubeSearch({ fetcher = fetch, now = Date.now } = {}) {
  const limits = new Map();
  const cache = new Map();
  const json = (body, status = 200) =>
    Response.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  return async function search(request, env = {}) {
    if (request.method !== "GET")
      return json({ error: "Method not allowed." }, 405);
    const q = new URL(request.url).searchParams.get("q")?.trim();
    if (!q || q.length > 120)
      return json({ error: "Enter a search up to 120 characters." }, 400);

    const identity =
      request.headers.get("oai-authenticated-user-id") ||
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "local";
    const previous = limits.get(identity);
    const bucket =
      previous && previous.until > now()
        ? previous
        : { count: 0, until: now() + 60000 };
    bucket.count++;
    limits.set(identity, bucket);
    if (limits.size > 5000) limits.delete(limits.keys().next().value);
    if (bucket.count > 12)
      return json(
        { error: "Please wait a minute before searching again." },
        429,
      );

    if (!env.YOUTUBE_API_KEY)
      return json(
        {
          code: "YOUTUBE_SETUP_REQUIRED",
          error:
            "YouTube search is not connected yet. Open Settings → YouTube setup.",
        },
        503,
      );

    const key = q.toLocaleLowerCase();
    const cached = cache.get(key);
    if (cached && cached.until > now()) return json({ items: cached.items });

    try {
      const url = new URL("https://www.googleapis.com/youtube/v3/search");
      url.search = new URLSearchParams({
        key: env.YOUTUBE_API_KEY,
        part: "snippet",
        type: "video",
        videoEmbeddable: "true",
        videoSyndicated: "true",
        maxResults: "16",
        safeSearch: "moderate",
        q,
      }).toString();
      const upstream = await fetcher(url, {
        signal: AbortSignal.timeout(10000),
        headers: { Accept: "application/json" },
      });
      if (!upstream.ok) {
        const failure = await upstream.json().catch(() => ({}));
        const reasons = [
          ...(failure.error?.errors || []),
          ...(failure.error?.details || []),
        ].map((item) => item.reason);
        const invalid =
          reasons.includes("API_KEY_INVALID") || reasons.includes("keyInvalid");
        const disabled =
          reasons.includes("SERVICE_DISABLED") ||
          reasons.includes("accessNotConfigured");
        return json(
          {
            code: invalid
              ? "YOUTUBE_KEY_INVALID"
              : disabled
                ? "YOUTUBE_API_DISABLED"
                : "YOUTUBE_UPSTREAM_ERROR",
            error: invalid
              ? "Google rejected the API key. The site owner needs to connect a valid YouTube Data API v3 key."
              : disabled
                ? "Enable YouTube Data API v3 in the Google Cloud project that owns this key."
                : upstream.status === 403
                  ? "YouTube search is unavailable. The site owner should check key restrictions and daily quota."
                  : "YouTube is temporarily unavailable. Please try again.",
          },
          502,
        );
      }
      const data = await upstream.json();
      if (!Array.isArray(data.items))
        throw new Error("Invalid upstream response");
      const items = data.items
        .filter((i) => /^[\w-]{11}$/.test(i?.id?.videoId) && i?.snippet?.title)
        .map((i) => ({
          id: i.id.videoId,
          youtubeId: i.id.videoId,
          title: i.snippet.title,
          subtitle: i.snippet.channelTitle || "YouTube",
          image: `https://i.ytimg.com/vi/${i.id.videoId}/hqdefault.jpg`,
          source: "YouTube",
        }));
      cache.set(key, { items, until: now() + 300000 });
      if (cache.size > 100) cache.delete(cache.keys().next().value);
      return json({ items });
    } catch {
      return json(
        { error: "YouTube could not be reached. Please try again." },
        502,
      );
    }
  };
}
