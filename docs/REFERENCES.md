# Reference inspection — 2026-10-28

Fetched the default-branch README and package.json of each requested repository; snapshots are in `docs/references/`. References inform architecture only; no application source was copied or imported.

- https://github.com/keylimesoda/tesla-iptv — small TypeScript/Vite client using hls.js 1.5.13. No license declared in retrieved package manifest and no root license file returned by the root listing. Treat as all-rights-reserved unless clarified by its owner; no code reused. Useful reference for user playlist/HLS organization.
- https://github.com/AgnusSOCO/tesla-video-player — React/Vite frontend, Supabase/backend and Telegram integration. Retrieved package.json declares MIT, but no root LICENSE file was returned by the listing; verify the full license grant before reusing source. Its canvas/WebCodecs bypass and downloader architecture are not used. Volta uses native browser video and official YouTube embeds.
- https://github.com/Stremio/stremio-web — GPL-2.0, verified from repository LICENSE.md (saved locally), README and package.json. React UI delegates state to Rust stremio-core compiled to WASM in a worker, with stremio-video selecting playback implementations. Volta does not embed or copy that code; it interoperates independently with user-provided addon JSON catalogs and links out to official Stremio Web for account/library functionality. No Stremio account protocol has been assumed stable or public for third-party login.

License findings describe the inspected files at the time above, not a legal opinion or a permanent claim about future repository contents. Open sample films use Blender Foundation distribution samples; YouTube media is displayed through official embeds. Landscape artwork is supplied by Unsplash for illustration, not claimed to be a film's official poster. Volta is an independent product concept, not affiliated with Tesla, YouTube or Stremio.

## Tesdash design reference — revision 2

Inspected https://github.com/crstian19/tesdash (README, package manifest and MIT LICENSE saved in `docs/references/`). Its Tesla dashboard, touch-first launch cards, service accent lighting and glass/spotlight interaction patterns informed the second design pass. The cockpit illustration, SVG paths, CSS dimensional scene and launcher implementation are original; no Tesdash source code is embedded. Its fullscreen redirect approach is not used.

The bundled Sintel trailer is from https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4 (HTTP 200 verified during implementation), © Blender Foundation / sintel.org, licensed CC BY 3.0: https://creativecommons.org/licenses/by/3.0/. The local poster is a frame from that trailer under the same license. Afterglow is an original, silent, 16-second abstract visual generated for this app; its bundled MP4 and poster need no external feed. The vehicle illustration is an original Model 3-inspired design study, not official Tesla artwork or a dimensional rendering for every model.

## Real vehicle studio

The launcher now uses the actual Tesla Model 3 GLB by David_Holiday, CC BY 4.0. Source: https://sketchfab.com/3d-models/tesla-model-3-123c10f376ec4f18b93c73afc382808b. Distribution copy: https://sceneview.github.io/models/platforms/tesla_model_3.glb. The GLB embeds matching author, source and license metadata. Attribution is also served at `/models/CREDITS.txt` and linked from the scene. Changes are runtime paint/glass materials, normalization, studio lighting, shadows and camera controls. The model itself has not been reshaped to impersonate other Tesla models; those profiles are labeled as a Model 3 studio preview.
