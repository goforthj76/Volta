import { NextRequest, NextResponse } from "next/server";
import { createPairSession } from "@/lib/youtube-auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const existingCode = searchParams.get("code");
  const shouldRedirect = searchParams.get("redirect") === "true";

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID is not configured in Vercel environment variables." },
      { status: 500 }
    );
  }

  const code = existingCode ? existingCode.toUpperCase() : createPairSession();

  // Construct origin for redirect URI
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "volta-liard-five.vercel.app";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const redirectUri = `${proto}://${host}/api/auth/youtube/callback`;

  const scope = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
  ].join(" ");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", scope);
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");
  googleAuthUrl.searchParams.set("state", code);

  if (shouldRedirect) {
    return NextResponse.redirect(googleAuthUrl.toString());
  }

  const pairUrl = `${proto}://${host}/pair?code=${code}`;

  return NextResponse.json({
    code,
    pairUrl,
    authUrl: googleAuthUrl.toString(),
  });
}
