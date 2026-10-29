import { createYouTubeSearch, scrapeYouTube } from "@/lib/youtube.mjs";

const search = createYouTubeSearch();

export async function GET(request: Request) {
  const res = await search(request, { YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY });
  if (res.status === 503 || res.status === 502) {
    const q = new URL(request.url).searchParams.get("q")?.trim();
    if (q) {
      const items = await scrapeYouTube(q);
      if (items.length > 0) {
        return Response.json(
          { items },
          {
            headers: {
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          },
        );
      }
    }
  }
  return res;
}
