import type { Media } from "./media";
export type Profile = {
  id: string;
  name: string;
  color: string;
  autoplay: boolean;
};
export type Library = { favorites: Media[]; history: Media[] };
export const defaultProfiles: Profile[] = [
  { id: "alex", name: "Alex", color: "#c9fa75", autoplay: true },
  { id: "jordan", name: "Jordan", color: "#a99aee", autoplay: false },
];
export function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// User-provider tokens and IPTV addresses never enter durable watch data.
export function sanitizeLibrary(library: Library): Library {
  const clean = (m: Media): Media => {
    const copy = { ...m };
    if (
      m.source === "Live TV" ||
      (m.url && new URL(m.url, "https://volta.invalid").search)
    ) {
      delete copy.url;
    }
    return copy;
  };
  return {
    favorites: library.favorites.map(clean),
    history: library.history.map(clean),
  };
}
