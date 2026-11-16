import { NextRequest, NextResponse } from "next/server";
import { Ytdl } from "@distube/ytdl-core";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

// In-memory cache for resolved stream URLs (TTL: 30 minutes)
const streamCache = new Map<
  string,
  {
    expires: number;
    data: Record<string, unknown>;
  }
>();

interface InvidiousFormat {
  type?: string;
  resolution?: string;
  url?: string;
  bitrate?: number;
  width?: number;
  height?: number;
  fps?: number;
}

// Fallback resolver via verified Invidious instances
async function resolveViaInvidious(videoId: string) {
  const instances = [
    "https://yt.chocolatemoo53.com",
    "https://invidious.nerdvpn.de",
    "https://inv.nadeko.net",
  ];

  for (const base of instances) {
    try {
      const res = await fetch(`${base}/api/v1/videos/${videoId}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const adaptive: InvidiousFormat[] = data.adaptiveFormats || [];

      // Find best H.264 video format
      const h264List = adaptive.filter(
        (f) => f.type?.includes("video/mp4") && f.type?.includes("avc1") && f.url,
      );
      const selectedVideo =
        h264List.find((f) => f.resolution === "720p") ||
        h264List.find((f) => f.resolution === "480p") ||
        h264List.find((f) => f.resolution === "360p") ||
        h264List[0];

      // Find best AAC audio format
      const audioList = adaptive.filter(
        (f) => f.type?.includes("audio/mp4") && f.url,
      );
      const selectedAudio = audioList[0];

      if (selectedVideo && selectedAudio && selectedVideo.url && selectedAudio.url) {
        const vUrl = selectedVideo.url;
        const aUrl = selectedAudio.url;
        return {
          videoId,
          title: data.title || "YouTube Stream",
          author: data.author || "YouTube",
          duration: data.lengthSeconds || 0,
          thumbnail:
            data.videoThumbnails?.[0]?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          video: {
            url: vUrl,
            proxyUrl: `/api/proxy?url=${encodeURIComponent(vUrl)}`,
            quality: selectedVideo.resolution || "720p",
            mimeType: selectedVideo.type || 'video/mp4; codecs="avc1.4D4020"',
            width: selectedVideo.width || 1280,
            height: selectedVideo.height || 720,
            fps: selectedVideo.fps || 30,
          },
          audio: {
            url: aUrl,
            proxyUrl: `/api/proxy?url=${encodeURIComponent(aUrl)}`,
            mimeType: selectedAudio.type || 'audio/mp4; codecs="mp4a.40.2"',
            bitrate: selectedAudio.bitrate || 128,
          },
        };
      }
    } catch {
      // Try next instance
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId =
    searchParams.get("v") ||
    searchParams.get("id") ||
    searchParams.get("videoId");

  if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
    return NextResponse.json(
      { error: "Invalid or missing videoId parameter" },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  const cached = streamCache.get(videoId);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800",
      },
    });
  }

  // Tier 1: Try ytdl-core
  try {
    const yt = new Ytdl();
    const info = await yt.getInfo(videoId);

    const h264Formats = info.formats.filter(
      (f) => f.hasVideo && !f.hasAudio && f.mimeType && f.mimeType.includes("avc1") && f.url,
    );

    const selectedVideo =
      h264Formats.find(
        (f) => f.qualityLabel === "720p" || f.qualityLabel === "720p60",
      ) ||
      h264Formats.find((f) => f.qualityLabel === "480p") ||
      h264Formats.find((f) => f.qualityLabel === "360p") ||
      h264Formats[0] ||
      info.formats.find((f) => f.hasVideo && f.url);

    const audioFormats = info.formats
      .filter((f) => f.hasAudio && !f.hasVideo && f.url)
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

    const selectedAudio =
      audioFormats.find((f) => f.mimeType && f.mimeType.includes("mp4a")) ||
      audioFormats[0];

    if (selectedVideo && selectedAudio) {
      const title = info.videoDetails.title;
      const duration = parseInt(String(info.videoDetails.lengthSeconds || "0"), 10) || 0;
      const author = info.videoDetails.author?.name || "YouTube";
      const thumbnail =
        info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      const videoUrl = selectedVideo.url || "";
      const audioUrl = selectedAudio.url || "";

      const data = {
        videoId,
        title,
        author,
        duration,
        thumbnail,
        video: {
          url: videoUrl,
          proxyUrl: `/api/proxy?url=${encodeURIComponent(videoUrl)}`,
          quality: selectedVideo.qualityLabel || "720p",
          mimeType: selectedVideo.mimeType || 'video/mp4; codecs="avc1.4D401F"',
          width: selectedVideo.width || 1280,
          height: selectedVideo.height || 720,
          fps: selectedVideo.fps || 30,
        },
        audio: {
          url: audioUrl,
          proxyUrl: `/api/proxy?url=${encodeURIComponent(audioUrl)}`,
          mimeType: selectedAudio.mimeType || 'audio/mp4; codecs="mp4a.40.2"',
          bitrate: selectedAudio.audioBitrate || 128,
        },
      };

      streamCache.set(videoId, {
        expires: Date.now() + 1800 * 1000,
        data,
      });

      return NextResponse.json(data, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=1800",
        },
      });
    }
  } catch (err) {
    console.warn("ytdl resolution notice, falling back to Invidious...", err);
  }

  // Tier 2: Invidious instance fallback
  const fallbackData = await resolveViaInvidious(videoId);
  if (fallbackData) {
    streamCache.set(videoId, {
      expires: Date.now() + 1800 * 1000,
      data: fallbackData,
    });
    return NextResponse.json(fallbackData, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=1800",
      },
    });
  }

  return NextResponse.json(
    {
      error: "Unable to resolve stream formats for video " + videoId,
      videoId,
    },
    { status: 502, headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
