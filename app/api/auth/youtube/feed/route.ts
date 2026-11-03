import { NextRequest, NextResponse } from "next/server";

interface PlaylistItem {
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    resourceId?: { videoId?: string };
    thumbnails?: {
      maxres?: { url?: string };
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface VideoItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: {
      maxres?: { url?: string };
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
  contentDetails?: {
    duration?: string;
  };
  statistics?: {
    viewCount?: string;
  };
}

// Format ISO 8601 duration (e.g., PT15M33S) into standard mm:ss or hh:mm:ss
function formatDuration(iso?: string): string {
  if (!iso) return "HD";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "HD";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  const secStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  if (hours > 0) {
    const minStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
    return `${hours}:${minStr}:${secStr}`;
  }
  return `${minutes}:${secStr}`;
}

// Format views count
function formatViews(count?: string): string {
  if (!count) return "Popular";
  const n = parseInt(count, 10);
  if (isNaN(n)) return "Popular";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K views`;
  return `${n} views`;
}

// Format relative time (e.g., "2 days ago")
function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return "Recent";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours === 0) return "Just now";
    return `${hours}h ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  interface FeedVideo {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  channelAvatar: string;
  thumbnail: string;
  views: string;
  uploadedAt: string;
  duration: string;
  category: string;
  badge?: string;
}

  const personalFeed: FeedVideo[] = [];
  const seenIds = new Set<string>();

  try {
    // 1. Fetch user's Liked Videos (myRating=like)
    try {
      const likedRes = await fetch(
        "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&myRating=like&maxResults=15",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (likedRes.ok) {
        const likedData = await likedRes.json();
        const items: VideoItem[] = likedData.items || [];
        for (const item of items) {
          if (item.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            personalFeed.push({
              id: item.id,
              youtubeId: item.id,
              title: item.snippet?.title || "Video",
              channel: item.snippet?.channelTitle || "YouTube",
              channelAvatar: "",
              thumbnail:
                item.snippet?.thumbnails?.maxres?.url ||
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
              views: formatViews(item.statistics?.viewCount),
              uploadedAt: formatTimeAgo(item.snippet?.publishedAt),
              duration: formatDuration(item.contentDetails?.duration),
              category: "Liked Videos",
              badge: "LIKED",
            });
          }
        }
      }
    } catch {
      // Continue to subscriptions
    }

    // 2. Fetch user's Subscribed Channels
    const subRes = await fetch(
      "https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=10&order=unread",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (subRes.ok) {
      const subData = await subRes.json();
      const channels = subData.items || [];

      // For top 5 subscribed channels, fetch their latest uploads playlist
      // Channel ID UC... -> Uploads playlist ID UU...
      const uploadPromises = channels.slice(0, 5).map(async (c: { snippet?: { resourceId?: { channelId?: string }; thumbnails?: { default?: { url?: string } } } }) => {
        const channelId = c.snippet?.resourceId?.channelId;
        if (!channelId) return [];
        const channelAvatar: string = c.snippet?.thumbnails?.default?.url || "";
        if (!channelId) return [];

        const uploadsPlaylistId = "UU" + channelId.substring(2);
        try {
          const uploadsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=5`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (uploadsRes.ok) {
            const data = await uploadsRes.json();
            return (data.items || []).map((item: PlaylistItem) => ({
              ...item,
              channelAvatar,
            }));
          }
        } catch {
          return [];
        }
        return [];
      });

      const channelUploadResults = await Promise.all(uploadPromises);
      for (const channelUploads of channelUploadResults) {
        for (const item of channelUploads) {
          const videoId = item.snippet?.resourceId?.videoId;
          if (videoId && !seenIds.has(videoId)) {
            seenIds.add(videoId);
            personalFeed.push({
              id: videoId,
              youtubeId: videoId,
              title: item.snippet?.title || "Video",
              channel: item.snippet?.channelTitle || "YouTube",
              channelAvatar: item.channelAvatar || "",
              thumbnail:
                item.snippet?.thumbnails?.maxres?.url ||
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              views: "From Subscription",
              uploadedAt: formatTimeAgo(item.snippet?.publishedAt),
              duration: "HD",
              category: "Subscribed Channels",
              badge: "SUB",
            });
          }
        }
      }
    }

    return NextResponse.json({ feed: personalFeed });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load feed", feed: [] },
      { status: 500 }
    );
  }
}
