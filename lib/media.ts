export type Media = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  source: "YouTube" | "Live TV" | "Stremio" | "Volta";
  url?: string;
  youtubeId?: string;
  progress?: number;
  duration?: string;
  group?: string;
  epgId?: string;
  mediaType?: string;
};
export const artwork = {
  hero: "/art/hero.jpg",
  forest: "/art/forest.jpg",
  road: "/art/road.jpg",
  space: "/art/space.jpg",
  ocean: "/art/ocean.jpg",
  city: "/art/city.jpg",
  mountain: "/art/mountain.jpg",
};
export const featured: Media[] = [
  {
    id: "volta-afterglow",
    title: "Afterglow",
    subtitle: "Volta original · A visual escape",
    image: "/art/afterglow.jpg",
    source: "Volta",
    url: "/media/afterglow.mp4",
    duration: "16 sec",
  },
  {
    id: "sintel-trailer-local",
    title: "Sintel — Official trailer",
    subtitle: "Blender Foundation · Open film",
    image: "/art/sintel.jpg",
    source: "Stremio",
    url: "/media/sintel-trailer.mp4",
    duration: "52 sec",
  },
  {
    id: "big-buck-bunny",
    title: "Big Buck Bunny",
    subtitle: "Blender Foundation · Open movie",
    image: artwork.forest,
    source: "YouTube",
    youtubeId: "aqz-KE-bpKQ",
    duration: "10 min",
  },
  {
    id: "yt-jf",
    title: "A little space to unwind",
    subtitle: "Lofi Girl · YouTube",
    image: artwork.city,
    source: "YouTube",
    youtubeId: "jfKfPfyJRdk",
    duration: "LIVE",
  },
];
export function safeStream(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password
      ? u.href
      : null;
  } catch {
    return null;
  }
}
export function parseM3U(input: string): Media[] {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (!lines[0]?.trim().startsWith("#EXTM3U"))
    throw new Error("Please select a valid extended M3U playlist.");
  const out: Media[] = [];
  let info = "";
  for (const line of lines) {
    const s = line.trim();
    if (s.startsWith("#EXTINF:")) info = s;
    else if (s && !s.startsWith("#") && info) {
      const url = safeStream(s);
      if (url) {
        const name = info.slice(info.lastIndexOf(",") + 1).trim();
        const attr = (key: string) =>
          info.match(new RegExp(`${key}="([^"]*)"`))?.[1];
        out.push({
          id: `channel-${out.length}-${name}`,
          title: name || "Unnamed channel",
          subtitle: attr("group-title") || "Live television",
          group: attr("group-title") || "Other",
          epgId: attr("tvg-id"),
          image: safeStream(attr("tvg-logo") || "") || "",
          source: "Live TV",
          url,
        });
      }
      info = "";
    }
  }
  return out;
}
export type Program = {
  channel: string;
  start: number;
  stop: number;
  title: string;
};
export function xmltvTime(value: string) {
  const m = value.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/,
  );
  if (!m) return NaN;
  const zone = m[7] || "+0000";
  return Date.parse(
    `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${zone.slice(0, 3)}:${zone.slice(3)}`,
  );
}
export function parseXMLTV(xml: string): Program[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Invalid XMLTV guide");
  return [...doc.querySelectorAll("programme")].map((p) => ({
    channel: p.getAttribute("channel") || "",
    start: xmltvTime(p.getAttribute("start") || ""),
    stop: xmltvTime(p.getAttribute("stop") || ""),
    title: p.querySelector("title")?.textContent || "Untitled",
  }));
}
