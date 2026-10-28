import { createYouTubeSearch } from "@/lib/youtube.mjs";
const search = createYouTubeSearch();
export async function GET(request: Request) {
  return search(request, { YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY });
}
