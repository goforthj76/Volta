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
