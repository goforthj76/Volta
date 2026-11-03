import { NextRequest, NextResponse } from "next/server";
import { getPairSession } from "@/lib/youtube-auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const sess = getPairSession(code);
  if (!sess) {
    return NextResponse.json({ connected: false, error: "Session expired or invalid" });
  }

  if (sess.profile) {
    return NextResponse.json({
      connected: true,
      profile: sess.profile,
    });
  }

  return NextResponse.json({ connected: false });
}
