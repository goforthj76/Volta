# Nuvio evaluation

Inspected on 2026-10-28:

- Official Nuvio Web/TV code: https://github.com/NuvioMedia/NuvioWeb (GPL-3.0). Despite the repository name, the README targets Tizen/webOS packaged TV builds, with platform/version-specific native engine services. Browser development is supported; those TV engine services are not available in a Tesla browser.
- Official webOS wrapper: https://github.com/NuvioMedia/NuvioTVWebOS. This wraps the web client; it is not a Tesla browser player.
- Independent Nuvio browser client: https://github.com/orochibraru/nuvio-web (AGPL-3.0-or-later), with a Bun/server process, SQLite and encrypted Nuvio sessions. This is a genuine browser-oriented option, but introduces a different account backend and hosting stack.
- Official Nuvio account modules use a configurable Supabase-backed server, QR/device session approval and profile-aware APIs. This is not a drop-in Stremio account login or evidence that the same account tokens can be reused.

## Decision

Do not replace the existing Stremio-compatible client or add a misleading Nuvio login button. The inspected projects do not establish a Tesla playback advantage, and changing branding does not remove browser/vehicle display restrictions. Nuvio's catalog/stream ecosystem uses the same addon protocol, so improve Volta's shared authorized browser-stream adapter first. Evaluate a dedicated Nuvio adapter separately only after confirming a supported account endpoint, credentials/approval flow and an end-to-end login on the actual deployment.

No Nuvio application source or native engine is bundled. Reference README/package/license snapshots are retained under `docs/references`. If code is incorporated later, retain its copyright notices and satisfy its GPL/AGPL obligations; the repository license does not automatically cover third-party media/model assets.
