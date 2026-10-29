"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Library,
  Film,
  Tv,
  Star,
  Play,
  User,
  LogOut,
  LogIn,
  X,
  LoaderCircle,
  Info,
} from "lucide-react";
import {
  StremioMeta,
  StremioStream,
  StremioAddon,
  fetchCinemetaCatalog,
  searchCinemeta,
  fetchCinemetaMeta,
} from "@/lib/stremio";
import { Media } from "@/lib/media";
import { readLocal, writeLocal } from "@/lib/storage";

export default function StremioView({
  onPlay,
}: {
  onPlay: (media: Media) => void;
}) {
  const [activeTab, setActiveTab] = useState<"top" | "movie" | "series" | "library">("top");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StremioMeta[]>([]);
  const [featuredItem, setFeaturedItem] = useState<StremioMeta | null>(null);

  // Stremio Account State
  const [authKey, setAuthKey] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [userAddons, setUserAddons] = useState<string[]>([]);
  const [userLibrary, setUserLibrary] = useState<StremioMeta[]>([]);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginKeyInput, setLoginKeyInput] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccess, setLoginSuccess] = useState("");

  // Media Detail Modal State
  const [selectedMeta, setSelectedMeta] = useState<StremioMeta | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [streams, setStreams] = useState<StremioStream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);

  // Load saved credentials on mount
  useEffect(() => {
    const savedKey = readLocal("volta.stremio.authKey", "");
    const savedEmail = readLocal("volta.stremio.email", "");
    if (savedKey) {
      setAuthKey(savedKey);
      setUserEmail(savedEmail);
      void loadAccountData(savedKey);
    }
  }, []);

  // Fetch catalog on tab / query change
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (activeTab === "library") {
        setItems(userLibrary);
        return;
      }

      setLoading(true);
      let results: StremioMeta[] = [];

      if (query.trim()) {
        results = await searchCinemeta(query.trim());
      } else if (activeTab === "top") {
        const [movies, shows] = await Promise.all([
          fetchCinemetaCatalog("movie", "top"),
          fetchCinemetaCatalog("series", "top"),
        ]);
        results = [...movies.slice(0, 10), ...shows.slice(0, 10)];
      } else {
        results = await fetchCinemetaCatalog(activeTab, "top");
      }

      if (!cancelled) {
        setItems(results);
        if (results.length > 0) {
          setFeaturedItem(results[0]);
        }
        setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [activeTab, query, userLibrary]);

  async function loadAccountData(key: string) {
    try {
      // Load user addons
      const addonRes = await fetch("/api/stremio?action=addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authKey: key }),
      });
      const addonData = (await addonRes.json()) as { addons?: StremioAddon[] };
      const addonUrls: string[] = (addonData.addons || []).map((a) => a.transportUrl);
      setUserAddons(addonUrls);

      // Load user library
      const libRes = await fetch("/api/stremio?action=library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authKey: key }),
      });
      const libData = (await libRes.json()) as { items?: Array<{ id: string; name: string; type: string; poster?: string; year?: string }> };
      if (Array.isArray(libData.items)) {
        const mapped: StremioMeta[] = libData.items.map((i) => ({
          id: i.id,
          name: i.name,
          type: i.type,
          poster: i.poster,
          year: i.year,
        }));
        setUserLibrary(mapped);
      }
    } catch {
      // Ignore background fetch failure
    }
  }

  async function handleLogin() {
    setLoginLoading(true);
    setLoginError("");
    setLoginSuccess("");

    try {
      if (loginKeyInput.trim()) {
        // Direct auth key
        const key = loginKeyInput.trim();
        setAuthKey(key);
        setUserEmail("Stremio User");
        writeLocal("volta.stremio.authKey", key);
        writeLocal("volta.stremio.email", "Stremio User");
        await loadAccountData(key);
        setLoginSuccess("Logged in successfully via AuthKey!");
        setTimeout(() => setLoginModalOpen(false), 1200);
        return;
      }

      if (!loginEmail || !loginPassword) {
        setLoginError("Please enter your Stremio email and password.");
        setLoginLoading(false);
        return;
      }

      const res = await fetch("/api/stremio?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = (await res.json()) as { error?: string; authKey?: string; user?: { email?: string } };
      if (!res.ok || data.error) {
        setLoginError(data.error || "Login failed. Verify credentials.");
        setLoginLoading(false);
        return;
      }

      const key = data.authKey || "";
      const email = data.user?.email || loginEmail;

      setAuthKey(key);
      setUserEmail(email);
      writeLocal("volta.stremio.authKey", key);
      writeLocal("volta.stremio.email", email);

      await loadAccountData(key);
      setLoginSuccess(`Welcome, ${email}! Synced your library & addons.`);
      setTimeout(() => {
        setLoginModalOpen(false);
        setLoginEmail("");
        setLoginPassword("");
      }, 1200);
    } catch {
      setLoginError("Network connection error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    setAuthKey("");
    setUserEmail("");
    setUserAddons([]);
    setUserLibrary([]);
    writeLocal("volta.stremio.authKey", "");
    writeLocal("volta.stremio.email", "");
    setLoginModalOpen(false);
  }

  async function openDetailModal(item: StremioMeta) {
    setSelectedMeta(item);
    setStreams([]);
    setActiveEpisodeId(null);

    const full = await fetchCinemetaMeta(item.type, item.id);
    if (full) {
      setSelectedMeta(full);
      if (full.type === "movie") {
        void loadStreams(full.type, full.id);
      } else if (full.videos && full.videos.length > 0) {
        const ep1 = full.videos.find((v) => v.season === 1 && v.episode === 1) || full.videos[0];
        setActiveEpisodeId(ep1.id);
        void loadStreams(full.type, ep1.id);
      }
    } else {
      if (item.type === "movie") {
        void loadStreams(item.type, item.id);
      }
    }
  }

  async function loadStreams(type: string, id: string) {
    setStreamsLoading(true);
    setStreams([]);
    try {
      const res = await fetch("/api/stremio?action=streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addons: userAddons.length > 0 ? userAddons : undefined,
          type,
          id,
        }),
      });
      const data = (await res.json()) as { streams?: StremioStream[] };
      let list = data.streams || [];

      // If Cinemeta has trailer streams, add it as a verified working option
      if (selectedMeta) {
        const trailerYt =
          selectedMeta.trailerStreams?.[0]?.ytId ||
          selectedMeta.trailers?.find((t) => t.source)?.source;
        if (trailerYt) {
          list = [
            {
              name: "Cinema Trailer",
              title: `${selectedMeta.name} — Official Trailer / Preview`,
              ytId: trailerYt,
            },
            ...list,
          ];
        }
      }

      setStreams(list);
    } catch {
      setStreams([]);
    } finally {
      setStreamsLoading(false);
    }
  }

  function selectEpisode(epId: string) {
    setActiveEpisodeId(epId);
    if (selectedMeta) {
      void loadStreams(selectedMeta.type, epId);
    }
  }

  function playStream(stream: StremioStream) {
    if (!selectedMeta) return;

    let title = selectedMeta.name;
    if (activeEpisodeId && selectedMeta.videos) {
      const ep = selectedMeta.videos.find((v) => v.id === activeEpisodeId);
      if (ep) {
        title = `${selectedMeta.name} - S${ep.season}E${ep.episode}: ${ep.name}`;
      }
    }

    const streamUrl =
      stream.url ||
      (stream.infoHash ? `http://127.0.0.1:11470/${stream.infoHash}/0` : undefined);

    const media: Media = {
      id: `stremio-${selectedMeta.id}-${Date.now()}`,
      title,
      subtitle: stream.title || stream.name || "Stremio Stream",
      source: "Stremio",
      image: selectedMeta.background || selectedMeta.poster || "/art/space.jpg",
      url: streamUrl,
      youtubeId: stream.ytId,
    };

    setSelectedMeta(null);
    onPlay(media);
  }

  const seasons = selectedMeta?.videos
    ? Array.from(new Set(selectedMeta.videos.map((v) => v.season).filter((s) => s > 0))).sort(
        (a, b) => a - b,
      )
    : [];

  const seasonEpisodes = selectedMeta?.videos
    ? selectedMeta.videos.filter((v) => v.season === selectedSeason)
    : [];

  return (
    <div className="stremio-container">
      {/* Stremio Top Nav Bar */}
      <header className="stremio-header">
        <div className="stremio-brand-area">
          <div className="stremio-logo-badge">
            <Film size={20} className="stremio-icon" />
          </div>
          <div className="stremio-brand-text">
            <h2>STREMIO</h2>
            <span className="stremio-sub">CINEMA ON THE ROAD</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="stremio-search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search movies, TV shows, anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="clear-btn" onClick={() => setQuery("")}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Stremio Account Button */}
        <div className="stremio-account-area">
          <button
            className={`stremio-auth-pill ${authKey ? "logged-in" : ""}`}
            onClick={() => setLoginModalOpen(true)}
          >
            <User size={16} />
            <span className="auth-email-label">
              {authKey ? userEmail : "Log in to Stremio"}
            </span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="stremio-tabs">
        <button
          className={`stremio-tab-btn ${activeTab === "top" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("top");
            setQuery("");
          }}
        >
          <Star size={16} />
          <span>Discover</span>
        </button>
        <button
          className={`stremio-tab-btn ${activeTab === "movie" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("movie");
            setQuery("");
          }}
        >
          <Film size={16} />
          <span>Movies</span>
        </button>
        <button
          className={`stremio-tab-btn ${activeTab === "series" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("series");
            setQuery("");
          }}
        >
          <Tv size={16} />
          <span>Series</span>
        </button>
        <button
          className={`stremio-tab-btn ${activeTab === "library" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("library");
            setQuery("");
          }}
        >
          <Library size={16} />
          <span>My Library {userLibrary.length > 0 ? `(${userLibrary.length})` : ""}</span>
        </button>
      </nav>

      {/* Featured Hero Banner */}
      {!query && featuredItem && (
        <div
          className="stremio-hero"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(16, 18, 17, 0.95) 0%, rgba(16, 18, 17, 0.4) 60%, rgba(16, 18, 17, 0.95) 100%), url(${
              featuredItem.background || featuredItem.poster
            })`,
          }}
        >
          <div className="hero-content">
            <div className="hero-badges">
              <span className="hero-type-badge">{featuredItem.type.toUpperCase()}</span>
              {featuredItem.imdbRating && (
                <span className="hero-rating-badge">
                  <Star size={14} fill="currentColor" /> {featuredItem.imdbRating}
                </span>
              )}
              {featuredItem.year && <span className="hero-year-badge">{featuredItem.year}</span>}
            </div>
            <h1 className="hero-title">{featuredItem.name}</h1>
            <p className="hero-description">
              {featuredItem.description ||
                "Watch high quality cinema and series on the road with Tesla passenger in-motion playback."}
            </p>
            <div className="hero-actions">
              <button
                className="hero-play-btn"
                onClick={() => void openDetailModal(featuredItem)}
              >
                <Play size={20} fill="currentColor" />
                <span>Watch Now (In-Motion)</span>
              </button>
              <button
                className="hero-info-btn"
                onClick={() => void openDetailModal(featuredItem)}
              >
                <Info size={18} />
                <span>Details & Streams</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <section className="stremio-grid-section">
        <div className="section-header">
          <h3>
            {query
              ? `Results for "${query}"`
              : activeTab === "library"
                ? "Your Synced Stremio Library"
                : activeTab === "movie"
                  ? "Top Rated Movies"
                  : activeTab === "series"
                    ? "Popular TV Series"
                    : "Trending Content"}
          </h3>
          <span className="item-count">{items.length} titles available</span>
        </div>

        {loading ? (
          <div className="stremio-loading">
            <LoaderCircle className="spin" size={36} />
            <span>Loading Stremio catalog…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="stremio-empty">
            <Film size={48} className="empty-icon" />
            <h4>No titles found</h4>
            <p>
              {activeTab === "library" && !authKey
                ? "Log in to your Stremio account to access your saved library and custom addons."
                : "Try a different search query."}
            </p>
            {activeTab === "library" && !authKey && (
              <button className="primary-pill-btn" onClick={() => setLoginModalOpen(true)}>
                Connect Stremio Account
              </button>
            )}
          </div>
        ) : (
          <div className="stremio-cards-grid">
            {items.map((item) => (
              <div
                key={item.id}
                className="stremio-card"
                onClick={() => void openDetailModal(item)}
              >
                <div className="card-poster-wrapper">
                  <img
                    src={item.poster || "/art/mountain.jpg"}
                    alt={item.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/art/mountain.jpg";
                    }}
                  />
                  {item.imdbRating && (
                    <div className="card-rating">
                      <Star size={12} fill="currentColor" />
                      <span>{item.imdbRating}</span>
                    </div>
                  )}
                  <div className="card-play-hover">
                    <Play size={32} fill="currentColor" />
                  </div>
                </div>
                <div className="card-meta">
                  <h4 title={item.name}>{item.name}</h4>
                  <div className="card-sub-info">
                    <span>{item.year || item.type}</span>
                    <span className="card-type-chip">{item.type}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Media Detail & Streams Modal */}
      {selectedMeta && (
        <div className="detail-modal-overlay" onClick={() => setSelectedMeta(null)}>
          <div className="detail-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedMeta(null)}>
              <X size={20} />
            </button>

            {/* Modal Backdrop Banner */}
            <div
              className="modal-backdrop-header"
              style={{
                backgroundImage: `linear-gradient(to top, #141715, transparent), url(${
                  selectedMeta.background || selectedMeta.poster
                })`,
              }}
            >
              <div className="backdrop-info">
                <span className="modal-type-badge">{selectedMeta.type.toUpperCase()}</span>
                <h2>{selectedMeta.name}</h2>
                <div className="modal-sub-row">
                  {selectedMeta.year && <span>{selectedMeta.year}</span>}
                  {selectedMeta.runtime && <span>• {selectedMeta.runtime}</span>}
                  {selectedMeta.imdbRating && (
                    <span className="rating-pill">
                      <Star size={13} fill="currentColor" /> {selectedMeta.imdbRating}
                    </span>
                  )}
                  {selectedMeta.genres && (
                    <span className="genre-pill">{selectedMeta.genres.slice(0, 3).join(", ")}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-body-content">
              {/* Overview */}
              <p className="modal-overview">{selectedMeta.description}</p>

              {/* Cast & Crew */}
              {selectedMeta.cast && selectedMeta.cast.length > 0 && (
                <div className="cast-row">
                  <strong>Cast: </strong>
                  <span>{selectedMeta.cast.slice(0, 5).join(", ")}</span>
                </div>
              )}

              {/* Season / Episode Picker for Series */}
              {selectedMeta.type === "series" && seasons.length > 0 && (
                <div className="series-episodes-container">
                  <div className="season-picker">
                    {seasons.map((s) => (
                      <button
                        key={s}
                        className={`season-btn ${selectedSeason === s ? "active" : ""}`}
                        onClick={() => setSelectedSeason(s)}
                      >
                        Season {s}
                      </button>
                    ))}
                  </div>

                  <div className="episodes-scroller">
                    {seasonEpisodes.map((ep) => (
                      <div
                        key={ep.id}
                        className={`episode-card ${activeEpisodeId === ep.id ? "active" : ""}`}
                        onClick={() => selectEpisode(ep.id)}
                      >
                        <div className="ep-thumb-wrapper">
                          <img
                            src={ep.thumbnail || selectedMeta.poster || "/art/city.jpg"}
                            alt={ep.name}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/art/city.jpg";
                            }}
                          />
                          <span className="ep-number-badge">
                            S{ep.season} E{ep.episode}
                          </span>
                        </div>
                        <div className="ep-info">
                          <h5>{ep.name}</h5>
                          <p>{ep.overview ? ep.overview.slice(0, 90) + "…" : "No description."}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stream Sources Section */}
              <div className="streams-section">
                <div className="streams-header">
                  <h4>Available Streams (Canvas In-Motion Ready)</h4>
                  {streamsLoading && <LoaderCircle className="spin" size={18} />}
                </div>

                {streamsLoading ? (
                  <div className="streams-loading">
                    <LoaderCircle className="spin" size={24} />
                    <span>Resolving streams from your Stremio addons…</span>
                  </div>
                ) : streams.length === 0 ? (
                  <div className="no-streams-notice">
                    <p>
                      No direct web-compatible stream found for this title.
                      {!authKey && (
                        <span> Log into your Stremio account with your addons (Torrentio / RealDebrid / DebridLink) to unlock high-speed passenger streams!</span>
                      )}
                    </p>
                    {!authKey && (
                      <button
                        className="login-prompt-btn"
                        onClick={() => {
                          setSelectedMeta(null);
                          setLoginModalOpen(true);
                        }}
                      >
                        <LogIn size={16} />
                        <span>Log into Stremio Account</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="streams-list">
                    {streams.map((stream, idx) => {
                      const isDirect = Boolean(stream.url);
                      const isYt = Boolean(stream.ytId);
                      return (
                        <button
                          key={idx}
                          className="stream-item-btn"
                          onClick={() => playStream(stream)}
                        >
                          <Play size={18} className="stream-play-icon" />
                          <div className="stream-info-text">
                            <span className="stream-title">{stream.title || stream.name || "Direct Stream"}</span>
                            <span className="stream-name-tag">{stream.name || "Web Source"}</span>
                          </div>
                          <span
                            className="stream-badge"
                            style={{
                              background: isDirect
                                ? "rgba(34, 197, 94, 0.2)"
                                : isYt
                                  ? "rgba(239, 68, 68, 0.2)"
                                  : "rgba(245, 158, 11, 0.2)",
                              color: isDirect ? "#4ade80" : isYt ? "#f87171" : "#fbbf24",
                              borderColor: isDirect
                                ? "rgba(34, 197, 94, 0.4)"
                                : isYt
                                  ? "rgba(239, 68, 68, 0.4)"
                                  : "rgba(245, 158, 11, 0.4)",
                            }}
                          >
                            {isDirect ? "DIRECT (IN-MOTION)" : isYt ? "YOUTUBE" : "DEBRID / SERVER"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stremio Account Login Modal */}
      {loginModalOpen && (
        <div className="detail-modal-overlay" onClick={() => setLoginModalOpen(false)}>
          <div className="login-modal-box" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setLoginModalOpen(false)}>
              <X size={20} />
            </button>

            <div className="login-modal-header">
              <div className="stremio-logo-badge large">
                <Film size={28} />
              </div>
              <h3>{authKey ? "Stremio Account Connected" : "Connect Stremio Account"}</h3>
              <p>
                Sync your cloud library, watch history, and addons (Torrentio, CyberFlix, Debrid) directly into Volta.
              </p>
            </div>

            {authKey ? (
              <div className="account-details-view">
                <div className="account-info-card">
                  <div className="info-row">
                    <span className="label">User:</span>
                    <strong>{userEmail}</strong>
                  </div>
                  <div className="info-row">
                    <span className="label">Addons Synced:</span>
                    <strong>{userAddons.length} installed</strong>
                  </div>
                  <div className="info-row">
                    <span className="label">Library Items:</span>
                    <strong>{userLibrary.length} titles</strong>
                  </div>
                </div>

                <div className="account-actions">
                  <button className="logout-btn" onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Disconnect Stremio Account</span>
                  </button>
                  <button className="close-btn-secondary" onClick={() => setLoginModalOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="login-form-area">
                {loginError && <div className="login-error-alert">{loginError}</div>}
                {loginSuccess && <div className="login-success-alert">{loginSuccess}</div>}

                <div className="form-group">
                  <label>Stremio Email</label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="Your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>

                <div className="divider-text">
                  <span>OR LOG IN VIA AUTH KEY</span>
                </div>

                <div className="form-group">
                  <label>Stremio AuthKey (Optional)</label>
                  <input
                    type="text"
                    placeholder="Paste your authKey"
                    value={loginKeyInput}
                    onChange={(e) => setLoginKeyInput(e.target.value)}
                  />
                </div>

                <button
                  className="submit-login-btn"
                  onClick={() => void handleLogin()}
                  disabled={loginLoading}
                >
                  {loginLoading ? (
                    <>
                      <LoaderCircle className="spin" size={18} />
                      <span>Logging in…</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>Log In & Sync Library</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
