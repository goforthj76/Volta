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
} from "lucide-react";
import { Media, parseM3U } from "@/lib/media";
import { defaultChannels, ChannelCategory } from "@/lib/channels";
import { readLocal, writeLocal } from "@/lib/storage";

const categories: ChannelCategory[] = [
  "All",
  "Sports",
  "News",
  "Tech & Space",
  "Music",
];

function parseCustomM3U(input: string): Media[] {
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
}: {
  onPlay: (media: Media) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [channels, setChannels] = useState<Media[]>(defaultChannels);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setErrorMsg("Please enter an M3U playlist URL or Xtream Codes live URL.");
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
      let parsed = parseCustomM3U(text);
      if (parsed.length === 0) {
        parsed = parseM3U(text);
      }
      if (parsed.length === 0) throw new Error("No playable channels found in playlist.");

      const updated = [...parsed, ...defaultChannels];
      setChannels(updated);
      writeLocal("volta.customChannels", JSON.stringify(parsed));
      setSuccessMsg(`Successfully imported ${parsed.length} channels!`);
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
        let parsed = parseCustomM3U(text);
        if (parsed.length === 0) {
          parsed = parseM3U(text);
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
    const matchesCategory =
      selectedCategory === "All" ||
      c.group?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subtitle?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="iptv-container">
      {/* Header */}
      <header className="iptv-header">
        <div className="iptv-brand">
          <div className="iptv-logo-box">
            <Radio size={24} className="iptv-icon" />
          </div>
          <div className="iptv-brand-title">
            <h2>LIVE IPTV</h2>
            <span className="iptv-sub">TESLA PASSENGER IN-MOTION READY</span>
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
            onClick={() => setCustomModalOpen(true)}
          >
            <Plus size={16} />
            <span>Add M3U / Xtream</span>
          </button>
        </div>
      </header>

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
              : `${selectedCategory} Channels`}
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
                <span className="channel-group-tag">{channel.group || "Live TV"}</span>
                <h4 title={channel.title}>{channel.title}</h4>
                <p className="channel-sub" title={channel.subtitle}>
                  {channel.subtitle || "HLS In-Motion Live Stream"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Custom Playlist Modal */}
      {customModalOpen && (
        <div className="detail-modal-overlay" onClick={() => setCustomModalOpen(false)}>
          <div className="iptv-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setCustomModalOpen(false)}>
              <X size={20} />
            </button>

            <div className="iptv-modal-header">
              <div className="iptv-logo-box large">
                <Radio size={28} />
              </div>
              <h3>Import Custom IPTV Playlist</h3>
              <p>
                Add your own M3U, M3U8, or Xtream Codes live playlist link. Channels are saved to your Tesla browser.
              </p>
            </div>

            {errorMsg && <div className="login-error-alert">{errorMsg}</div>}
            {successMsg && <div className="login-success-alert">{successMsg}</div>}

            <div className="form-group">
              <label>Playlist URL / Xtream Codes URL</label>
              <input
                type="url"
                placeholder="https://example.com/playlist.m3u or http://host/get.php?..."
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
              />
            </div>

            <button
              className="submit-login-btn"
              onClick={() => void handleImportUrl()}
              disabled={loading}
            >
              {loading ? "Importing…" : "Import via URL"}
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
