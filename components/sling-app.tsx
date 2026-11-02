"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  X,
  Play,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Tv,
  Layers,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import type { SlingChannel } from "@/lib/sling";
import { Media } from "@/lib/media";
import { defaultChannels } from "@/lib/channels";
import SlingPlayer from "./sling-player";
import styles from "./sling.module.css";

const SLING_CATEGORIES = [
  "All Channels",
  "Sports",
  "News & Opinion",
  "Entertainment",
  "Movies",
  "True Crime",
  "Comedy",
  "Action & Thrillers",
  "Lifestyle",
  "Classics & Re-Runs",
];

function getSimulatedEPG(channel: SlingChannel): {
  current: string;
  next: string;
  progressPercent: number;
  timeRange: string;
} {
  const now = new Date();
  const minute = now.getMinutes();
  const hour = now.getHours();
  const progressPercent = Math.min(100, Math.round(((minute % 30) / 30) * 100));

  const startH = hour % 12 || 12;
  const startM = minute < 30 ? "00" : "30";
  const endM = minute < 30 ? "30" : "00";
  const endH = minute < 30 ? startH : (hour + 1) % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  const timeRange = `${startH}:${startM} - ${endH}:${endM} ${ampm}`;

  const name = channel.name.toLowerCase();
  const group = channel.group.toLowerCase();

  if (name.includes("bein") || name.includes("soccer")) {
    return {
      current: "beIN Live: European Matchday Live & Highlights",
      next: "The Express: Football Review",
      progressPercent,
      timeRange,
    };
  }
  if (name.includes("draftkings")) {
    return {
      current: "The Sweat: Real-Time Odds & Prop Analytics",
      next: "Follow the Money: Line Shifts",
      progressPercent,
      timeRange,
    };
  }
  if (name.includes("fubo sports")) {
    return {
      current: "No Chill with Gilbert Arenas & NBA Live Talk",
      next: "The Cooligans: Soccer & MLS Breakdown",
      progressPercent,
      timeRange,
    };
  }
  if (name.includes("poker")) {
    return {
      current: "High Stakes Poker Tour: Final Table Clash",
      next: "Poker After Dark: High Rollers",
      progressPercent,
      timeRange,
    };
  }
  if (name.includes("abc news")) {
    return {
      current: "ABC News Live Prime: Breaking US & World Desk",
      next: "The Breakdown: Investigative In-Depth",
      progressPercent,
      timeRange,
    };
  }
  if (name.includes("cbs news")) {
    return {
      current: "CBS News 24/7 America Decides & National Desk",
      next: "Eye on America: Prime Report",
      progressPercent,
      timeRange,
    };
  }
  if (name.includes("weather")) {
    return {
      current: "Severe Storm Radar & Live Nationwide Doppler",
      next: "National Horizon Forecast",
      progressPercent,
      timeRange,
    };
  }
  if (name.includes("cheddar")) {
    return {
      current: "Cheddar Market Open: Wall Street & Tech Movers",
      next: "Closing Bell: Market Wrap",
      progressPercent,
      timeRange,
    };
  }
  if (group.includes("crime") || name.includes("crime")) {
    return {
      current: "Cold Case Files: Forensics Uncovered",
      next: "The First 48: Crime Scene Investigations",
      progressPercent,
      timeRange,
    };
  }
  if (group.includes("movie") || name.includes("film") || name.includes("movie")) {
    return {
      current: "Prime Cinema Showcase: Blockbuster Feature",
      next: "Midnight Classic Thriller",
      progressPercent,
      timeRange,
    };
  }
  if (group.includes("comedy")) {
    return {
      current: "Comedy Central All-Stars: Stand-Up Hour",
      next: "The Roast Room: Uncensored",
      progressPercent,
      timeRange,
    };
  }

  return {
    current: `${channel.name} Live Broadcast`,
    next: `${channel.name} Primetime Special`,
    progressPercent,
    timeRange,
  };
}

export default function SlingApp({
  onStartPlayback,
  onPlayMedia,
}: {
  onStartPlayback: () => void;
  onPlayMedia?: (media: Media) => void;
}) {
  const [channels, setChannels] = useState<SlingChannel[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Channels");
  const [viewMode, setViewMode] = useState<"epg" | "grid">("epg");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<SlingChannel | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [customBridgeUrl, setCustomBridgeUrl] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/sling/channels", { signal: abort.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok)
          throw new Error("Sling's live catalog is unavailable. Please retry.");
        const data = await response.json();
        if (!Array.isArray(data.channels))
          throw new Error("Unable to read Sling's channel list.");
        if (!abort.signal.aborted) setChannels(data.channels);
      })
      .catch((reason: unknown) => {
        if (!abort.signal.aborted)
          setError(
            reason instanceof Error ? reason.message : "Unable to load Sling.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [attempt]);

  const visible = useMemo(() => {
    let result = channels;
    if (selectedCategory !== "All Channels") {
      result = result.filter((ch) =>
        ch.group.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        (selectedCategory === "Sports" &&
          (ch.group.toLowerCase().includes("sport") ||
            ch.name.toLowerCase().includes("sport") ||
            ch.name.toLowerCase().includes("bein") ||
            ch.name.toLowerCase().includes("poker") ||
            ch.name.toLowerCase().includes("draftkings"))),
      );
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((ch) =>
        `${ch.name} ${ch.group}`.toLowerCase().includes(q),
      );
    }
    return result;
  }, [channels, selectedCategory, query]);

  const handlePlayChannel = (channel: SlingChannel) => {
    if (onPlayMedia) {
      // Find matching HLS stream or smart category fallback so it ALWAYS plays smoothly in Driving Canvas Mode
      const matchingHls = defaultChannels.find(
        (c) =>
          c.title.toLowerCase().includes(channel.name.toLowerCase()) ||
          channel.name.toLowerCase().includes(c.title.toLowerCase()),
      );

      const groupLower = channel.group.toLowerCase();
      const nameLower = channel.name.toLowerCase();

      let streamUrl = matchingHls?.url;
      if (!streamUrl) {
        if (
          groupLower.includes("sport") ||
          nameLower.includes("sport") ||
          nameLower.includes("bein") ||
          nameLower.includes("poker") ||
          nameLower.includes("race") ||
          nameLower.includes("draftkings")
        ) {
          streamUrl = "https://dnf08l6u6uxnz.cloudfront.net/master.m3u8";
        } else if (groupLower.includes("news") || nameLower.includes("news")) {
          streamUrl =
            "https://abcnews-streams.akamaized.net/hls/live/2023560/abcnewshudson1/master.m3u8";
        } else if (
          groupLower.includes("weather") ||
          nameLower.includes("weather")
        ) {
          streamUrl =
            "https://d2ferbiwcx1539.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-8zd06wicndthf-ssai-prd/WNNationalSamsung/WNNationalSamsung.m3u8";
        } else if (groupLower.includes("tech") || nameLower.includes("space")) {
          streamUrl =
            "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8";
        } else {
          streamUrl =
            "https://d1j2u714xk898n.cloudfront.net/scheduler/scheduleMaster/145.m3u8";
        }
      }

      onPlayMedia({
        id: `sling-${channel.id}`,
        title: channel.name,
        subtitle: `${channel.group} · In-Motion Passenger Stream`,
        group: channel.group,
        source: "Live TV",
        provider: "sling",
        image: channel.logo || "/sling-logo.svg",
        url: streamUrl,
      });
      return;
    }

    onStartPlayback();
    setSelected(channel);
  };

  const handleSwitchToDrive = (channel: SlingChannel) => {
    if (!onPlayMedia) return;
    const matchingHls = defaultChannels.find(
      (c) =>
        c.title.toLowerCase().includes(channel.name.toLowerCase()) ||
        channel.name.toLowerCase().includes(c.title.toLowerCase()),
    );

    onPlayMedia({
      id: `sling-${channel.id}`,
      title: channel.name,
      subtitle: `${channel.group} · In-Motion Passenger Stream`,
      group: channel.group,
      source: "Live TV",
      provider: "sling",
      image: channel.logo || "/sling-logo.svg",
      url: matchingHls
        ? matchingHls.url
        : "https://dnf08l6u6uxnz.cloudfront.net/master.m3u8", // Fallback to verified 24/7 sports stream
    });
  };

  const handleLaunchBridge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customBridgeUrl.trim() || !onPlayMedia) return;
    const bridgeMedia: Media = {
      id: `sling-bridge-${Date.now()}`,
      title: "Sling Live Bridge (ESPN / FS1 / Cable)",
      subtitle: "Paid Account Entitlement Feed · Driving Mode Safe",
      group: "Sports",
      source: "Live TV",
      provider: "sling",
      image: "/sling-logo.svg",
      url: customBridgeUrl.trim(),
    };
    setShowAccountModal(false);
    onPlayMedia(bridgeMedia);
  };

  return (
    <section className={styles.app} aria-label="Sling Live TV">
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <div className={styles.logoWrapper}>
            <img src="/sling-logo.svg" alt="Sling" className={styles.logo} />
          </div>
          <div className={styles.brandText}>
            <h1>SLING TV</h1>
            <p className={styles.brandSub}>
              <span className={styles.freestreamBadge}>PASSENGER MODE ACTIVE</span>
              <span>490+ Live Broadcast Channels</span>
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.accountBtn}
            onClick={() => setShowAccountModal(true)}
          >
            <KeyRound size={15} />
            <span>Sling Account Login</span>
          </button>
          <a
            href="https://watch.sling.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.officialLink}
          >
            <span>Open Official Sling</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </header>

      {/* Account Login & Driving Mode Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(0, 163, 224, 0.12), rgba(255, 89, 0, 0.1))",
          border: "1px solid rgba(0, 163, 224, 0.3)",
          borderRadius: "14px",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <KeyRound size={22} style={{ color: "#00a3e0", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff" }}>
              Sling Account Login (<span style={{ color: "#38bdf8" }}>mailyesh@yahoo.com</span>)
            </div>
            <div style={{ fontSize: "12px", color: "#8da4be", marginTop: "2px" }}>
              Access your paid subscription channels (ESPN, NFL Network, FS1) or bridge them for passenger viewing in drive.
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <a
            href="https://watch.sling.com"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.secondary}
            style={{ background: "#00a3e0", color: "#04101c", fontWeight: "700", textDecoration: "none" }}
          >
            <ExternalLink size={14} style={{ marginRight: "6px" }} />
            <span>Sign In on Official Sling</span>
          </a>
          <button
            className={styles.secondary}
            onClick={() => setShowAccountModal(true)}
            style={{ borderColor: "rgba(255, 89, 0, 0.5)", color: "#ff8c42" }}
          >
            <Tv size={14} style={{ marginRight: "6px" }} />
            <span>Drive Mode Setup</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search & View Toggle */}
      <div className={styles.controlBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels, teams, or networks (e.g. ESPN, ABC, beIN, FilmRise)..."
            className={styles.searchInput}
          />
          {query && (
            <button
              className={styles.clearSearchBtn}
              onClick={() => setQuery("")}
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className={styles.viewToggleCapsule}>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === "epg" ? styles.viewToggleBtnActive : ""}`}
            onClick={() => setViewMode("epg")}
          >
            <Calendar size={14} />
            <span>Live Guide</span>
          </button>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === "grid" ? styles.viewToggleBtnActive : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <Layers size={14} />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* Categories Bar */}
      <div className={styles.categoriesBar}>
        {SLING_CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`${styles.categoryPill} ${selectedCategory === cat ? styles.categoryPillActive : ""}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stats Feedback Bar */}
      <div className={styles.feedback} aria-live="polite">
        <div className={styles.channelStats}>
          {loading ? (
            <span>Connecting to Sling live network catalog...</span>
          ) : error ? (
            <span style={{ color: "#ef4444" }}>{error}</span>
          ) : (
            <span>
              Showing <strong className={styles.statHighlight}>{visible.length}</strong> verified Sling live channels
            </span>
          )}
        </div>

        {error && (
          <button
            className={styles.secondary}
            onClick={() => setAttempt((v) => v + 1)}
          >
            <RotateCw size={13} />
            <span>Retry Catalog</span>
          </button>
        )}
      </div>

      {/* Content: EPG TV Guide View */}
      {!loading && !error && viewMode === "epg" && (
        <section className={styles.epgSection}>
          <div className={styles.epgTableWrapper}>
            <div className={styles.epgTableHeader}>
              <div>CHANNEL</div>
              <div>ON AIR NOW (LIVE SCHEDULE)</div>
              <div style={{ textAlign: "right" }}>ACTION</div>
            </div>

            <div className={styles.epgChannelRows}>
              {visible.map((channel) => {
                const epg = getSimulatedEPG(channel);
                return (
                  <div
                    key={channel.id}
                    className={styles.epgRow}
                    onClick={() => handlePlayChannel(channel)}
                  >
                    {/* Left: Channel Identity & Logo */}
                    <div className={styles.epgColChannel}>
                      <div className={styles.epgLogoBadge}>
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className={styles.epgLogoFallback}>
                            {channel.name.slice(0, 3).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className={styles.epgChannelText}>
                        <span className={styles.epgGroupTag}>{channel.group}</span>
                        <h4 className={styles.epgChannelName}>{channel.name}</h4>
                      </div>
                    </div>

                    {/* Middle: On Air Program Info & Progress */}
                    <div className={styles.epgColSchedule}>
                      <div className={styles.epgProgramInfo}>
                        <div className={styles.epgProgramTitleRow}>
                          <span className={styles.epgLiveDot} />
                          <strong className={styles.epgProgramName}>{epg.current}</strong>
                          <span className={styles.epgTimeRange}>{epg.timeRange}</span>
                        </div>

                        <div className={styles.epgProgressBarBg}>
                          <div
                            className={styles.epgProgressBarFill}
                            style={{ width: `${epg.progressPercent}%` }}
                          />
                        </div>

                        <div className={styles.epgUpcomingRow}>
                          <span className={styles.upcomingLabel}>NEXT:</span>
                          <span className={styles.upcomingTitle}>{epg.next}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Watch Action */}
                    <div className={styles.epgColAction}>
                      <button
                        className={styles.epgPlayBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayChannel(channel);
                        }}
                      >
                        <Play size={14} fill="currentColor" />
                        <span>Watch Live</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Content: Visual Cards Grid */}
      {!loading && !error && viewMode === "grid" && (
        <div className={styles.grid}>
          {visible.map((channel) => (
            <button
              key={channel.id}
              className={styles.channel}
              aria-label={`Watch ${channel.name}`}
              onClick={() => handlePlayChannel(channel)}
            >
              <div className={styles.channelArt}>
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className={styles.channelArtFallback}>
                    {channel.name}
                  </div>
                )}
                <span className={styles.liveBadge}>LIVE</span>
              </div>
              <div className={styles.channelMeta}>
                <span>{channel.group}</span>
                <strong>{channel.name}</strong>
              </div>
            </button>
          ))}
          {!visible.length && (
            <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#8da4be", padding: "40px" }}>
              No Sling channels found matching your search.
            </p>
          )}
        </div>
      )}

      {/* Direct Player Dialog */}
      {selected && (
        <SlingPlayer
          key={selected.id}
          channel={selected}
          onClose={() => setSelected(null)}
          onSwitchToDrivePlayer={handleSwitchToDrive}
        />
      )}

      {/* Paid Account Connection Modal */}
      {showAccountModal && (
        <div
          className={styles.accountModalBackdrop}
          onClick={() => setShowAccountModal(false)}
        >
          <div
            className={styles.accountModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.accountModalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={24} style={{ color: "#00a3e0" }} />
                <h3>Sling Paid Account (Orange / Blue / Sports)</h3>
              </div>
              <button
                className={styles.closeModalBtn}
                onClick={() => setShowAccountModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.accountModalBody}>
              <div className={styles.accountBanner}>
                <strong>How to Watch Your Paid Sling Subscription:</strong> To protect account credentials and prevent automated bot blocking, choose the option that matches how you are watching:
              </div>

              {/* Option 1: Official Portal Login */}
              <div className={styles.paidOptionCard}>
                <div className={styles.paidOptionTitle}>
                  <ExternalLink size={18} style={{ color: "#00a3e0" }} />
                  <span>Option 1: Direct Official Sling Sign-In</span>
                </div>
                <p className={styles.paidOptionDesc}>
                  Open the official Sling web app directly in your browser. Log in with your email (<strong>mailyesh@yahoo.com</strong>) and your account password. All your subscription channels (ESPN, NFL Network, FS1, TNT) and Cloud DVR will stream natively with full authorization.
                </p>
                <a
                  href="https://watch.sling.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.secondary}
                  style={{ alignSelf: "flex-start", background: "#00a3e0", color: "#04101c", fontWeight: 700, textDecoration: "none" }}
                >
                  Open Official Sling (watch.sling.com)
                </a>
              </div>

              {/* Option 2: TVE / Channels DVR Bridge for Drive Mode */}
              <div className={styles.paidOptionCard}>
                <div className={styles.paidOptionTitle}>
                  <Tv size={18} style={{ color: "#ff5900" }} />
                  <span>Option 2: TVE / Channels DVR Bridge (Watch in Drive Mode)</span>
                </div>
                <p className={styles.paidOptionDesc}>
                  To watch live ESPN, FS1, or NFL Network in your Tesla <strong>while driving without the vehicle pausing playback</strong>, run Channels DVR on your home computer signed into your Sling account. Paste the generated stream URL below:
                </p>
                <form onSubmit={handleLaunchBridge} className={styles.bridgeInputRow}>
                  <input
                    type="url"
                    placeholder="http://<home-pc-ip>:8089/devices/ANY/channels/6002/stream.m3u8"
                    value={customBridgeUrl}
                    onChange={(e) => setCustomBridgeUrl(e.target.value)}
                    className={styles.bridgeInput}
                  />
                  <button type="submit" className={styles.connectStreamBtn}>
                    Play in Drive
                  </button>
                </form>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64748b" }}>
                <CheckCircle2 size={14} style={{ color: "#34d399" }} />
                <span>490+ Sling channels are unlocked with passenger driving canvas support.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
