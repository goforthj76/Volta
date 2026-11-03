import { NextRequest, NextResponse } from "next/server";

interface PlaylistItemSnippet {
  title?: string;
  channelTitle?: string;
  resourceId?: { videoId?: string };
  thumbnails?: {
    medium?: { url?: string };
    default?: { url?: string };
  };
}

interface RawPlaylistItem {
  snippet?: PlaylistItemSnippet;
}

interface RawUserPlaylistItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: {
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  contentDetails?: {
    itemCount?: number;
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || req.nextUrl.searchParams.get("token");
  const playlistId = req.nextUrl.searchParams.get("playlistId");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // If playlistId is provided, fetch videos in that playlist
    if (playlistId) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(playlistId)}&maxResults=25`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) {
        return NextResponse.json({ error: "Failed to load playlist videos" }, { status: res.status });
      }

      const data = await res.json();
      const rawItems: RawPlaylistItem[] = data.items || [];
      const items = rawItems.map((item, idx) => {
        const videoId = item.snippet?.resourceId?.videoId;
        return {
          id: videoId || `pl-item-${idx}`,
          youtubeId: videoId,
          title: item.snippet?.title || "Video",
          subtitle: item.snippet?.channelTitle || "YouTube",
          image:
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "/art/city.jpg"),
          source: "YouTube",
        };
      });

      return NextResponse.json({ items });
    }

    // Otherwise fetch list of user's playlists
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=25",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const rawPlaylists: RawUserPlaylistItem[] = data.items || [];
    const playlists = rawPlaylists.map((item) => ({
      id: item.id || "",
      title: item.snippet?.title || "Playlist",
      description: item.snippet?.description || "",
      itemCount: item.contentDetails?.itemCount || 0,
      thumbnail:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "",
    }));

    return NextResponse.json({ playlists });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load playlists" },
      { status: 500 }
    );
  }
}
