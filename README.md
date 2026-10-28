# Volta

A Tesla-first passenger entertainment V1 with an original cinematic interface. Built in Next.js, React, strict TypeScript, Supabase and hls.js. See [architecture](docs/ARCHITECTURE.md), [security/proxy design](docs/SECURITY.md) and [reference/license findings](docs/REFERENCES.md).

## Run locally

Requires Node 22+.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Visit http://localhost:3000. Guest mode works without credentials: play open sample films, paste a YouTube link into search, save favorites, switch profiles, import an authorized M3U file in Settings, import XMLTV, and connect a legitimate HTTPS addon catalog. Vehicle selection appears in sign-up and Settings → Appearance. Layout automatically fits phone, tablet and landscape displays.

## Configure services

1. Create a Supabase project. Apply `supabase/migrations/001_initial.sql` via SQL editor or CLI. Put its project URL in `NEXT_PUBLIC_SUPABASE_URL` and public anon key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never use a service-role key here.
2. In Supabase Auth configure Site URL and allow exact `https://your-domain/auth/callback` URLs (plus localhost for development), enable email verification, configure production SMTP and password rules/rate limits. Enable Google provider if wanted, create Google OAuth web credentials, and use the Supabase-provided callback URI in Google Cloud. This Google login is for Volta, not YouTube subscription access.
3. For YouTube keyword search, create a Google Cloud project, enable YouTube Data API v3 and set server-only `YOUTUBE_API_KEY`. Restrict the key to that API and appropriate server infrastructure. Search consumes YouTube quota; direct-link iframe playback does not require this key.
4. Set `NEXT_PUBLIC_APP_URL` to the deployment origin for operational configuration. Redirects derive the request/browser origin and always remain same-origin.

No IPTV subscription, channel feed, private credential or piracy addon ships with this app. Provider URLs stay in memory. Favorites/history for channels require reconnecting the playlist after reloading. M3U and XMLTV file import avoid playlist-fetch CORS issues; actual media must still allow playback. Xtream users can use their provider's M3U export. Safe gateway design is documented, not exposed as an unsafe generic proxy.

## Deploy / phone test

Import this directory into Vercel with the Next.js preset, configure the variables above, and deploy. For production accounts or YouTube search use this complete server deployment. To test from a phone on a local network, run `npm run dev` and visit your development machine's LAN IP on port 3000 if firewall rules permit.

The supplied Sites deployment is an interactive guest test build. `node scripts/build-preview.mjs` exports it to `out/`; it has real browser-local state and playback, but excludes the Next auth/API routes and explains that API-backed search needs the full deployment. Do not configure Supabase account sign-up on this static export; deploy the Next server first.

## Quality commands

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Tests cover safe source validation, playlist parsing, timezone handling, vehicle options and credential stripping. No credentials are invented. Before public launch, run real device/accessibility tests and deploy shared rate limiting; the current API limiter is single-process.

## Files

- `components/entertainment.tsx`: navigation, homepage, profile library, settings, IPTV import, EPG and catalogs.
- `components/player.tsx`: shared HTML video / HLS / official YouTube overlay.
- `components/auth.tsx`: sign-in, signup, recovery, Google OAuth and vehicle onboarding.
- `lib/`: media parsing, storage sanitization, vehicle types and Supabase browser client.
- `app/api/youtube/route.ts`: server-only official YouTube search.
- `app/auth/callback/route.ts`: Supabase PKCE callback.
- `app/globals.css`: responsive design tokens and Tesla/phone/tablet layouts.
- `supabase/migrations/`: schema and account ownership RLS.

## Current limits / next work

YouTube playlists/subscriptions authorization and iframe progress events; native text track/subtitle controls; a legitimate Stremio stream-resource resolver and supported account library bridge; persistent encrypted provider settings; QR pairing; virtualized guide grid; profile rename/delete; normalized profiles table integration; distributed rate limits and account security/device tests. Browsers and vehicles decide playback availability. No safety interlock bypass is implemented. Remote sample availability, API quotas, stream CORS, codecs and addon CORS remain provider-dependent.
