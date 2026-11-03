import { NextRequest, NextResponse } from "next/server";

interface RawSubItem {
  snippet?: {
    title?: string;
    description?: string;
    resourceId?: { channelId?: string };
    thumbnails?: {
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=25&order=alphabetical",
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const rawItems: RawSubItem[] = data.items || [];
    const channels = rawItems.map((item) => ({
      id: item.snippet?.resourceId?.channelId || "",
      title: item.snippet?.title || "Channel",
      description: item.snippet?.description || "",
      thumbnail:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        "",
    }));

    return NextResponse.json({ channels });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load subscriptions" },
      { status: 500 }
    );
  }
}
