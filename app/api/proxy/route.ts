import { NextRequest, NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: parsed.origin + "/",
    };
    const range = req.headers.get("range");
    if (range) {
      upstreamHeaders["Range"] = range;
    }

    const upstreamRes = await fetch(parsed.href, {
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(15000),
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: `Upstream returned status ${upstreamRes.status}` },
        {
          status: upstreamRes.status,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        },
      );
    }

    const contentType = upstreamRes.headers.get("content-type") || "";

    // If it's an M3U8 manifest, rewrite relative segment/variant URLs to point back through the proxy
    if (
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegURL") ||
      parsed.pathname.endsWith(".m3u8")
    ) {
      const manifestText = await upstreamRes.text();
      const baseUrl = new URL(".", parsed.href).href;

      const lines = manifestText.split(/\r?\n/);
      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          // If line has URI="...", rewrite inside URI attribute
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/g, (_, uri) => {
              const abs = new URL(uri, baseUrl).href;
              return `URI="/api/proxy?url=${encodeURIComponent(abs)}"`;
            });
          }
          return line;
        }
        // Segment or variant stream line
        const absoluteSegment = new URL(trimmed, baseUrl).href;
        return `/api/proxy?url=${encodeURIComponent(absoluteSegment)}`;
      });

      return new NextResponse(rewrittenLines.join("\n"), {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    // For video chunks (.ts, .m4s, .mp4, etc.), stream with Range and CORS headers
    const outHeaders: Record<string, string> = {
      "Content-Type": contentType || "video/mp2t",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    };
    if (upstreamRes.headers.get("content-range")) {
      outHeaders["Content-Range"] = upstreamRes.headers.get("content-range")!;
    }
    if (upstreamRes.headers.get("content-length")) {
      outHeaders["Content-Length"] = upstreamRes.headers.get("content-length")!;
    }

    // Stream body directly without buffering entire multi-gigabyte video into memory
    const streamBody = upstreamRes.body;
    return new NextResponse(streamBody, {
      status: upstreamRes.status,
      headers: outHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Proxy fetch error";
    return NextResponse.json(
      { error: msg },
      {
        status: 502,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
