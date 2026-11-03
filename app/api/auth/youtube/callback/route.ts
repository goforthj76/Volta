import { NextRequest, NextResponse } from "next/server";
import { completePairSession, YouTubeProfile } from "@/lib/youtube-auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // pair code
  const error = searchParams.get("error");

  if (error || !code) {
    return new NextResponse(
      renderHtml("Connection Cancelled", "Google sign-in was not completed or was cancelled.", false),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new NextResponse(
      renderHtml("Server Configuration Error", "GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.", false),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "volta-liard-five.vercel.app";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const redirectUri = `${proto}://${host}/api/auth/youtube/callback`;

  try {
    // Exchange auth code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("Google token exchange error:", errBody);
      return new NextResponse(
        renderHtml("Token Exchange Failed", "Could not complete token authorization with Google.", false),
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Fetch user's YouTube channel or Google Profile
    let channelTitle = "YouTube User";
    let channelAvatar = "";
    let channelId = "";

    try {
      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (channelRes.ok) {
        const channelData = await channelRes.json();
        const item = channelData.items?.[0];
        if (item) {
          channelTitle = item.snippet?.title || channelTitle;
          channelAvatar = item.snippet?.thumbnails?.default?.url || "";
          channelId = item.id || "";
        }
      }
    } catch {
      // Fallback to userinfo
    }

    if (!channelAvatar) {
      try {
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          channelTitle = userData.name || channelTitle;
          channelAvatar = userData.picture || "";
        }
      } catch {
        // ignore
      }
    }

    const profile: YouTubeProfile = {
      channelId,
      title: channelTitle,
      avatar: channelAvatar,
      accessToken,
      refreshToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    if (state) {
      completePairSession(state, profile);
    }

    return new NextResponse(
      renderHtml("Connected Successfully!", `You are signed in as <strong>${escapeHtml(channelTitle)}</strong>. Your Tesla screen is now updated with your subscriptions and playlists!`, true, channelAvatar, channelTitle),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal Error";
    return new NextResponse(
      renderHtml("Error", msg, false),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderHtml(
  title: string,
  message: string,
  success: boolean,
  avatar?: string,
  channelName?: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - Volta</title>
  <style>
    * { box-sizing: border-box; }
    body {
      background: #090a09;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #141715;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      max-width: 440px;
      width: 100%;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    }
    .icon {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      background: ${success ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)"};
      border: 1px solid ${success ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"};
      color: ${success ? "#10b981" : "#ef4444"};
    }
    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 16px;
      border: 2px solid #38bdf8;
      display: block;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 12px;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    p {
      color: #9ca3af;
      font-size: 15px;
      line-height: 1.5;
      margin: 0 0 24px;
    }
    .pill {
      display: inline-block;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 600;
      color: #38bdf8;
    }
  </style>
</head>
<body>
  <div class="card">
    ${
      avatar
        ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(channelName || "")}" class="avatar" />`
        : `<div class="icon">${success ? "✓" : "✕"}</div>`
    }
    <h1>${escapeHtml(title)}</h1>
    <p>${message}</p>
    ${success ? `<div class="pill">You can close this tab now</div>` : ""}
  </div>
</body>
</html>`;
}
