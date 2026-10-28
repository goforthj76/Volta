import { NextRequest, NextResponse } from "next/server";
const requests = new Map<string, { count: number; until: number }>();
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length > 120)
    return NextResponse.json(
      { error: "Enter a search up to 120 characters." },
      { status: 400 },
    );
  if (!process.env.YOUTUBE_API_KEY)
    return NextResponse.json(
      {
        error:
          "Connect a YouTube Data API key to enable search. You can still play a YouTube link.",
      },
      { status: 503 },
    );
  const id = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const old = requests.get(id);
  const bucket =
    old && old.until > Date.now()
      ? old
      : { count: 0, until: Date.now() + 60000 };
  if (++bucket.count > 12)
    return NextResponse.json(
      { error: "Please wait a minute before searching again." },
      { status: 429 },
    );
  if (requests.size > 5000) requests.clear();
  requests.set(id, bucket);
  try {
    const u = new URL("https://www.googleapis.com/youtube/v3/search");
    u.search = new URLSearchParams({
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      type: "video",
      maxResults: "16",
      q,
    }).toString();
    const r = await fetch(u, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok)
      return NextResponse.json(
        {
          error:
            "YouTube search is temporarily unavailable. Check API quota and configuration.",
        },
        { status: 502 },
      );
    const data = await r.json();
    return NextResponse.json({
      items: data.items.map(
        (i: {
          id: { videoId: string };
          snippet: {
            title: string;
            channelTitle: string;
            thumbnails: { high: { url: string } };
          };
        }) => ({
          id: i.id.videoId,
          youtubeId: i.id.videoId,
          title: i.snippet.title,
          subtitle: i.snippet.channelTitle,
          image: i.snippet.thumbnails.high.url,
          source: "YouTube",
        }),
      ),
    });
  } catch {
    return NextResponse.json(
      { error: "YouTube could not be reached." },
      { status: 502 },
    );
  }
}
