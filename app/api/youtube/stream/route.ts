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

  try {
    const yt = new Ytdl();
    const info = await yt.getInfo(videoId);

    // Prioritize H.264 (avc1) for Tesla hardware acceleration in WebCodecs
    const h264Formats = info.formats.filter(
      (f) => f.hasVideo && !f.hasAudio && f.mimeType && f.mimeType.includes("avc1") && f.url,
    );

    // Prefer 720p or 480p for reliable, smooth streaming on in-car cellular
    const selectedVideo =
      h264Formats.find(
        (f) => f.qualityLabel === "720p" || f.qualityLabel === "720p60",
      ) ||
      h264Formats.find((f) => f.qualityLabel === "480p") ||
      h264Formats.find((f) => f.qualityLabel === "360p") ||
      h264Formats[0] ||
      info.formats.find((f) => f.hasVideo && f.url);

    // Audio format: AAC (mp4a)
    const audioFormats = info.formats
      .filter((f) => f.hasAudio && !f.hasVideo && f.url)
      .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

    const selectedAudio =
      audioFormats.find((f) => f.mimeType && f.mimeType.includes("mp4a")) ||
      audioFormats[0];

    if (!selectedVideo || !selectedAudio) {
      return NextResponse.json(
        { error: "Unable to find suitable streaming formats for this video" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

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
        mimeType: selectedVideo.mimeType || "video/mp4; codecs=\"avc1.4D401F\"",
        width: selectedVideo.width || 1280,
        height: selectedVideo.height || 720,
        fps: selectedVideo.fps || 30,
      },
      audio: {
        url: audioUrl,
        proxyUrl: `/api/proxy?url=${encodeURIComponent(audioUrl)}`,
        mimeType: selectedAudio.mimeType || "audio/mp4; codecs=\"mp4a.40.2\"",
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
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("YouTube stream resolve error:", err);
    return NextResponse.json(
      {
        error: "Failed to resolve YouTube stream. " + errorMsg,
        videoId,
      },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}
