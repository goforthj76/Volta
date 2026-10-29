export type StremioUser = {
  _id: string;
  email: string;
};

export type StremioVideo = {
  id: string;
  name: string;
  season: number;
  episode: number;
  thumbnail?: string;
  overview?: string;
};

export type StremioMeta = {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  year?: string;
  imdbRating?: string;
  genres?: string[];
  runtime?: string;
  cast?: string[];
  videos?: StremioVideo[];
  trailerStreams?: Array<{ title?: string; ytId?: string }>;
  trailers?: Array<{ source: string; type: string }>;
};

export type StremioStream = {
  name?: string;
  title?: string;
  url?: string;
  ytId?: string;
  infoHash?: string;
  behaviorHints?: Record<string, unknown>;
};

export type StremioAddon = {
  transportUrl: string;
  manifest: {
    id: string;
    name: string;
    version?: string;
    description?: string;
    types: string[];
    resources: Array<string | { name: string; types: string[]; idPrefixes?: string[] }>;
    catalogs?: Array<{ id: string; type: string; name?: string }>;
  };
};

export const CINEMETA_URL = "https://v3-cinemeta.strem.io";

type RawCinemetaItem = {
  id: string;
  type?: string;
  name: string;
  poster?: string;
  background?: string;
  year?: string;
  imdbRating?: string;
  genres?: string[];
  description?: string;
};

export async function fetchCinemetaCatalog(
  type: "movie" | "series",
  catalogId: "top" = "top",
  genre?: string,
): Promise<StremioMeta[]> {
  try {
    const genreParam = genre ? `&genre=${encodeURIComponent(genre)}` : "";
    const url = `${CINEMETA_URL}/catalog/${type}/${catalogId}.json${genreParam ? `?${genreParam}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { metas?: RawCinemetaItem[] };
    return (data.metas || []).map((m) => ({
      id: m.id,
      type: m.type || type,
      name: m.name,
      poster: m.poster,
      background: m.background,
      year: m.year,
      imdbRating: m.imdbRating,
      genres: m.genres,
      description: m.description,
    }));
  } catch {
    return [];
  }
}

export async function searchCinemeta(
  query: string,
  type?: "movie" | "series",
): Promise<StremioMeta[]> {
  try {
    const targets = type ? [type] : (["movie", "series"] as const);
    const results = await Promise.all(
      targets.map(async (t) => {
        const url = `${CINEMETA_URL}/catalog/${t}/top/search=${encodeURIComponent(query)}.json`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return [];
        const data = (await res.json()) as { metas?: RawCinemetaItem[] };
        return (data.metas || []).map((m) => ({
          id: m.id,
          type: m.type || t,
          name: m.name,
          poster: m.poster,
          background: m.background,
          year: m.year,
          imdbRating: m.imdbRating,
          genres: m.genres,
          description: m.description,
        }));
      }),
    );
    return results.flat();
  } catch {
    return [];
  }
}

type RawFullMeta = RawCinemetaItem & {
  logo?: string;
  releaseInfo?: string;
  runtime?: string;
  cast?: string[];
  videos?: Array<{
    id: string;
    name?: string;
    season?: number;
    episode?: number;
    number?: number;
    thumbnail?: string;
    overview?: string;
    description?: string;
  }>;
};

export async function fetchCinemetaMeta(
  type: string,
  id: string,
): Promise<StremioMeta | null> {
  try {
    const url = `${CINEMETA_URL}/meta/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { meta?: RawFullMeta };
    const m = data.meta;
    if (!m) return null;
    return {
      id: m.id,
      type: m.type || type,
      name: m.name,
      poster: m.poster,
      background: m.background,
      logo: m.logo,
      description: m.description,
      releaseInfo: m.releaseInfo || m.year,
      year: m.year,
      imdbRating: m.imdbRating,
      genres: m.genres,
      runtime: m.runtime,
      cast: m.cast,
      videos: m.videos?.map((v) => ({
        id: v.id,
        name: v.name || `Episode ${v.episode || v.number || 1}`,
        season: v.season ?? 1,
        episode: v.episode ?? v.number ?? 1,
        thumbnail: v.thumbnail,
        overview: v.overview || v.description,
      })),
    };
  } catch {
    return null;
  }
}

type RawStreamItem = {
  name?: string;
  title?: string;
  url?: string;
  ytId?: string;
  behaviorHints?: Record<string, unknown>;
};

export async function fetchAddonStreams(
  addonUrl: string,
  type: string,
  id: string,
): Promise<StremioStream[]> {
  try {
    const base = addonUrl.replace(/\/manifest\.json$/, "");
    const url = `${base}/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { streams?: RawStreamItem[] };
    return (data.streams || []).map((s) => ({
      name: s.name,
      title: s.title || s.name || "Stream",
      url: s.url,
      ytId: s.ytId,
      behaviorHints: s.behaviorHints,
    }));
  } catch {
    return [];
  }
}
