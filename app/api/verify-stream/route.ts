import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("url");

  if (!target) {
    return NextResponse.json({ ok: false, error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Range: "bytes=0-1024",
      },
      signal: AbortSignal.timeout(5000),
    });

    const isOk = res.ok || res.status === 206 || res.status === 200;
    return NextResponse.json({
      ok: isOk,
      status: res.status,
      contentType: res.headers.get("content-type") || "",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urls: string[] = Array.isArray(body?.urls) ? body.urls : [];

    if (!urls.length) {
      return NextResponse.json({ results: {} });
    }

    const checkUrl = async (url: string): Promise<[string, boolean]> => {
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Range: "bytes=0-1024",
          },
          signal: AbortSignal.timeout(6000),
        });
        return [url, res.ok || res.status === 206 || res.status === 200];
      } catch {
        return [url, false];
      }
    };

    const pairs = await Promise.all(urls.map(checkUrl));
    const results = Object.fromEntries(pairs);

    return NextResponse.json({ results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message, results: {} }, { status: 400 });
  }
}
