# Sling app

The existing Sling tab and launcher tile now open an isolated Freestream app. It loads Sling's public free live-channel catalog and plays selected channels in a native video element using Shaka Player 5.3.3 and Widevine. It does not route video through Volta's shared canvas player.

Only Freestream is connected. Paid Sling Orange/Blue, ESPN2, DVR and account login are not implemented. No provider passwords or account tokens are required or stored. The official Sling link opens the provider separately.

## Implementation

- `components/sling-app.tsx`, `sling-player.tsx` and `sling.module.css` contain the isolated interface and playback lifecycle.
- `/api/sling/channels` returns free, visible, linear channels; source data is cached in memory for five minutes.
- `/api/sling/stream?channel=...` refreshes the selected free channel's current manifest.
- `/api/sling/license?channel=...` forwards the browser CDM challenge to Sling's fixed license endpoint. It validates same-origin POSTs, content type, request size and free catalog membership. It does not accept an upstream URL from the caller, remove DRM, or extract keys.
- Video segments go directly to Sling's media CDN over HTTPS. The server does not relay or transcode video.

These routes require the Next.js server runtime used by the Vercel deployment. Static-export-only builds and the separate Worker hosting adapter are not extended by this change.

## Validation

Unit tests cover free-channel filtering, request coalescing, invalid IDs, paid-channel rejection, unsafe manifest URLs, binary license forwarding, request size, origin checks behind a reverse proxy, and redaction of provider diagnostics.

Live testing of the production Next.js build in official Chrome verified Weather Nation: native Widevine license HTTP 200, currentTime advanced 7016.224 to 7021.231, decoded frames increased 26 to 176. The browser also checked close/Escape cleanup, Home and Fubo navigation, 390px mobile width, and absence of runtime errors.

Tesla browser playback, audible output and paid-channel access are not verified. Use video while parked. Other free channels can have regional, compatibility or source availability restrictions.
