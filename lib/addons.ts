import { safeStream } from "./media";
export type BrowserStream = { name: string; url?: string; youtubeId?: string };
export function addonResource(
  manifest: string,
  resource: "catalog" | "stream",
  type: string,
  id: string,
) {
  const safe = safeStream(manifest);
  if (!safe) throw new Error("Use an HTTPS addon manifest URL.");
  const u = new URL(safe);
  if (!u.pathname.endsWith("/manifest.json"))
    throw new Error("Expected an addon manifest URL.");
  u.pathname =
    u.pathname.slice(0, -"/manifest.json".length) +
    `/${resource}/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
  return u.href;
}
export function browserStreams(value: unknown): BrowserStream[] {
  if (!Array.isArray(value)) return [];
  const output: BrowserStream[] = [];
  const seen = new Set<string>();
  for (const row of value.slice(0, 100)) {
    if (!row || typeof row !== "object") continue;
    const stream = row as Record<string, unknown>;
    if (
      stream.infoHash ||
      stream.externalUrl ||
      (stream.behaviorHints &&
        typeof stream.behaviorHints === "object" &&
        (stream.behaviorHints as Record<string, unknown>).notWebReady)
    )
      continue;
    const url = typeof stream.url === "string" ? safeStream(stream.url) : null;
    const youtubeId =
      typeof stream.ytId === "string" && /^[\w-]{11}$/.test(stream.ytId)
        ? stream.ytId
        : undefined;
    if (!url && !youtubeId) continue;
    const key = url || youtubeId!;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({
      name: (typeof stream.name === "string"
        ? stream.name
        : typeof stream.title === "string"
          ? stream.title
          : "Browser stream"
      ).slice(0, 140),
      ...(url ? { url } : { youtubeId }),
    });
  }
  return output;
}
