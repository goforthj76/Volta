"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Youtube,
  Play,
  CheckCircle2,
  X,
  LoaderCircle,
  Link as LinkIcon,
  Smartphone,
  LogOut,
  RotateCw,
  ListVideo,
  Users,
  Check,
  ExternalLink,
} from "lucide-react";
import { Media } from "@/lib/media";
import { readLocal, writeLocal } from "@/lib/storage";

type YouTubeVideo = {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  channelAvatar?: string;
  thumbnail: string;
  views: string;
  uploadedAt: string;
  duration: string;
  category: string;
};

interface YouTubeAccount {
  title: string;
  avatar: string;
  channelId: string;
  accessToken: string;
  expiresAt: number;
}

interface SubscribedChannel {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
}

interface UserPlaylist {
  id: string;
  title: string;
  thumbnail: string;
  itemCount: number;
}

const curatedVideos: YouTubeVideo[] = [
  {
    id: "yt-1",
    youtubeId: "aqz-KE-bpKQ",
    title: "Big Buck Bunny 4K (Full Open Film) — Cinematic Animation",
    channel: "Blender Studio",
    channelAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/forest.jpg",
    views: "18M views",
    uploadedAt: "Featured Open Cinema",
    duration: "09:56",
    category: "Car Cinema",
  },
  {
    id: "yt-2",
    youtubeId: "jfKfPfyJRdk",
    title: "Lofi Hip Hop Radio 📚 - Beats to Relax/Study to [Live 24/7]",
    channel: "Lofi Girl",
    channelAvatar: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/city.jpg",
    views: "65K watching",
    uploadedAt: "LIVE",
    duration: "LIVE",
    category: "Lofi Chill Beats",
  },
  {
    id: "yt-3",
    youtubeId: "4Z8gJd6K1bA",
    title: "Tesla FSD Supervised 13: Full Coast to Coast Road Trip Showcase",
    channel: "Tesla Daily",
    channelAvatar: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/road.jpg",
    views: "840K views",
    uploadedAt: "2 days ago",
    duration: "24:15",
    category: "Tesla & Electric Vehicles",
  },
  {
    id: "yt-4",
    youtubeId: "EngW7tLk6R8",
    title: "SpaceX Starship Flight 6 Cinematic Recaps & Orbital Views",
    channel: "SpaceX Community",
    channelAvatar: "https://images.unsplash.com/photo-1517976487502-5f79e8be0f9b?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/space.jpg",
    views: "1.2M views",
    uploadedAt: "1 week ago",
    duration: "18:42",
    category: "Tech & Space",
  },
  {
    id: "yt-5",
    youtubeId: "LXb3EKWsInQ",
    title: "4K Scenic Drive Through Snowy Mountain Passes & Alpine Valleys",
    channel: "Scenic Relax",
    channelAvatar: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/mountain.jpg",
    views: "420K views",
    uploadedAt: "3 weeks ago",
    duration: "45:00",
    category: "Car Cinema",
  },
  {
    id: "yt-6",
    youtubeId: "7X8II6J-6mU",
    title: "Synthwave Radio 🌌 - Chill Synth / Retro Beats for Night Drives",
    channel: "NightDrive FM",
    channelAvatar: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/hero.jpg",
    views: "12K watching",
    uploadedAt: "LIVE",
    duration: "LIVE",
    category: "Lofi Chill Beats",
  },
];

const categories = [
  "All",
  "Tesla & Electric Vehicles",
  "Car Cinema",
  "Lofi Chill Beats",
  "Tech & Space",
  "Music",
];

type ApiYouTubeItem = {
  youtubeId?: string;
  title: string;
  subtitle?: string;
  image?: string;
  duration?: string;
};

export default function YouTubeView({
  onPlay,
}: {
  onPlay: (media: Media) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [directError, setDirectError] = useState("");
  const [videos, setVideos] = useState<YouTubeVideo[]>(curatedVideos);
  const [searching, setSearching] = useState(false);

  // User personal account state
  const [account, setAccount] = useState<YouTubeAccount | null>(null);
  const [viewTab, setViewTab] = useState<"search" | "subscriptions" | "playlists">("search");
  const [subscriptions, setSubscriptions] = useState<SubscribedChannel[]>([]);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  

  // QR Pairing Modal State
  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [pairUrl, setPairUrl] = useState("");
  const [directAuthUrl, setDirectAuthUrl] = useState("");
  const [pairSuccess, setPairSuccess] = useState(false);

  // Load saved personal account on mount
  useEffect(() => {
    const saved = readLocal("volta.yt_account", "");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.accessToken) {
          setAccount(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  // When personal account changes, load subscriptions and playlists
  useEffect(() => {
    if (!account?.accessToken) return;

    async function loadUserData() {
      setLoadingPersonal(true);
      try {
        // Fetch Subscriptions
        const subRes = await fetch(
          `/api/auth/youtube/subscriptions?token=${encodeURIComponent(account!.accessToken)}`
        );
        if (subRes.ok) {
          const subData = await subRes.json();
          if (Array.isArray(subData.channels)) {
            setSubscriptions(subData.channels);
          }
        }

        // Fetch Playlists
        const playRes = await fetch(
          `/api/auth/youtube/playlists?token=${encodeURIComponent(account!.accessToken)}`
        );
        if (playRes.ok) {
          const playData = await playRes.json();
          if (Array.isArray(playData.playlists)) {
            setPlaylists(playData.playlists);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingPersonal(false);
      }
    }

    loadUserData();
  }, [account]);

  // Pair Modal: initialize session and poll for completion
  useEffect(() => {
    if (!pairModalOpen) return;
    let pollInterval: NodeJS.Timeout | null = null;
    let cancelled = false;

    async function initPairing() {
      try {
        const res = await fetch("/api/auth/youtube/login");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setPairCode(data.code);
            setPairUrl(data.pairUrl);
            setDirectAuthUrl(data.authUrl);

            // Start polling every 2.5 seconds
            pollInterval = setInterval(async () => {
              try {
                const pollRes = await fetch(`/api/auth/youtube/poll?code=${data.code}`);
                if (pollRes.ok) {
                  const pollData = await pollRes.json();
                  if (pollData.connected && pollData.profile) {
                    if (pollInterval) clearInterval(pollInterval);
                    setPairSuccess(true);
                    setAccount(pollData.profile);
                    writeLocal("volta.yt_account", JSON.stringify(pollData.profile));

                    setTimeout(() => {
                      setPairModalOpen(false);
                      setPairSuccess(false);
                    }, 1800);
                  }
                }
              } catch {
                // ignore
              }
            }, 2500);
          }
        }
      } catch {
        // ignore
      }
    }

    initPairing();

    return () => {
      cancelled = true;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pairModalOpen]);

  function handleDisconnect() {
    writeLocal("volta.yt_account", "");
    setAccount(null);
    setViewTab("search");
    setSubscriptions([]);
    setPlaylists([]);
  }

  // Load playlist items when a user clicks a playlist card
  async function openPlaylist(playlist: UserPlaylist) {
    if (!account?.accessToken) return;
    setSearching(true);
    

    try {
      const res = await fetch(
        `/api/auth/youtube/playlists?playlistId=${encodeURIComponent(playlist.id)}&token=${encodeURIComponent(account.accessToken)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          const apiVideos: YouTubeVideo[] = data.items.map((item: { youtubeId?: string; title: string; subtitle?: string; image?: string }, idx: number) => ({
            id: `yt-pl-${item.youtubeId || idx}`,
            youtubeId: item.youtubeId || "",
            title: item.title,
            channel: item.subtitle || "YouTube",
            thumbnail: item.image || "/art/city.jpg",
            views: playlist.title,
            uploadedAt: "My Playlist",
            duration: "HD",
            category: "Playlist",
          }));
          setVideos(apiVideos);
          setViewTab("search");
          setSearchQuery(`Playlist: ${playlist.title}`);
        }
      }
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }

  // Search effect via server API if query exists
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.startsWith("Playlist:")) {
      if (selectedCategory === "All" && !searchQuery.startsWith("Playlist:")) {
        setVideos(curatedVideos);
      } else if (!searchQuery.startsWith("Playlist:")) {
        setVideos(curatedVideos.filter((v) => v.category === selectedCategory));
      }
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/youtube?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = (await res.json()) as { items?: ApiYouTubeItem[] };
          if (Array.isArray(data.items) && data.items.length > 0) {
            const apiVideos: YouTubeVideo[] = data.items.map((item, idx) => ({
              id: `api-yt-${item.youtubeId || idx}`,
              youtubeId: item.youtubeId || "",
              title: item.title,
              channel: item.subtitle || "YouTube",
              thumbnail: item.image || "/art/city.jpg",
              views: "YouTube stream",
              uploadedAt: "Live search",
              duration: item.duration || "HD",
              category: "Search Results",
            }));
            setVideos(apiVideos);
          } else {
            setVideos(
              curatedVideos.filter((v) =>
                v.title.toLowerCase().includes(searchQuery.toLowerCase())
              )
            );
          }
        }
      } catch {
        setVideos(
          curatedVideos.filter((v) =>
            v.title.toLowerCase().includes(searchQuery.toLowerCase())
          )
        );
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  function playVideo(video: YouTubeVideo) {
    const media: Media = {
      id: video.id,
      title: video.title,
      subtitle: video.channel,
      image: video.thumbnail,
      source: "YouTube",
      youtubeId: video.youtubeId,
      duration: video.duration,
    };
    onPlay(media);
  }

  function handleDirectPlay() {
    setDirectError("");
    const url = directUrl.trim();
    if (!url) return;

    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    if (match && match[1]) {
      const ytId = match[1];
      const media: Media = {
        id: `yt-direct-${ytId}`,
        title: "YouTube Video",
        subtitle: `ID: ${ytId}`,
        image: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        source: "YouTube",
        youtubeId: ytId,
      };
      setDirectUrl("");
      onPlay(media);
    } else {
      setDirectError("Please enter a valid YouTube video URL or 11-character video ID.");
    }
  }

  return (
    <div className="youtube-container">
      {/* YouTube Top Bar */}
      <header className="youtube-header">
        <div className="youtube-brand">
          <div className="youtube-icon-box">
            <Youtube size={26} className="yt-red-icon" />
          </div>
          <h2>YouTube</h2>
          <span className="yt-region">TESLA</span>
        </div>

        {/* Central Search Bar */}
        <div className="youtube-search-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search YouTube videos, creators and live streams…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (viewTab !== "search") setViewTab("search");
              }}
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => {
                  setSearchQuery("");
                  
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
          <button className="search-submit-btn" aria-label="Search">
            <Search size={18} />
          </button>
        </div>

        {/* Personal Account Profile / Pair Phone Button */}
        <div className="youtube-account-header">
          {account ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "9999px",
                padding: "4px 12px 4px 6px",
              }}
            >
              {account.avatar ? (
                <img
                  src={account.avatar}
                  alt={account.title}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "#38bdf8",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "12px",
                  }}
                >
                  {account.title.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#ffffff",
                  maxWidth: "110px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {account.title}
              </span>
              <button
                onClick={handleDisconnect}
                title="Disconnect Account"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "4px",
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setPairModalOpen(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 0, 51, 0.15)",
                border: "1px solid rgba(255, 0, 51, 0.35)",
                color: "#ffffff",
                padding: "8px 16px",
                borderRadius: "9999px",
                fontSize: "13px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              <Smartphone size={16} style={{ color: "#ff0033" }} />
              <span>Connect YouTube</span>
            </button>
          )}
        </div>
      </header>

      {/* Account Navigation Tabs (Search, Subscriptions, Playlists) */}
      {account && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            margin: "0 5vw 14px",
          }}
        >
          <button
            onClick={() => setViewTab("search")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              background: viewTab === "search" ? "#ffffff" : "rgba(255, 255, 255, 0.05)",
              color: viewTab === "search" ? "#000000" : "#9ca3af",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Search size={14} />
            <span>Search &amp; Explore</span>
          </button>

          <button
            onClick={() => setViewTab("subscriptions")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              background: viewTab === "subscriptions" ? "#ffffff" : "rgba(255, 255, 255, 0.05)",
              color: viewTab === "subscriptions" ? "#000000" : "#9ca3af",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <Users size={14} />
            <span>My Subscriptions ({subscriptions.length})</span>
          </button>

          <button
            onClick={() => setViewTab("playlists")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 16px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              background: viewTab === "playlists" ? "#ffffff" : "rgba(255, 255, 255, 0.05)",
              color: viewTab === "playlists" ? "#000000" : "#9ca3af",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <ListVideo size={14} />
            <span>My Playlists ({playlists.length})</span>
          </button>
        </div>
      )}

      {/* Direct URL Input Bar */}
      <div className="direct-url-bar">
        <div className="direct-input-group">
          <LinkIcon size={16} className="link-icon" />
          <input
            type="text"
            placeholder="Paste any YouTube video link to watch (e.g. https://youtu.be/aqz-KE-bpKQ)..."
            value={directUrl}
            onChange={(e) => {
              setDirectUrl(e.target.value);
              setDirectError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDirectPlay();
            }}
          />
          <button className="direct-play-btn" onClick={handleDirectPlay}>
            <Play size={15} fill="currentColor" />
            <span>Watch Now</span>
          </button>
        </div>
        {directError && <span className="direct-error-text">{directError}</span>}
      </div>

      {/* Main View Content: Subscriptions View */}
      {viewTab === "subscriptions" ? (
        <section className="youtube-grid-section">
          <div className="section-title-row">
            <h3>Subscribed Channels</h3>
            {loadingPersonal && <LoaderCircle className="spin" size={20} />}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "16px",
              margin: "20px 0",
            }}
          >
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => {
                  setSearchQuery(sub.title);
                  setViewTab("search");
                }}
                style={{
                  background: "#141715",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <img
                  src={sub.thumbnail || "/art/city.jpg"}
                  alt={sub.title}
                  style={{
                    width: "72px",
                    height: "72px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    marginBottom: "12px",
                  }}
                />
                <h4 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                  {sub.title}
                </h4>
                <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 600 }}>
                  Browse Videos →
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : viewTab === "playlists" ? (
        /* Playlists View */
        <section className="youtube-grid-section">
          <div className="section-title-row">
            <h3>Your Custom Playlists &amp; Mixes</h3>
            {loadingPersonal && <LoaderCircle className="spin" size={20} />}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
              margin: "20px 0",
            }}
          >
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => openPlaylist(pl)}
                style={{
                  background: "#141715",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ position: "relative", aspectRatio: "16 / 9", background: "#000" }}>
                  <img
                    src={pl.thumbnail || "/art/city.jpg"}
                    alt={pl.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      right: "8px",
                      background: "rgba(0, 0, 0, 0.8)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 700,
                    }}
                  >
                    {pl.itemCount} videos
                  </div>
                </div>
                <div style={{ padding: "14px" }}>
                  <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "#fff" }}>
                    {pl.title}
                  </h4>
                  <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 600 }}>
                    Click to load videos
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        /* Default Search & Explore View */
        <>
          {/* Category Pills */}
          <div className="youtube-categories">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-pill ${selectedCategory === cat && !searchQuery ? "active" : ""}`}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSearchQuery("");
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Video Grid Section */}
          <section className="youtube-grid-section">
            <div className="section-title-row">
              <h3>
                {searchQuery
                  ? `Results for "${searchQuery}"`
                  : selectedCategory === "All"
                    ? "Recommended for Tesla Passenger"
                    : selectedCategory}
              </h3>
              {searching && <LoaderCircle className="spin" size={20} />}
            </div>

            <div className="youtube-video-grid">
              {videos.map((vid) => (
                <div key={vid.id} className="youtube-card" onClick={() => playVideo(vid)}>
                  <div className="yt-thumb-wrapper">
                    <img
                      src={vid.thumbnail}
                      alt={vid.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/art/city.jpg";
                      }}
                    />
                    <span
                      className={`yt-duration-badge ${vid.duration === "LIVE" ? "live-badge" : ""}`}
                    >
                      {vid.duration}
                    </span>
                    <div className="yt-hover-overlay">
                      <Play size={36} fill="currentColor" />
                    </div>
                  </div>

                  <div className="yt-meta-row">
                    <img
                      src={vid.channelAvatar || "/art/city.jpg"}
                      alt={vid.channel}
                      className="yt-channel-avatar"
                    />
                    <div className="yt-text-box">
                      <h4 title={vid.title}>{vid.title}</h4>
                      <div className="yt-channel-name">
                        <span>{vid.channel}</span>
                        <CheckCircle2 size={12} className="verified-icon" />
                      </div>
                      <div className="yt-stats">
                        <span>{vid.views}</span>
                        <span>•</span>
                        <span>{vid.uploadedAt}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* QR Phone Pairing Modal */}
      {pairModalOpen && (
        <div
          className="detail-modal-overlay"
          onClick={() => setPairModalOpen(false)}
        >
          <div
            className="detail-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "460px", textAlign: "center", padding: "32px 24px" }}
          >
            {pairSuccess ? (
              <div style={{ padding: "30px 0" }}>
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid rgba(16, 185, 129, 0.5)",
                    color: "#10b981",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Check size={36} />
                </div>
                <h3 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 8px" }}>
                  Connected Successfully!
                </h3>
                <p style={{ color: "#9ca3af", fontSize: "14px" }}>
                  Your personal subscriptions &amp; playlists are now loaded.
                </p>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Youtube size={22} style={{ color: "#ff0033" }} />
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                      Connect Personal YouTube
                    </h3>
                  </div>
                  <button
                    className="close-btn"
                    onClick={() => setPairModalOpen(false)}
                  >
                    <X size={20} />
                  </button>
                </div>

                <p
                  style={{
                    color: "#9ca3af",
                    fontSize: "13px",
                    lineHeight: 1.5,
                    margin: "0 0 20px",
                  }}
                >
                  Scan this QR code with your phone camera to sign into your personal YouTube account.
                  Your subscriptions and playlists will automatically appear in your Volta profile.
                </p>

                {/* QR Code Container */}
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "16px",
                    display: "inline-block",
                    margin: "0 auto 16px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                  }}
                >
                  {pairUrl ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pairUrl)}`}
                      alt="Pairing QR Code"
                      style={{ width: "180px", height: "180px", display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "180px",
                        height: "180px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#000",
                      }}
                    >
                      <RotateCw className="spin" size={24} />
                    </div>
                  )}
                </div>

                {/* Pair Code Badge */}
                <div style={{ marginBottom: "20px" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#6b7280",
                      letterSpacing: "1px",
                      marginBottom: "4px",
                    }}
                  >
                    PAIRING CODE
                  </span>
                  <div
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "24px",
                      fontWeight: 800,
                      letterSpacing: "4px",
                      color: "#38bdf8",
                    }}
                  >
                    {pairCode || "••••••"}
                  </div>
                </div>

                {/* Waiting Status */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    color: "#9ca3af",
                    fontSize: "13px",
                    marginBottom: "16px",
                  }}
                >
                  <RotateCw size={14} className="spin" />
                  <span>Waiting for phone sign-in approval…</span>
                </div>

                {/* Direct link option if on device */}
                {directAuthUrl && (
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "14px" }}>
                    <a
                      href={directAuthUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#9ca3af",
                        fontSize: "12px",
                        textDecoration: "underline",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>Or sign in on this device directly</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
