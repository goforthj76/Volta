import { Media } from "./media";

export type ChannelCategory = "All" | "News" | "Sports" | "Entertainment" | "Tech & Space" | "Music";
export type LiveTvProvider = "all" | "fubo" | "sling" | "free";

export interface ProviderInfo {
  id: LiveTvProvider;
  name: string;
  tagline: string;
  color: string;
  accent: string;
}

export const liveProviders: ProviderInfo[] = [
  {
    id: "all",
    name: "All Channels",
    tagline: "Unified Multi-Provider Guide",
    color: "#38bdf8",
    accent: "rgba(56, 189, 248, 0.15)",
  },
  {
    id: "fubo",
    name: "Fubo TV",
    tagline: "Live Sports, ESPN, FS1 & Regional Networks",
    color: "#ff5900",
    accent: "rgba(255, 89, 0, 0.15)",
  },
  {
    id: "sling",
    name: "Sling TV",
    tagline: "Live Entertainment, Cable News & Sports",
    color: "#00a3e0",
    accent: "rgba(0, 163, 224, 0.15)",
  },
  {
    id: "free",
    name: "Free Live TV",
    tagline: "Verified 24/7 Global Live Streams",
    color: "#10b981",
    accent: "rgba(16, 185, 129, 0.15)",
  },
];

export const fuboPresetChannels: Media[] = [
  {
    id: "fubo-espn",
    title: "ESPN HD",
    subtitle: "SportsCenter, Live Games & Analysis",
    group: "Sports",
    source: "Live TV",
    provider: "fubo",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "fubo-fs1",
    title: "Fox Sports 1 (FS1)",
    subtitle: "Live MLB, College Football, NASCAR & Soccer",
    group: "Sports",
    source: "Live TV",
    provider: "fubo",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Fox_Sports_1_logo.svg/320px-Fox_Sports_1_logo.svg.png",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "fubo-golf",
    title: "Golf Channel",
    subtitle: "PGA Tour, LPGA & Live Tournaments",
    group: "Sports",
    source: "Live TV",
    provider: "fubo",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Golf_Channel_logo_2014.svg/320px-Golf_Channel_logo_2014.svg.png",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "fubo-cbs-sports",
    title: "CBS Sports Golazo Network",
    subtitle: "24/7 Global Soccer & UEFA Champions League",
    group: "Sports",
    source: "Live TV",
    provider: "fubo",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/CBS_Sports_logo.svg/320px-CBS_Sports_logo.svg.png",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "fubo-nfl",
    title: "NFL Network",
    subtitle: "Good Morning Football & NFL GameDay",
    group: "Sports",
    source: "Live TV",
    provider: "fubo",
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/5/52/NFL_Network_logo.svg/320px-NFL_Network_logo.svg.png",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
];

export const slingPresetChannels: Media[] = [
  {
    id: "sling-cnn",
    title: "CNN Live",
    subtitle: "Breaking News, Politics & World Coverage",
    group: "News",
    source: "Live TV",
    provider: "sling",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/320px-CNN.svg.png",
    url: "https://live.sky.com/hls/live/2007281/skynews_slot1/index.m3u8",
  },
  {
    id: "sling-tnt",
    title: "TNT Sports",
    subtitle: "NBA on TNT, NHL & Blockbuster Movies",
    group: "Sports",
    source: "Live TV",
    provider: "sling",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/TNT_Logo_2016.svg/320px-TNT_Logo_2016.svg.png",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "sling-msnbc",
    title: "MSNBC",
    subtitle: "In-depth News Analysis & Prime Commentary",
    group: "News",
    source: "Live TV",
    provider: "sling",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/MSNBC_2021_logo.svg/320px-MSNBC_2021_logo.svg.png",
    url: "https://stream.france24.com/hls/live/2037554/F24_EN_LO_HLS/master.m3u8",
  },
  {
    id: "sling-history",
    title: "HISTORY Channel",
    subtitle: "Original Series, Documentaries & History",
    group: "Entertainment",
    source: "Live TV",
    provider: "sling",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/History_Logo.svg/320px-History_Logo.svg.png",
    url: "https://euronews-euronews-world-1-eu.rakuten.wurl.tv/playlist.m3u8",
  },
  {
    id: "sling-amc",
    title: "AMC",
    subtitle: "The Walking Dead, Classic Films & Acclaimed Dramas",
    group: "Entertainment",
    source: "Live TV",
    provider: "sling",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Amc_logo.svg/320px-Amc_logo.svg.png",
    url: "https://live-hls-web-aje.getaj.net/AJE/01.m3u8",
  },
];

export const defaultChannels: Media[] = [
  ...fuboPresetChannels,
  ...slingPresetChannels,
  {
    id: "redbull-tv",
    title: "Red Bull TV",
    subtitle: "Extreme Sports & Live Events",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "https://images.redbull.com/shape:fill,width:320,height:180/redbullcom/2020/6/17/i9gqg2p9h1wvvqg5fqb8/red-bull-tv-logo",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "sky-news",
    title: "Sky News Live",
    subtitle: "24/7 International Breaking News",
    group: "News",
    source: "Live TV",
    provider: "free",
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/Sky_News_2018.svg/320px-Sky_News_2018.svg.png",
    url: "https://live.sky.com/hls/live/2007281/skynews_slot1/index.m3u8",
  },
  {
    id: "nasa-tv",
    title: "NASA TV HD",
    subtitle: "Space Exploration & Live Missions",
    group: "Tech & Space",
    source: "Live TV",
    provider: "free",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/320px-NASA_logo.svg.png",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
  },
  {
    id: "euronews-en",
    title: "Euronews English",
    subtitle: "European & Global Perspectives",
    group: "News",
    source: "Live TV",
    provider: "free",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Euronews_2016_logo.svg/320px-Euronews_2016_logo.svg.png",
    url: "https://euronews-euronews-world-1-eu.rakuten.wurl.tv/playlist.m3u8",
  },
  {
    id: "france24-en",
    title: "France 24 English",
    subtitle: "Live International News from Paris",
    group: "News",
    source: "Live TV",
    provider: "free",
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/e/ec/France_24_logo.svg/320px-France_24_logo.svg.png",
    url: "https://stream.france24.com/hls/live/2037554/F24_EN_LO_HLS/master.m3u8",
  },
  {
    id: "aljazeera-en",
    title: "Al Jazeera English",
    subtitle: "In-depth World Coverage",
    group: "News",
    source: "Live TV",
    provider: "free",
    image: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Al_Jazeera_English_logo.svg/320px-Al_Jazeera_English_logo.svg.png",
    url: "https://live-hls-web-aje.getaj.net/AJE/01.m3u8",
  },
  {
    id: "bloomberg-quicktake",
    title: "Bloomberg Originals",
    subtitle: "Business, Finance & Tech Innovation",
    group: "Tech & Space",
    source: "Live TV",
    provider: "free",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Bloomberg_logo.svg/320px-Bloomberg_logo.svg.png",
    url: "https://liveproduseast.akamaized.net/us/Channel-HD-AWS-virginia-1/master.m3u8",
  },
  {
    id: "lofi-stream",
    title: "Lofi Beats & Relax",
    subtitle: "Non-stop Passenger Chillout Music",
    group: "Music",
    source: "Live TV",
    provider: "free",
    image: "/art/city.jpg",
    url: "https://playertest.longtailvideo.com/adaptive/oceans_aes/oceans_aes.m3u8",
  },
];
