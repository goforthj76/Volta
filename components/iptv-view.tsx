"use client";

import { useEffect, useRef, useState } from "react";
import {
  Radio,
  Search,
  Plus,
  Play,
  Upload,
  X,
  RotateCw,
  Tv,
  Zap,
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

function FuboIcon() {
  return (
    <svg viewBox="0 0 100 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: "16px", width: "auto" }} aria-hidden="true">
      <path d="M4 2h14v5H9v4h8v5H9v10H4V2z" fill="currentColor"/>
      <path d="M22 2h5v15c0 3.3 2.2 5 5 5s5-1.7 5-5V2h5v15c0 6.6-4.4 10-10 10s-10-3.4-10-10V2z" fill="currentColor"/>
      <path d="M41 2h10c4.5 0 8 3 8 7.5 0 2.5-1.2 4.6-3 5.8 2.6 1.1 4.5 3.5 4.5 6.7 0 5-4 8-9.5 8H41V2zm5 5v5h4.5c1.8 0 3.2-1.1 3.2-2.5S52.3 7 50.5 7H46zm0 9v7h5c2.1 0 3.8-1.4 3.8-3.5S53.1 16 51 16H46z" fill="currentColor"/>
      <path d="M74 2c7.2 0 13 5.8 13 13s-5.8 13-13 13-13-5.8-13-13 5.8-13 13-13zm0 5c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z" fill="currentColor"/>
    </svg>
  );
}

function SlingIcon() {
  return (
    <svg viewBox="0 0 105 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: "16px", width: "auto" }} aria-hidden="true">
      <circle cx="10" cy="9" r="6" fill="#ffaa00"/>
      <circle cx="10" cy="23" r="6" fill="#00a3e0"/>
      <path d="M28 7c-4 0-7 2-7 5.5 0 6 12 3.5 12 9.5 0 3.5-3 5-7 5-4.5 0-8-2-8-5.5h-4c0 6 5.5 9.5 12 9.5 6.5 0 11-3.5 11-9 0-6.5-12-4-12-10 0-3 2.5-4.5 6.5-4.5 3.5 0 7 1.5 7 4.5h4C45 8.5 40 7 28 7z" fill="currentColor"/>
      <path d="M50 2h4v27h-4V2z" fill="currentColor"/>
      <path d="M59 2h4v5h-4V2zm0 8h4v19h-4V10z" fill="currentColor"/>
      <path d="M68 10h4v3c1.2-2.2 3.5-3.5 6.5-3.5 5 0 8.5 3.8 8.5 9.5V29h-4V19c0-3.5-2-5.5-5.5-5.5-3.5 0-5.5 2-5.5 5.5v10h-4V10z" fill="currentColor"/>
      <path d="M91 10h4v2.5c1.2-2 3.5-3 6-3 6.5 0 10.5 4.5 10.5 10s-4 10-10.5 10c-2.5 0-4.8-1-6-3V34h-4V10zm4 9.5c0 3.5 2.5 6 6 6s6-2.5 6-6-2.5-6-6-6-6 2.5-6 6z" fill="currentColor"/>
    </svg>
  );
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
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [importTargetProvider, setImportTargetProvider] = useState<LiveTvProvider>("all");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync initialProvider prop changes
  useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider);
    }
  }, [initialProvider]);

  // Load custom saved playlist
  useEffect(() => {
    const saved = readLocal("volta.customChannels", "");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChannels([...parsed, ...defaultChannels]);
        }
      } catch {
        // Fallback to default
      }
    }
  }, []);

  async function handleImportUrl() {
    setErrorMsg("");
    setSuccessMsg("");
    const url = playlistUrl.trim();
    if (!url) {
      setErrorMsg("Please enter an M3U playlist URL, Xtream Codes link, or bridge stream URL.");
      return;
    }

    setLoading(true);
    try {
      let res = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null);
      if (!res || !res.ok) {
        // Retry through proxy if CORS or direct fetch fails
        res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(15000),
        });
      }
      if (!res.ok) throw new Error("Could not fetch playlist. Verify URL and server accessibility.");
      const text = await res.text();
      let parsed = parseCustomM3U(text, importTargetProvider);
      if (parsed.length === 0) {
        parsed = parseM3U(text).map(c => ({ ...c, provider: importTargetProvider }));
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
          parsed = parseM3U(text).map(c => ({ ...c, provider: importTargetProvider }));
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

  const activeProviderMeta = liveProviders.find(p => p.id === selectedProvider) || liveProviders[0];

  return (
    <div className="iptv-container">
      {/* Header */}
      <header className="iptv-header">
        <div className="iptv-brand">
          <div className="iptv-logo-box" style={{ background: activeProviderMeta.accent, borderColor: activeProviderMeta.color }}>
            {selectedProvider === "fubo" ? (
              <FuboIcon />
            ) : selectedProvider === "sling" ? (
              <SlingIcon />
            ) : (
              <Radio size={24} className="iptv-icon" style={{ color: activeProviderMeta.color }} />
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

        {/* Add Custom Playlist */}
        <div className="iptv-actions">
          <button
            className="add-playlist-btn"
            onClick={() => {
              setImportTargetProvider(selectedProvider);
              setCustomModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Connect {selectedProvider === "fubo" ? "Fubo" : selectedProvider === "sling" ? "Sling" : "M3U"} Stream</span>
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
                <span className="provider-tab-logo fubo-tab-logo"><FuboIcon /></span>
              ) : prov.id === "sling" ? (
                <span className="provider-tab-logo sling-tab-logo"><SlingIcon /></span>
              ) : prov.id === "free" ? (
                <span className="provider-tab-icon"><Zap size={15} style={{ color: prov.color }} /> Free Live TV</span>
              ) : (
                <span className="provider-tab-icon"><Tv size={15} style={{ color: prov.color }} /> All Providers</span>
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

      {/* Channels Grid */}
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

      {/* Custom Playlist / Provider Bridge Modal */}
      {customModalOpen && (
        <div className="detail-modal-overlay" onClick={() => setCustomModalOpen(false)}>
          <div className="iptv-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setCustomModalOpen(false)}>
              <X size={20} />
            </button>

            <div className="iptv-modal-header">
              <div className="iptv-logo-box large">
                {importTargetProvider === "fubo" ? (
                  <FuboIcon />
                ) : importTargetProvider === "sling" ? (
                  <SlingIcon />
                ) : (
                  <Radio size={28} />
                )}
              </div>
              <h3>Connect {importTargetProvider === "fubo" ? "Fubo TV" : importTargetProvider === "sling" ? "Sling TV" : "Custom IPTV"} Stream</h3>
              <p>
                Add your legitimate {importTargetProvider === "fubo" ? "Fubo bridge (vlc-bridge-fubo)" : importTargetProvider === "sling" ? "Sling TVE / Channels DVR" : "M3U / Xtream Codes"} live stream URL. Channels render in real-time passenger Drive Mode!
              </p>
            </div>

            {errorMsg && <div className="login-error-alert">{errorMsg}</div>}
            {successMsg && <div className="login-success-alert">{successMsg}</div>}

            <div className="form-group">
              <label>Assign to Provider:</label>
              <select
                className="provider-select-dropdown"
                value={importTargetProvider}
                onChange={(e) => setImportTargetProvider(e.target.value as LiveTvProvider)}
              >
                <option value="all">All Providers</option>
                <option value="fubo">Fubo TV</option>
                <option value="sling">Sling TV</option>
                <option value="free">Free Live TV</option>
              </select>
            </div>

            <div className="form-group">
              <label>Playlist URL / M3U8 Stream URL</label>
              <input
                type="url"
                placeholder={
                  importTargetProvider === "fubo"
                    ? "http://your-home-ip:7777/fubo/playlist.m3u or m3u8 link"
                    : importTargetProvider === "sling"
                      ? "http://your-dvr-ip:8089/devices/ANY/channels.m3u"
                      : "https://example.com/playlist.m3u"
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
