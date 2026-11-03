import { Media } from "./media";

export type ChannelCategory =
  | "All"
  | "Sports"
  | "News"
  | "Entertainment"
  | "Movies"
  | "Tech & Space";

export type LiveTvProvider = "all" | "free" | "fubo" | "sling";

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
    name: "Live TV",
    tagline: "100% Free Verified Live HD Channels",
    color: "#38bdf8",
    accent: "rgba(56, 189, 248, 0.15)",
  },
];

// Unified default lineup - 100% verified HTTP 200 M3U8 streams with AAC audio
// Recognizable sports, news, and entertainment prioritized
export const defaultChannels: Media[] = [
  // Recognizable Sports Priority Lineup
  {
    id: "nfl-channel",
    title: "NFL Channel HD",
    subtitle: "Game Highlights, NFL Total Access & Classic Super Bowls",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "/nfl-logo.svg",
    url: "https://jmp2.uk/plu-5ced7d5df64be98e07ed47b6.m3u8",
  },
  {
    id: "nba-tv-hd",
    title: "NBA TV HD",
    subtitle: "24/7 Live Basketball, Game Previews, Analysis & Classics",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "/nba-logo.svg",
    url: "https://amg00556-amg00556c3-firetv-us-6060.playouts.now.amagi.tv/playlist.m3u8",
  },
  {
    id: "cbs-sports-golazo",
    title: "CBS Sports Golazo Network",
    subtitle: "Live UEFA Champions League, Serie A & Global Soccer",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "/cbssports-logo.svg",
    url: "https://dai.google.com/linear/hls/event/7f3Wv6f7QEKfQna22jHqLQ/master.m3u8",
  },
  {
    id: "nbc-sports-now",
    title: "NBC Sports NOW",
    subtitle: "Live Sports News, Pro Football Talk & Studio Analysis",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "/nbcsports-logo.svg",
    url: "https://jmp2.uk/plu-6549306c83595c000815a696.m3u8",
  },
  {
    id: "stadium-network",
    title: "Stadium Sports Network",
    subtitle: "Live College Sports, Highlights & Daily Studio Shows",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "/stadium-logo.svg",
    url: "https://wurl120sports.global.transmit.live/hls/679a907dce42a042c23ace37/v1/stadium_gracenote/samsung_us/latest/main/hls/playlist.m3u8",
  },
  {
    id: "sportsgrid-live",
    title: "SportsGrid Live",
    subtitle: "Real-time Sports Odds, Pregame & Game Day Feeds",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "https://p-img.movetv.com/cms/images/d59e5fba6d605c9c8b8ec012c238898a7b8552d6.png",
    url: "https://sportsgrid-tribal.amagi.tv/playlist.m3u8",
  },
  {
    id: "fubo-sports-network",
    title: "Fubo Sports Network HD",
    subtitle: "Live Soccer, Motorsports, MMA & Daily Sports Analysis",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "https://p-img.movetv.com/1280x720/7e81634f07da663019d668e9aa6ffbfc.png",
    url: "https://dnf08l6u6uxnz.cloudfront.net/master.m3u8",
  },
  {
    id: "world-poker-tour",
    title: "World Poker Tour HD",
    subtitle: "High Stakes Championship Poker Tournaments",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "https://p-img.movetv.com/cms/images/78a3990255dbbb4e0690755cd4c5efc8fe66d69f.png",
    url: "https://jmp2.uk/plu-5ad9b7aae738977e2c312132.m3u8",
  },
  {
    id: "redbull-tv",
    title: "Red Bull TV HD",
    subtitle: "Motorsports, Mountain Biking & Action Sports",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "/redbull-logo.svg",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "pfl-mma",
    title: "PFL MMA Live",
    subtitle: "Professional Fighters League Heavyweight Bouts & Knockouts",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "https://images.pluto.tv/channels/64f6180130ab3300083d896b/colorLogoPNG.png",
    url: "https://jmp2.uk/plu-64f6180130ab3300083d896b.m3u8",
  },
  {
    id: "bellator-mma",
    title: "Bellator MMA Network",
    subtitle: "Full Fight Replays, Prelims & Championship Battles",
    group: "Sports",
    source: "Live TV",
    provider: "free",
    image: "https://images.pluto.tv/channels/5ebc8688f3697d00072f7cf8/colorLogoPNG.png",
    url: "https://jmp2.uk/plu-5ebc8688f3697d00072f7cf8.m3u8",
  },

  // Major News Channels
  {
    id: "abc-news-live",
    title: "ABC News Live HD",
    subtitle: "24/7 Breaking US & World News Coverage",
    group: "News",
    source: "Live TV",
    provider: "free",
    image: "https://p-img.movetv.com/cms/images/9c9407a0ce3dc37b64d99077f0088d3f6cb8c4a8.png",
    url: "https://abcnews-streams.akamaized.net/hls/live/2023560/abcnewshudson1/master.m3u8",
  },
  {
    id: "cbs-news-live",
    title: "CBS News 24/7",
    subtitle: "Live National Breaking News, Politics & Prime Analysis",
    group: "News",
    source: "Live TV",
    provider: "free",
    image: "https://images.pluto.tv/channels/6350fdd266e9ea0007bedec5/colorLogoPNG.png",
    url: "https://jmp2.uk/plu-6350fdd266e9ea0007bedec5.m3u8",
  },
  {
    id: "cheddar-news",
    title: "Cheddar Business News",
    subtitle: "Market Open, Tech Trends & Financial Insights",
    group: "News",
    source: "Live TV",
    provider: "free",
    image: "https://p-img.movetv.com/cms/images/7e4ab4a82bec747831154b7b077d0f7398fddeef.png",
    url: "https://hls.livecdn.io/cheddar.com/cheddar/playlist.m3u8",
  },
  {
    id: "accuweather-now",
    title: "AccuWeather NOW",
    subtitle: "Live Severe Weather Tracking & Local Forecasts",
    group: "News",
    source: "Live TV",
    provider: "free",
    image: "https://p-img.movetv.com/images/769138892de20c374bd6fcc75f0a14009de6f7a2",
    url: "https://accuweather-xumo.amagi.tv/playlist.m3u8",
  },

  // Top Entertainment & Movies
  {
    id: "comedy-central-pluto",
    title: "Comedy Central Pluto",
    subtitle: "Stand-Up Comedy Specials, Roasts & Hit Sketches",
    group: "Entertainment",
    source: "Live TV",
    provider: "free",
    image: "https://images.pluto.tv/channels/5f357e91b18f0b00073583d2/colorLogoPNG.png",
    url: "https://jmp2.uk/plu-5f357e91b18f0b00073583d2.m3u8",
  },
  {
    id: "00s-replay-hits",
    title: "00s Replay Hits",
    subtitle: "Favorite Throwback Series & Hit Shows",
    group: "Entertainment",
    source: "Live TV",
    provider: "free",
    image: "https://images.pluto.tv/channels/62ba60f059624e000781c436/colorLogoPNG.png",
    url: "https://jmp2.uk/plu-62ba60f059624e000781c436.m3u8",
  },
  {
    id: "classic-movies-channel",
    title: "Classic Movies Channel",
    subtitle: "Hollywood Gold, Westerns, Noir & Film History",
    group: "Movies",
    source: "Live TV",
    provider: "free",
    image: "https://b-img.movetv.com/1280x720/66935242505f17b87bdafd710c54b86c.png",
    url: "https://jmp2.uk/plu-561c5b0dada51f8004c4d855.m3u8",
  },
  {
    id: "crime-drama-tv",
    title: "Classic TV Crime Drama",
    subtitle: "Iconic Police Detectives, Mystery & Courtroom Thrillers",
    group: "Entertainment",
    source: "Live TV",
    provider: "free",
    image: "https://images.pluto.tv/channels/61325c4f982acd000723287e/colorLogoPNG.png",
    url: "https://jmp2.uk/plu-61325c4f982acd000723287e.m3u8",
  },
  {
    id: "nasa-tv",
    title: "NASA TV HD",
    subtitle: "Space Station Live, Rocket Launches & Earth Views",
    group: "Tech & Space",
    source: "Live TV",
    provider: "free",
    image: "/nasa-logo.svg",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
  },
];

export const fuboPresetChannels: Media[] = defaultChannels.filter(
  (c) => c.group === "Sports"
);

export const slingPresetChannels: Media[] = defaultChannels.filter(
  (c) => c.group !== "Sports"
);
