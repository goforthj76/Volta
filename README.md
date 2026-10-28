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

The Sites deployment now includes a Worker server and the compiled Next client. `npm run build:hosted` exports the client and packages the shared official YouTube search handler with it. The same site serves `/api/youtube` and `/api/status`; configure `YOUTUBE_API_KEY` as a Sites server secret and deploy to activate keyword search. Supabase account callbacks still require the complete Next/Vercel deployment; the Worker does not pretend to provide those callbacks.

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

## Revision 2 — Tesla cockpit / playback repair

Tesdash-inspired graphite glass, per-service ambient lighting, a perspective/parallax vehicle design study with paint choices, and larger launch tiles. The SVG/CSS illustration is original, not a live car connection or exact rendering of every Tesla model. Reduced-motion preferences disable motion.

`Enter cinema` now plays the bundled original Afterglow visual. The official CC BY Sintel trailer is bundled too, so these do not depend on external stream hosts. Playback requires an explicit tap; phones get native video controls. YouTube embeds offer an official-site fallback link. Images are bundled to avoid failed external artwork requests. A web app manifest supports adding Volta to the home screen; offline playback is not implemented.

## YouTube owner setup

1. Create a project at https://console.cloud.google.com/projectcreate.
2. Enable https://console.cloud.google.com/apis/library/youtube.googleapis.com for that project.
3. Create an API key under APIs & Services → Credentials. Restrict it to YouTube Data API v3. Browser referrer restrictions are unsuitable for this server-side key; application restrictions must match the chosen server infrastructure.
4. Configure `YOUTUBE_API_KEY` as a secret in the existing Sites runtime (using its environment management tools), then deploy that environment revision. Never put it in `NEXT_PUBLIC_*`, source, browser storage, or a playlist.
5. Open Settings → YouTube setup and refresh the connection status. Search and official embedded playback stay within Volta.

Google does not require an OAuth client for public keyword search. Search consumes daily API quota; request caching reduces repeat use. The current in-memory cache and limiter are per Worker isolate, so use an account/edge distributed limiter before broader public access.

## Fixed-screen launcher and real 3D studio

Home now fits the display without page scrolling, including portrait phones. Three tiles open the built-in YouTube, live TV and Stremio-compatible experiences. Personalize your cabin saves a name, vehicle, display location and paint on the device. Account setup still requires configured Supabase services; device personalization is not represented as account creation.

The scene uses a real CC BY 4.0 Tesla Model 3 mesh with Three.js lighting, shadows, materials and drag-to-rotate controls. Attribution is available from the scene and `public/models/CREDITS.txt`. Other selected model profiles explicitly show the Model 3 studio preview until corresponding licensed assets are added.

## Connect YouTube / Stremio accounts

Open the provider page or Settings → Connections. Stremio uses official device-link approval; approve at Stremio, return to Volta, then check the connection. Load My library for account metadata. No Stremio password is entered into Volta and no automatic playback rights or torrent support is implied.

YouTube login needs a Google OAuth client in addition to the existing search key:

1. In the existing Google Cloud project configure the OAuth consent screen (YouTube read-only scope) and add your own email as a test user while testing.
2. Create OAuth client ID → Web application.
3. Authorized redirect URI: `https://volta-passenger.clearsnow256.chatgpt.site/api/connections/youtube/callback` (use the equivalent origin for other deployments).
4. Configure server secrets `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, and deploy the updated environment.
5. Connect YouTube in Volta, approve Google consent, then load My playlists / My subscriptions. Playlist videos play in official embeds. Google watch history/personalized feed and Premium carryover are not promised by this API integration. Production consent verification may be required by Google.

`CONNECTION_ENCRYPTION_KEY` is a 64-character hex encoding of 32 random bytes, stored only as a server secret. It is provisioned on the hosted site; other deployments must generate their own. Do not rotate it unless intentionally invalidating all browser connections. No provider tokens are stored in localStorage or returned to browser JavaScript. Disconnect forgets this browser connection; revoke the app grant in provider settings if needed.

## Shared Stremio / Nuvio addon protocol

Nuvio was evaluated against its official TV/web client and the independent browser client. The results are documented in `docs/NUVIO_COMPARISON.md`; no Nuvio application or account backend has been bundled or represented as a verified Tesla-native integration.

Connected catalog titles can now request stream choices from the same user-provided addon. The adapter preserves query authorization, encodes resource IDs, filters unsafe URL schemes, removes torrent/external-player-only results, and offers web-compatible HTTPS or official YouTube playback inside Volta. Availability still depends on the user's authorized addon, browser codecs/CORS and vehicle display permissions. No addon or unauthorized content source ships with Volta.

Known account blockers: Google OAuth login needs the owner's Web application client ID and secret. Stremio link creation works in development but currently returns 404 from the hosted runtime, so account linking is not verified live. This is separate from catalog/direct-media playback. See `docs/ARCHITECTURE.md` and the account setup panel.

GitHub CI in `.github/workflows/ci.yml` runs lint, strict type checking, automated tests and the production build without production secrets. Publish source/media attribution files together; runtime credentials remain in hosting secrets and are excluded from Git.


## Revision 3 — Driving In-Motion Canvas Bypass & Stremio Account Integration

- **Front-Seat Passenger Driving Mode**: Based on public research in `keylimesoda/tesla-iptv` and `AgnusSOCO/tesla-video-player`, Volta now includes an in-motion canvas rendering engine. The audio decodes in an offscreen video element while frames are transferred directly to an HTML5 canvas via `requestVideoFrameCallback`. The Tesla browser does not suppress canvas elements while driving, enabling passenger playback on the road.
- **Authentic Stremio Web Experience**: Redesigned Stremio hub with Discover, Movies, Series, and My Library tabs. Supports logging into your official Stremio account via email and password or AuthKey to sync your personal addons (Torrentio, Debrid, CyberFlix) and watch history. Full TV show episode picker and stream selection.
- **Dedicated YouTube Suite**: Looks and feels just like YouTube with top search, category filtering (Tesla, Cinema, Lofi, Tech), video cards with duration chips, and a one-click direct YouTube URL player.
- **Preloaded Live IPTV**: Ships with verified CORS-enabled HLS public feeds (Red Bull TV, Sky News, NASA TV, Euronews, Bloomberg, France 24) plus an M3U and Xtream Codes URL / file importer.
