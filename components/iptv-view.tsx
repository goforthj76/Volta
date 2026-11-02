"use client";

import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Play,
  Upload,
  X,
  RotateCw,
  Tv,
  Zap,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { Media, parseM3U } from "@/lib/media";
import {
  defaultChannels,
  ChannelCategory,
  LiveTvProvider,
  liveProviders,
} from "@/lib/channels";
import { readLocal, writeLocal } from "@/lib/storage";

const categories: ChannelCategory[] = [
  "All",
  "Sports",
  "News",
  "Entertainment",
  "Tech & Space",
  "Music",
];

// Simulated dynamic EPG Guide programs based on real time
function getSimulatedEPG(channel: Media): { current: string; next: string; progressPercent: number; timeRange: string } {
  const now = new Date();
  const minute = now.getMinutes();
  const hour = now.getHours();
  const progressPercent = Math.min(100, Math.round(((minute % 30) / 30) * 100));

  const startH = (hour % 12 || 12);
  const startM = minute < 30 ? "00" : "30";
  const endM = minute < 30 ? "30" : "00";
  const endH = minute < 30 ? startH : ((hour + 1) % 12 || 12);
  const ampm = hour >= 12 ? "PM" : "AM";
  const timeRange = `${startH}:${startM} - ${endH}:${endM} ${ampm}`;

  const title = channel.title.toLowerCase();

  if (title.includes("fubo sports")) {
    return {
      current: "The Cooligans: Soccer, MLS & Premier League Weekly",
      next: "No Chill with Gilbert Arenas & NBA Live",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("stadium")) {
    return {
      current: "Inside College Football: Game Day Spotlight & Highlights",
      next: "NCAA Basketball Live Shootaround",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("sportsgrid")) {
    return {
      current: "The Early Line: NFL & College Spread Analytics",
      next: "Game Day Live Odds & Prop Bets",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("poker")) {
    return {
      current: "WPT World Championship: High Roller Final Table",
      next: "Poker Night in America: Legends Clash",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("red bull")) {
    return {
      current: "Red Bull Rampage: Extreme Mountain Downhill",
      next: "Formula 1 Circuit Breakdown & Aerodynamics",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("abc news")) {
    return {
      current: "ABC News Live Prime: Breaking US & World Desk",
      next: "The Breakdown: Investigative Report",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("cbs news")) {
    return {
      current: "CBS News 24/7: America Tonight & Capitol Update",
      next: "Eye on the Economy & Global Markets",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("cheddar")) {
    return {
      current: "Cheddar Closing Bell: Tech Giants & EV Markets",
      next: "Fintech Revolution & Venture Showcase",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("weathernation")) {
    return {
      current: "Live National Radar: Severe Storm & Interstate Watch",
      next: "Coast-to-Coast 7-Day Forecast",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("movie central")) {
    return {
      current: "Prime Action Showcase: High-Octane Thrillers",
      next: "Midnight Cinema: Sci-Fi Cult Classics",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("00s replay")) {
    return {
      current: "Throwback Prime: 2000s Hits & Drama Marathons",
      next: "Classic Comedy Spotlight",
      progressPercent,
      timeRange,
    };
  }
  if (title.includes("nasa")) {
    return {
      current: "ISS Live: Earth Views & Astronaut Mission Log",
      next: "Artemis Lunar Launch Engineering Preview",
      progressPercent,
      timeRange,
    };
  }

  return {
    current: `${channel.title}: Live Broadcasting & Features`,
    next: `${channel.title}: Evening Prime Lineup`,
    progressPercent,
    timeRange,
  };
}

function parseCustomM3U(input: string, provider: LiveTvProvider = "all"): Media[] {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  const out: Media[] = [];
  let info = "";
  for (const line of lines) {
    const s = line.trim();
    if (s.startsWith("#EXTINF:")) info = s;
    else if (s && !s.startsWith("#") && info) {
      if (s.startsWith("http://") || s.startsWith("https://")) {
        const name = info.slice(info.lastIndexOf(",") + 1).trim();
        const attr = (key: string) => info.match(new RegExp(`${key}="([^"]*)"`))?.[1];
        out.push({
          id: `channel-${out.length}-${name}`,
          title: name || "Unnamed Channel",
          subtitle: attr("group-title") || "Live Television",
          group: attr("group-title") || "Other",
          provider,
          epgId: attr("tvg-id"),
          image: attr("tvg-logo") || "",
          source: "Live TV",
          url: s,
        });
      }
      info = "";
    }
  }
  return out;
}

export default function IptvView({
  onPlay,
  initialProvider = "all",
}: {
  onPlay: (media: Media) => void;
  initialProvider?: LiveTvProvider;
}) {
  const [selectedProvider, setSelectedProvider] = useState<LiveTvProvider>(initialProvider);
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [channels, setChannels] = useState<Media[]>(defaultChannels);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"epg" | "grid">("epg");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [importTargetProvider, setImportTargetProvider] = useState<LiveTvProvider>("all");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider);
    }
  }, [initialProvider]);

  useEffect(() => {
    const saved = readLocal("volta.customChannels", "");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChannels([...parsed, ...defaultChannels]);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  async function handleImportUrl() {
    setErrorMsg("");
    setSuccessMsg("");
    const url = playlistUrl.trim();
    if (!url) {
      setErrorMsg("Please enter an M3U playlist URL, Xtream link, or bridge stream URL.");
      return;
    }

    setLoading(true);
    try {
      let res = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(15000),
        });
      }
      if (!res.ok) throw new Error("Could not fetch playlist. Verify URL and server accessibility.");
      const text = await res.text();
      let parsed = parseCustomM3U(text, importTargetProvider);
      if (parsed.length === 0) {
        parsed = parseM3U(text).map((c) => ({ ...c, provider: importTargetProvider }));
      }
      if (parsed.length === 0) throw new Error("No playable channels found in playlist.");

      const updated = [...parsed, ...defaultChannels];
      setChannels(updated);
      writeLocal("volta.customChannels", JSON.stringify(parsed));
      setSuccessMsg(`Successfully imported ${parsed.length} channels for ${importTargetProvider.toUpperCase()}!`);
      setTimeout(() => {
        setCustomModalOpen(false);
        setPlaylistUrl("");
      }, 1400);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to import playlist. If CORS is blocked, try uploading the .m3u file directly.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg("");
    setSuccessMsg("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let parsed = parseCustomM3U(text, importTargetProvider);
        if (parsed.length === 0) {
          parsed = parseM3U(text).map((c) => ({ ...c, provider: importTargetProvider }));
        }
        if (parsed.length === 0) throw new Error("No channels found in file.");
        const updated = [...parsed, ...defaultChannels];
        setChannels(updated);
        writeLocal("volta.customChannels", JSON.stringify(parsed));
        setSuccessMsg(`Imported ${parsed.length} channels from file!`);
        setTimeout(() => setCustomModalOpen(false), 1400);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Invalid M3U file.";
        setErrorMsg(msg);
      }
    };
    reader.readAsText(file);
  }

  function clearCustomPlaylist() {
    writeLocal("volta.customChannels", "");
    setChannels(defaultChannels);
    setSuccessMsg("Reset to verified default channels.");
    setTimeout(() => setSuccessMsg(""), 2000);
  }

  const filtered = channels.filter((c) => {
    const matchesProvider =
      selectedProvider === "all" ||
      !c.provider ||
      c.provider === "all" ||
      c.provider.toLowerCase() === selectedProvider.toLowerCase();

    const matchesCategory =
      selectedCategory === "All" ||
      c.group?.toLowerCase() === selectedCategory.toLowerCase();

    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesProvider && matchesCategory && matchesSearch;
  });

  const activeProviderMeta = liveProviders.find((p) => p.id === selectedProvider) || liveProviders[0];

  return (
    <div className="iptv-container">
      {/* Header */}
      <header className="iptv-header">
        <div className="iptv-brand">
          <div
            className="iptv-logo-box"
            style={{
              background: activeProviderMeta.accent,
              borderColor: activeProviderMeta.color,
            }}
          >
            {selectedProvider === "fubo" ? (
              <img src="/fubo-logo.svg" alt="Fubo" style={{ height: "18px", width: "auto", filter: "invert(42%) sepia(98%) saturate(1450%) hue-rotate(360deg) brightness(102%) contrast(105%)" }} />
            ) : selectedProvider === "sling" ? (
              <img src="/sling-logo.svg" alt="Sling" style={{ height: "18px", width: "auto" }} />
            ) : (
              <Zap size={22} className="iptv-icon" style={{ color: activeProviderMeta.color }} />
            )}
          </div>
          <div className="iptv-brand-title">
            <h2>{activeProviderMeta.name.toUpperCase()}</h2>
            <span className="iptv-sub">{activeProviderMeta.tagline} · PASSENGER DRIVING READY</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="iptv-search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search live channels, sports, news…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery("")}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Actions & Guide View Toggle */}
        <div className="iptv-actions">
          <div className="view-toggle-capsule">
            <button
              className={`view-pill ${viewMode === "epg" ? "active" : ""}`}
              onClick={() => setViewMode("epg")}
              title="EPG TV Guide Schedule"
            >
              <Calendar size={14} />
              <span>TV Guide</span>
            </button>
            <button
              className={`view-pill ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Channel Grid Cards"
            >
              <Tv size={14} />
              <span>Grid</span>
            </button>
          </div>

          <button
            className="add-playlist-btn"
            onClick={() => {
              setImportTargetProvider(selectedProvider);
              setCustomModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Connect Stream</span>
          </button>
        </div>
      </header>

      {/* Live Provider Switcher Tabs (Fubo, Sling, Free Live TV, All) */}
      <div className="iptv-provider-switcher">
        {liveProviders.map((prov) => {
          const isActive = selectedProvider === prov.id;
          return (
            <button
              key={prov.id}
              className={`provider-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => setSelectedProvider(prov.id)}
              style={{
                borderColor: isActive ? prov.color : undefined,
                color: isActive ? "#ffffff" : undefined,
                background: isActive ? prov.accent : undefined,
              }}
            >
              {prov.id === "fubo" ? (
                <span className="provider-tab-logo fubo-tab-logo">
                  <img src="/fubo-logo.svg" alt="Fubo" style={{ height: "16px", width: "auto", filter: "invert(42%) sepia(98%) saturate(1450%) hue-rotate(360deg) brightness(102%) contrast(105%)" }} />
                </span>
              ) : prov.id === "sling" ? (
                <span className="provider-tab-logo sling-tab-logo">
                  <img src="/sling-logo.svg" alt="Sling" style={{ height: "16px", width: "auto" }} />
                </span>
              ) : prov.id === "free" ? (
                <span className="provider-tab-icon">
                  <Zap size={15} style={{ color: prov.color }} /> Free Live TV
                </span>
              ) : (
                <span className="provider-tab-icon">
                  <Tv size={15} style={{ color: prov.color }} /> All Providers
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Categories */}
      <div className="iptv-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-pill ${selectedCategory === cat ? "active" : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Channel View: Professional EPG Guide vs Visual Grid */}
      {viewMode === "epg" ? (
        <section className="epg-guide-section">
          <div className="iptv-section-title">
            <div className="epg-title-block">
              <h3>
                {searchQuery
                  ? `Channels matching "${searchQuery}"`
                  : `${activeProviderMeta.name} — Interactive TV Guide`}
              </h3>
              <span className="live-clock-badge">
                <Clock size={13} />
                <span>REAL-TIME ON-AIR SCHEDULE</span>
              </span>
            </div>
            <span className="channel-count">{filtered.length} verified streams</span>
          </div>

          <div className="epg-table-wrapper">
            <div className="epg-table-header">
              <div className="col-channel">CHANNEL</div>
              <div className="col-schedule">ON AIR NOW (LIVE)</div>
              <div className="col-action">ACTION</div>
            </div>

            <div className="epg-channel-rows">
              {filtered.map((channel) => {
                const epg = getSimulatedEPG(channel);
                return (
                  <div
                    key={channel.id}
                    className="epg-row"
                    onClick={() => onPlay(channel)}
                  >
                    {/* Left: Channel Identity */}
                    <div className="col-channel">
                      <div className="epg-channel-badge">
                        <img
                          src={channel.image || "/art/hero.jpg"}
                          alt={channel.title}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/art/hero.jpg";
                          }}
                        />
                      </div>
                      <div className="epg-channel-text">
                        <div className="channel-tags-row">
                          <span className="channel-group-tag">{channel.group || "Live TV"}</span>
                          {channel.provider && channel.provider !== "all" && (
                            <span
                              className="channel-provider-tag"
                              style={{
                                color: channel.provider === "fubo" ? "#ff5900" : channel.provider === "sling" ? "#00a3e0" : "#34d399",
                                borderColor: channel.provider === "fubo" ? "rgba(255, 89, 0, 0.4)" : channel.provider === "sling" ? "rgba(0, 163, 224, 0.4)" : "rgba(52, 211, 153, 0.4)",
                              }}
                            >
                              {channel.provider.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <h4 className="epg-channel-name">{channel.title}</h4>
                      </div>
                    </div>

                    {/* Middle: Live Program & Timeline Progress */}
                    <div className="col-schedule">
                      <div className="epg-program-info">
                        <div className="epg-program-title-row">
                          <span className="epg-live-dot" />
                          <strong className="epg-program-name">{epg.current}</strong>
                          <span className="epg-time-range">{epg.timeRange}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="epg-progress-bar-bg">
                          <div
                            className="epg-progress-bar-fill"
                            style={{ width: `${epg.progressPercent}%` }}
                          />
                        </div>

                        <div className="epg-upcoming-row">
                          <span className="upcoming-label">NEXT:</span>
                          <span className="upcoming-title">{epg.next}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Instant Play Button */}
                    <div className="col-action">
                      <button
                        className="epg-play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPlay(channel);
                        }}
                      >
                        <Play size={16} fill="currentColor" />
                        <span>Watch Live</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        /* Visual Cards Grid */
        <section className="iptv-grid-section">
          <div className="iptv-section-title">
            <h3>
              {searchQuery
                ? `Channels matching "${searchQuery}"`
                : `${selectedCategory} Channels (${activeProviderMeta.name})`}
            </h3>
            <span className="channel-count">{filtered.length} live streams</span>
          </div>

          <div className="channels-grid">
            {filtered.map((channel) => (
              <div
                key={channel.id}
                className="channel-card"
                onClick={() => onPlay(channel)}
              >
                <div className="channel-logo-wrapper">
                  <img
                    src={channel.image || "/art/hero.jpg"}
                    alt={channel.title}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/art/hero.jpg";
                    }}
                  />
                  <div className="channel-live-indicator">
                    <span className="live-pulse" />
                    <span>LIVE</span>
                  </div>
                  <div className="channel-hover-play">
                    <Play size={28} fill="currentColor" />
                  </div>
                </div>

                <div className="channel-details">
                  <div className="channel-tags-row">
                    <span className="channel-group-tag">{channel.group || "Live TV"}</span>
                    {channel.provider && channel.provider !== "all" && (
                      <span
                        className="channel-provider-tag"
                        style={{
                          color: channel.provider === "fubo" ? "#ff5900" : channel.provider === "sling" ? "#00a3e0" : "#34d399",
                          borderColor: channel.provider === "fubo" ? "rgba(255, 89, 0, 0.4)" : channel.provider === "sling" ? "rgba(0, 163, 224, 0.4)" : "rgba(52, 211, 153, 0.4)",
                        }}
                      >
                        {channel.provider.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h4 title={channel.title}>{channel.title}</h4>
                  <p className="channel-sub" title={channel.subtitle}>
                    {channel.subtitle || "HLS In-Motion Live Stream"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Custom Playlist / TVE Bridge Stream Modal */}
      {customModalOpen && (
        <div className="detail-modal-overlay" onClick={() => setCustomModalOpen(false)}>
          <div className="iptv-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setCustomModalOpen(false)}>
              <X size={20} />
            </button>

            <div className="iptv-modal-header">
              <div className="iptv-logo-box large">
                <Sparkles size={28} style={{ color: "#38bdf8" }} />
              </div>
              <h3>Connect Live Stream / Bridge Link</h3>
              <p>
                Add your local TVE bridge stream (vlc-bridge-fubo / Channels DVR) or any legitimate M3U8 link. Plays inside Volta with full passenger Drive Mode!
              </p>
            </div>

            {errorMsg && <div className="login-error-alert">{errorMsg}</div>}
            {successMsg && <div className="login-success-alert">{successMsg}</div>}

            <div className="form-group">
              <label>Assign to Section:</label>
              <select
                className="provider-select-dropdown"
                value={importTargetProvider}
                onChange={(e) => setImportTargetProvider(e.target.value as LiveTvProvider)}
              >
                <option value="all">All Channels</option>
                <option value="fubo">Fubo TV</option>
                <option value="sling">Sling TV</option>
                <option value="free">Free Live TV</option>
              </select>
            </div>

            <div className="form-group">
              <label>Stream URL / M3U8 Playlist URL</label>
              <input
                type="url"
                placeholder={
                  importTargetProvider === "fubo"
                    ? "http://your-home-ip:7777/fubo/playlist.m3u"
                    : importTargetProvider === "sling"
                      ? "http://your-dvr-ip:8089/devices/ANY/channels.m3u"
                      : "https://example.com/playlist.m3u8"
                }
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
              />
            </div>

            <button
              className="submit-login-btn"
              onClick={() => void handleImportUrl()}
              disabled={loading}
            >
              {loading ? "Importing…" : "Import & Connect Channels"}
            </button>

            <div className="divider-text">
              <span>OR UPLOAD LOCAL M3U FILE</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".m3u,.m3u8,text/plain"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />

            <button
              className="file-upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={18} />
              <span>Choose .M3U File from Device</span>
            </button>

            <div className="modal-footer-actions">
              <button className="reset-channels-btn" onClick={clearCustomPlaylist}>
                <RotateCw size={14} />
                <span>Reset to Verified Defaults</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
