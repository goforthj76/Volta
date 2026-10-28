# Volta architecture

## Runtime
Next.js 15 App Router + React 19 + strict TypeScript. CSS uses shared tokens and landscape, tablet, phone and short-height breakpoints. Plain CSS is used instead of Tailwind to keep the original design and minimize build plumbing. Native video and hls.js handle authorized HTTPS media; YouTube uses its official privacy-enhanced iframe. No reference implementation code is copied.

The app is an interactive client with a Next server for YouTube Data API search and Supabase PKCE callbacks. Supabase Auth owns passwords and sessions. Public anon keys are intentionally public; service-role keys are never used. The callback exchanges the one-time code with Supabase's SSR cookie adapter and redirects only to the same origin. Browser Supabase sessions support refresh. Supabase auth metadata holds vehicle/display preferences and optional profile descriptors; row-level secured PostgreSQL holds per-profile watch data.

Guest profiles and libraries persist locally. Account library caches use account-specific keys. Playlist URLs, channel credentials, and EPG stay in memory. IPTV stream URLs are removed from persisted favorite/history entries: reconnect a source after a reload. Signed-in state synchronizes with `profile_state`; run the migration before enabling auth. Profile descriptors are saved to auth metadata when created, while the `profiles` table is reserved for a normalized follow-up. Autoplay preference is stored locally; it does not start another episode in this release.

## Provider boundaries
- YouTube: official iframe playback, direct-link support and API-backed keyword search. API key stays on server. No downloads, scraping, or Google password collection. Google OAuth via Supabase authenticates the Volta account only; it does not authorize YouTube subscriptions. App history is not Google's watch history. No claimed personalized recommendations. A deployed distributed rate limiter and quota monitoring are required before high-traffic use; the included limiter is process-local.
- IPTV: user-authorized extended M3U / M3U8 import, HTTPS URL fetch with browser CORS, groups, logos, favorite channels, switching, and XMLTV current/upcoming listings by `tvg-id`. No bundled channel feeds. XMLTV files up to 10 MB, playlists up to 5 MB. Xtream credentials are deliberately not persisted or transmitted; use the provider's HTTPS M3U export. QR pairing and a grid guide are roadmap items.
- Stremio: addon-protocol catalog metadata only, supplied by the user, with explicit separation from playback rights. Open Blender films and direct authorized HTTPS media URLs work. Official Stremio Web opens separately for account library / continue-watching sync. No private Stremio login API, torrent engine, transcoding or piracy addons. Direct MP4/WebM and HLS playback depend on codecs/CORS; torrents, magnet links and desktop-only streams do not play.

## Player
Shared media overlay with play/pause, seek, volume/mute, fullscreen, adaptive HLS and quality override, channel previous/next, favorite toggling, resume checkpoints, auto-hiding controls and error recovery. YouTube retains official controls and provider policies; iframe progress cannot currently update app resume timestamps. Subtitles require native text tracks (UI upload/selection is a follow-up); no subtitle service is bundled.

## Vehicle adaptation
Vehicle and display choice are collected on signup, stored in Supabase auth metadata and editable in Appearance. Layout uses viewport width/height, never assumes fixed pixels for a Model 3. Passenger playback is subject to vehicle and browser permissions. No canvas bypass, interlock bypass, or vehicle capability detection. Center display option is marked parked.

## Deployment
Vercel serves the complete Next app; Supabase supplies auth/database. Sites hosts a static export of the interactive guest client for phone testing. `node scripts/build-preview.mjs` temporarily excludes server routes for that export, restores them even on failure, and disables keyword search with a clear message. Full production build includes both API routes. Static test hosting is not the complete server deployment and cannot enable server auth callbacks or API search.

## Further hardening before public launch
Deploy shared rate limits (Upstash/edge WAF), validate real provider traffic and codec compatibility on target Tesla hardware, configure Supabase SMTP and auth rate limits, perform external accessibility/device testing and add observability without media URLs or credential logs. Local catalogs and large XMLTV sources should move to indexed workers for scale.

## Revision 2 visual system and validated playback

The cockpit uses layered SVG vehicle artwork with CSS perspective, pointer parallax, editable illustration paint, a smoked-glass launcher, per-service light and responsive mobile stacking. This is an independent visualization, not live vehicle telemetry. Reduced motion disables animation and tilt. All featured artwork is local.

First-party playback now waits for an explicit user gesture and shows an accessible central Play button, buffering indicator and useful errors. Coarse-pointer devices get native video controls; desktop retains the shared control bar. Both bundled MP4s use browser-compatible H.264 with fast-start metadata. External Google Storage sample URLs were removed from the curated list. The bundled original and CC BY Sintel trailer work without provider keys; YouTube remains an official embed with an official-site escape link.

Verified in headless Chromium at 1440×1000 and a touch-enabled 390×844 viewport: no horizontal overflow, native touch controls, Afterglow advancing past 2 seconds, Sintel trailer advancing past 1 second, and no uncaught browser exceptions. Physical iPhone and Tesla testing remains necessary. `npm run test:browser` repeats the smoke test with Chromium installed (`CHROMIUM_BIN` overrides its path); screenshots go to `QA_ARTIFACT_DIR` or `/tmp/volta-qa`. The smoke test owns local ports 3000 and 9222 while running.

## Revision 3 — integrated hosted search server

Sites now uses its supported Worker ESM deployment format instead of static-only hosting. The existing Next React application still builds normally for Vercel. The hosted build generates a self-contained `dist/server/index.js` module containing compiled client assets plus the shared YouTube handler. Assets are embedded because the standalone Worker contract does not provide arbitrary filesystem assets. Correct byte-range/HEAD responses preserve phone MP4 playback. This bounded client/media bundle fits in memory; large user media must remain provider streams or move to dedicated object storage. No user media is copied into this bundle.

`lib/youtube.mjs` implements official Data API search, embeddable/syndicated video filtering, cache, per-isolate request limits, timeouts and redacted upstream errors. Both the Next route and hosted Worker call this exact implementation. `GET /api/status` reports only whether the server secret is configured, never its value. Settings includes owner setup instructions and connection status. No Google key is fabricated or bundled. Search needs the owner's configured Google Cloud key before real upstream verification is possible.

Default playback and navigation stay inside Volta. Provider-imposed embed/codec restrictions are surfaced in place; Stremio cloud-account sync is explicitly not connected, rather than redirecting visitors into another app. Native Google/Supabase login authorization remains a separate provider-controlled flow when configured.

## Fixed-screen cabin launcher

Home is now a `100dvh` launcher with no document scrolling, three app tiles, clock/profile controls and a device-local cabin setup flow. Search results and media libraries retain scrolling within their own screens. Model, display, name and paint preferences persist locally; configured Supabase account metadata can synchronize supported profile values. Device setup is explicitly distinct from secure account creation, which still requires configured Supabase service/callbacks.

The old drawn vehicle is replaced by a lazy-loaded Three.js GLTF studio with a licensed Model 3 mesh, physically based paint, environment reflections, spot/directional lighting, ground shadows and OrbitControls. Rendering occurs on interaction, resize or paint changes rather than a continuous animation loop. Pixel density is capped. Other models currently use a clearly labeled Model 3 preview; exact model-specific assets remain a follow-up. WebGL failure is reported without breaking app navigation.
