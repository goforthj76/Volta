"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Home,
  Youtube,
  Tv,
  Library,
  Heart,
  History,
  Settings,
  Search,
  ChevronDown,
  Play,
  Plus,
  Check,
  Wifi,
  BatteryMedium,
  X,
  Radio,
  ArrowRight,
  ArrowUpRight,
  MonitorPlay,
  UserRound,
  LogOut,
  Upload,
  Link2,
  Moon,
  Shield,
  MoreHorizontal,
} from "lucide-react";
import {
  artwork,
  featured,
  Media,
  parseM3U,
  parseXMLTV,
  Program,
  safeStream,
} from "@/lib/media";
import {
  sanitizeLibrary,
  defaultProfiles,
  Library as LibraryState,
  Profile,
  readLocal,
  writeLocal,
} from "@/lib/storage";
import { configured, supabase } from "@/lib/supabase";
import { vehicles, displays, Vehicle, Display } from "@/lib/vehicle";
import Player from "./player";
import Auth from "./auth";
import YouTubeSetup from "./youtube-setup";
import ProviderAccount from "./provider-account";
import { addonResource, browserStreams, BrowserStream } from "@/lib/addons";
import CabinLauncher from "./cabin-launcher";
import YouTubeView from "./youtube-view";
import StremioView from "./stremio-view";
import IptvView from "./iptv-view";
import { Car, Crown } from "lucide-react";
import SecretMenu from "./secret-menu";
import { getActiveUser, isMasterAdmin } from "@/lib/accounts";
const navigation = [
  { name: "Home", icon: Home },
  { name: "YouTube", icon: Youtube },
  { name: "Live TV", icon: Tv },
  { name: "Stremio", icon: Library },
  { name: "Favorites", icon: Heart },
  { name: "History", icon: History },
];
export default function Entertainment() {
  const [secretMenuOpen, setSecretMenuOpen] = useState(false);
  const [vehicle, setVehicle] = useState<Vehicle>("Tesla Model 3"),
    [display, setDisplay] = useState<Display>("Center display (parked)");
  const [streamChoices, setStreamChoices] = useState<{
    media: Media;
    streams: BrowserStream[];
  } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [page, setPage] = useState("Home"),
    [query, setQuery] = useState(""),
    [searchOpen, setSearchOpen] = useState(false),
    [profiles, setProfiles] = useState<Profile[]>(defaultProfiles),
    [profileId, setProfileId] = useState("alex"),
    [profileOpen, setProfileOpen] = useState(false),
    [profileName, setProfileName] = useState(""),
    [library, setLibrary] = useState<LibraryState>({
      favorites: [],
      history: [],
    }),
    [channels, setChannels] = useState<Media[]>([]),
    [programs, setPrograms] = useState<Program[]>([]),
    [group, setGroup] = useState("All channels"),
    [active, setActive] = useState<Media | null>(null),
    [toast, setToast] = useState(""),
    [authOpen, setAuthOpen] = useState(false),
    [account, setAccount] = useState(""),
    [ready, setReady] = useState(false),
    [results, setResults] = useState<Media[] | null>(null),
    [busy, setBusy] = useState(false),
    [playlist, setPlaylist] = useState(""),
    [playlistUrl, setPlaylistUrl] = useState(""),
    [addonUrl, setAddonUrl] = useState(""),
    [catalogs, setCatalogs] = useState<
      { id: string; type: string; name?: string }[]
    >([]),
    [catalogBase, setCatalogBase] = useState(""),
    [selectedCatalog, setSelectedCatalog] = useState(""),
    [stremioItems, setStremioItems] = useState<Media[]>([]),
    [clearConfirm, setClearConfirm] = useState(false),
    [settingTab, setSettingTab] = useState("Connections"),
    [compact, setCompact] = useState(false),
    [setupOpen, setSetupOpen] = useState(false),
    [manualStream, setManualStream] = useState(""),
    [userId, setUserId] = useState("");
  const profile = profiles.find((p) => p.id === profileId) || profiles[0];
  const fileInput = useRef<HTMLInputElement>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);
  const skipPersist = useRef(false);
  const notify = useCallback((s: string) => setToast(s), []);
  useEffect(() => {
    const outcome = new URLSearchParams(location.search).get("connection");
    if (outcome) {
      setToast(
        outcome === "youtube-connected"
          ? "YouTube connected. Open YouTube to see your playlists."
          : "YouTube sign-in did not finish. Please try again.",
      );
      history.replaceState(null, "", location.pathname);
    }
    const car = readLocal("volta.vehicle", {
      vehicle: "Tesla Model 3" as Vehicle,
      display: "Center display (parked)" as Display,
    });
    setVehicle(car.vehicle);
    setDisplay(car.display);
    setProfiles(readLocal("volta.profiles", defaultProfiles));
    const id = readLocal("volta.profile", "alex");
    setProfileId(id);
    setLibrary(
      readLocal(`volta.library.guest.${id}`, { favorites: [], history: [] }),
    );
    setReady(true);
    const activeU = getActiveUser();
    if (activeU) {
      setAccount(activeU.email);
    }
    if (configured) {
      const client = supabase();
      client.auth.getUser().then(({ data }) => {
        setAccount(data.user?.email || "");
        if (data.user?.user_metadata?.profiles)
          setProfiles(data.user.user_metadata.profiles);
        if (data.user?.user_metadata?.vehicle) {
          setVehicle(data.user.user_metadata.vehicle);
          setDisplay(
            data.user.user_metadata.display || "Center display (parked)",
          );
        }
        setUserId(data.user?.id || "");
      });
      const { data } = client.auth.onAuthStateChange((event, session) => {
        setAccount(session?.user?.email || "");
        setUserId(session?.user?.id || "");
        if (event === "PASSWORD_RECOVERY") setAuthOpen(true);
      });
      return () => data.subscription.unsubscribe();
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    hydrated.current = false;
    skipPersist.current = true;
    setLibrary(
      readLocal(`volta.library.${userId || "guest"}.${profileId}`, {
        favorites: [],
        history: [],
      }),
    );
    if (userId && configured) {
      supabase()
        .from("profile_state")
        .select("data")
        .eq("user_id", userId)
        .eq("profile_id", profileId)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error)
            notify(
              "Cloud sync is unavailable. Your library is saved on this device.",
            );
          if (data?.data) setLibrary(data.data as LibraryState);
          hydrated.current = true;
        });
    } else hydrated.current = true;
  }, [profileId, ready, userId, notify]);
  useEffect(() => {
    if (!ready) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    if (
      !writeLocal(
        `volta.library.${userId || "guest"}.${profileId}`,
        sanitizeLibrary(library),
      )
    )
      notify("Device storage is full. Changes cannot be saved.");
    if (userId && hydrated.current) {
      if (syncTimer.current) clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(() => {
        supabase()
          .from("profile_state")
          .upsert(
            {
              user_id: userId,
              profile_id: profileId,
              data: sanitizeLibrary(library),
            },
            { onConflict: "user_id,profile_id" },
          )
          .then(({ error }) => {
            if (error)
              notify("Could not sync. Your library is saved on this device.");
          });
      }, 1200);
    }
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [library, profileId, ready, userId, notify]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 5500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  function navigate(name: string) {
    setPage(name);
    setQuery("");
    setResults(null);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function favorite(media: Media) {
    setLibrary((old) => ({
      ...old,
      favorites: old.favorites.some((m) => m.id === media.id)
        ? old.favorites.filter((m) => m.id !== media.id)
        : [media, ...old.favorites],
    }));
  }
  async function resolveStreams(media: Media) {
    if (resolving) return;
    setResolving(true);
    try {
      const url = addonResource(addonUrl, "stream", media.mediaType!, media.id);
      const r = await fetch(url, {
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const streams = browserStreams(d.streams);
      if (!streams.length) {
        notify(
          "This addon returned no browser-ready authorized sources. Torrent and external-app sources do not play here.",
        );
        return;
      }
      setStreamChoices({ media, streams });
    } catch {
      notify(
        "The addon could not provide streams. Check that it supports this title and allows browser access.",
      );
    } finally {
      setResolving(false);
    }
  }
  function play(media: Media) {
    const curated = featured.find((item) => item.id === media.id);
    if (curated) media = { ...curated, progress: media.progress };
    if (media.source === "Live TV") {
      const current = channels.find((c) => c.id === media.id);
      if (current) media = current;
    }
    if (!media.url && !media.youtubeId) {
      if (media.source === "Stremio" && addonUrl && media.mediaType) {
        void resolveStreams(media);
        return;
      }
      notify(
        "Connect your authorized source to play this title. Catalog metadata alone does not include a media stream.",
      );
      return;
    }
    const old = library.history.find((m) => m.id === media.id);
    setActive({ ...media, progress: old?.progress || 0 });
    setLibrary((prev) => ({
      ...prev,
      history: [
        { ...media, progress: old?.progress || 0 },
        ...prev.history.filter((m) => m.id !== media.id),
      ].slice(0, 100),
    }));
  }
  const closePlayer = useCallback(() => setActive(null), []);
  function changeProfile(id: string) {
    setProfileId(id);
    writeLocal("volta.profile", id);
    setProfileOpen(false);
  }
  function addProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileName.trim()) return;
    if (profiles.length >= 6) {
      notify("You can have up to six profiles.");
      return;
    }
    const p = {
      id: crypto.randomUUID(),
      name: profileName.trim().slice(0, 24),
      color: ["#c9fa75", "#a99aee", "#80c6ed", "#f6b68e"][profiles.length % 4],
      autoplay: false,
    };
    const next = [...profiles, p];
    setProfiles(next);
    writeLocal("volta.profiles", next);
    if (account)
      supabase()
        .auth.updateUser({ data: { profiles: next } })
        .then(({ error }) => {
          if (error) notify("Could not sync profiles.");
        });
    setProfileName("");
    changeProfile(p.id);
  }
  async function doSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setResults(null);
    try {
      let videoId = "";
      try {
        const u = new URL(query);
        if (u.hostname === "youtu.be") videoId = u.pathname.slice(1);
        else if (
          ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(
            u.hostname,
          )
        )
          videoId =
            u.searchParams.get("v") ||
            u.pathname.match(/\/(?:shorts|embed)\/([^/]+)/)?.[1] ||
            "";
      } catch {}
      if (videoId && /^[\w-]{11}$/.test(videoId)) {
        setResults([
          {
            id: videoId,
            title: "Your YouTube video",
            subtitle: "YouTube · Open link",
            image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            source: "YouTube",
            youtubeId: videoId,
          },
        ]);
        return;
      }
      if (page === "YouTube") {
        const res = await fetch(`/api/youtube?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResults(data.items);
      } else {
        setResults(
          [
            ...featured,
            ...channels,
            ...library.favorites,
            ...library.history,
            ...stremioItems,
          ].filter(
            (m, i, arr) =>
              m.title.toLowerCase().includes(query.toLowerCase()) &&
              arr.findIndex((x) => x.id === m.id) === i,
          ),
        );
      }
    } catch (e) {
      notify(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setBusy(false);
    }
  }
  async function importPlaylist(text = playlist) {
    try {
      if (text.length > 5_000_000)
        throw new Error("Playlist is too large. Maximum size is 5 MB.");
      const items = parseM3U(text);
      if (!items.length) throw new Error("No supported HTTPS channels found.");
      setChannels(items);
      setSetupOpen(false);
      notify(`${items.length} channels imported for this session.`);
      navigate("Live TV");
    } catch (e) {
      notify(e instanceof Error ? e.message : "Could not import playlist");
    }
  }
  async function importURL() {
    const url = safeStream(playlistUrl);
    if (!url) {
      notify("Enter a valid HTTPS playlist URL.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (!r.ok) throw new Error();
      await importPlaylist(await r.text());
    } catch {
      notify(
        "Could not load this playlist. Your provider must allow browser CORS access. Try importing a file instead.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function connectAddon() {
    const url = safeStream(addonUrl);
    if (!url || !new URL(url).pathname.endsWith("/manifest.json")) {
      notify(
        "Enter an HTTPS Stremio addon manifest URL ending in /manifest.json.",
      );
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        credentials: "omit",
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (!Array.isArray(data.catalogs)) throw new Error();
      setCatalogs(
        data.catalogs.filter(
          (c: { id?: string; type?: string }) =>
            typeof c.id === "string" && typeof c.type === "string",
        ),
      );
      setCatalogBase(url);
      notify(
        `Connected to ${data.name || "your addon"}. Select a catalog below.`,
      );
    } catch {
      notify(
        "Could not connect. Check that this is a legitimate web-compatible addon with CORS enabled.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function loadCatalog(value: string) {
    setSelectedCatalog(value);
    if (!value) return;
    setBusy(true);
    try {
      const c = catalogs[Number(value) - 1];
      const r = await fetch(
        addonResource(catalogBase, "catalog", c.type, c.id),
        { signal: AbortSignal.timeout(10000), credentials: "omit" },
      );
      if (!r.ok) throw new Error();
      const d = await r.json();
      setStremioItems(
        (d.metas || [])
          .slice(0, 100)
          .map(
            (m: {
              id: string;
              name: string;
              poster?: string;
              description?: string;
            }) => ({
              id: m.id,
              title: m.name,
              subtitle: m.description?.slice(0, 80) || c.type,
              image: safeStream(m.poster || "") || artwork.space,
              source: "Stremio",
              mediaType: c.type,
            }),
          ),
      );
    } catch {
      notify("This catalog could not be loaded.");
    } finally {
      setBusy(false);
    }
  }
  const favoriteIds = new Set(library.favorites.map((m) => m.id));
  const filteredChannels = channels.filter(
    (c) => group === "All channels" || c.group === group,
  );
  const shown =
    results ??
    (page === "Favorites"
      ? library.favorites
      : page === "History"
        ? library.history
        : page === "Live TV"
          ? filteredChannels
          : page === "YouTube"
            ? featured.filter((m) => m.source === "YouTube")
            : page === "Stremio"
              ? [
                  ...featured.filter((m) => m.source === "Stremio"),
                  ...stremioItems,
                ]
              : featured);
  function card(m: Media, index: number, wide = false) {
    return (
      <article
        className={`media-card ${wide ? "wide-card" : ""}`}
        key={`${m.id}-${index}`}
      >
        <button
          className="card-image"
          onClick={() => play(m)}
          aria-label={`Play ${m.title}`}
        >
          <img
            src={m.image || artwork.ocean}
            alt=""
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = artwork.ocean;
            }}
          />
          <span
            className={`source-tag ${m.source.toLowerCase().replace(" ", "-")}`}
          >
            {m.source === "YouTube" ? (
              <Youtube size={13} />
            ) : m.source === "Live TV" ? (
              <Radio size={12} />
            ) : (
              <Library size={12} />
            )}{" "}
            {m.source}
          </span>
          <span className="card-play">
            <Play size={24} fill="currentColor" />
          </span>
          {m.duration && <span className="duration">{m.duration}</span>}
          {(m.progress || 0) > 0 && (
            <span className="progress-track">
              <i
                style={{
                  width: `${Math.min(100, ((m.progress || 0) / 600) * 100)}%`,
                }}
              />
            </span>
          )}
        </button>
        <div className="card-caption">
          <div>
            <button className="title-button" onClick={() => play(m)}>
              {m.title}
            </button>
            <p>{m.subtitle}</p>
          </div>
          <button
            aria-label={`${favoriteIds.has(m.id) ? "Remove from" : "Add to"} favorites: ${m.title}`}
            className={`save-button ${favoriteIds.has(m.id) ? "saved" : ""}`}
            onClick={() => favorite(m)}
          >
            {favoriteIds.has(m.id) ? (
              <Heart size={17} fill="currentColor" />
            ) : (
              <Plus size={19} />
            )}
          </button>
        </div>
      </article>
    );
  }
  return (
    <div
      className={`app ${compact ? "compact" : ""}`}
      data-page={page === "Home" && results !== null ? "Search" : page}
      data-vehicle={vehicle}
      data-display={display}
    >
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Volta home">
          <span className="brand-mark">
            v<span>•</span>
          </span>
          <span>
            volta<span className="brand-dot">.</span>
          </span>
        </Link>
        <div className="sidebar-label">YOUR ENTERTAINMENT</div>
        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={21} />
              <span>{name === "History" ? "Continue watching" : name}</span>
              {name === "Live TV" && <span className="tiny-live" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="passenger-card">
            <span className="passenger-icon">
              <MonitorPlay size={20} />
            </span>
            <div>
              <strong>Built for your Tesla</strong>
              <p>Passenger entertainment</p>
            </div>
            <span className="status-dot" />
          </div>
          <button
            className={`nav-item ${page === "Settings" ? "active" : ""}`}
            onClick={() => navigate("Settings")}
          >
            <Settings size={21} />
            <span>Settings</span>
          </button>
          <button
            className="sidebar-profile"
            onClick={() => navigate("Profile")}
          >
            <span className="avatar" style={{ background: profile?.color }}>
              {profile?.name[0]}
            </span>
            <span>
              <strong>{profile?.name}</strong>
              <small>
                {account ? "Connected account" : "Personal profile"}
              </small>
            </span>
            <MoreHorizontal size={20} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            TESLA ENTERTAINMENT<span>/</span>
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <button
              className={`icon-button search-toggle ${searchOpen ? "selected" : ""}`}
              aria-label="Open search"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={21} />
            </button>
            <span className="top-divider" />
            <span className="connection">
              <Wifi size={17} />
              <span>Connected</span>
            </span>
            <span className="drive-badge">
              <Car size={13} />
              <span>IN-MOTION ACTIVE</span>
            </span>
            {isMasterAdmin(account) && (
              <button
                className="secret-menu-trigger-btn"
                onClick={() => setSecretMenuOpen(true)}
                title="Open Owner Secret Vault & Invites"
              >
                <Crown size={15} />
                <span>SECRET VAULT</span>
              </button>
            )}
            <button
              className="profile-trigger"
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <span
                className="avatar small"
                style={{ background: profile?.color }}
              >
                {profile?.name[0]}
              </span>
              <span>{profile?.name}</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        {profileOpen && (
          <div className="profile-menu">
            <span className="eyebrow">WHO’S WATCHING?</span>
            {profiles.map((p) => (
              <button key={p.id} onClick={() => changeProfile(p.id)}>
                <span className="avatar" style={{ background: p.color }}>
                  {p.name[0]}
                </span>
                {p.name}
                {p.id === profileId && <Check size={18} />}
              </button>
            ))}
            <button
              onClick={() => {
                setProfileOpen(false);
                navigate("Profile");
              }}
            >
              <Plus size={18} />
              Manage profiles
            </button>
            <button
              onClick={() => {
                setProfileOpen(false);
                navigate("Settings");
              }}
            >
              <Settings size={18} />
              Settings & connections
            </button>
          </div>
        )}
        <main>
          {searchOpen && (
            <form className="global-search" onSubmit={doSearch}>
              <Search />
              <input
                autoFocus
                placeholder="Search your entertainment or paste a YouTube link"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="primary" disabled={busy}>
                Search
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => {
                  setSearchOpen(false);
                  setResults(null);
                }}
                aria-label="Close search"
              >
                <X />
              </button>
            </form>
          )}
          {page === "Home" && results === null ? (
            <CabinLauncher
              name={profile?.name || "Alex"}
              vehicle={vehicle}
              display={display}
              hasHistory={library.history.length > 0}
              onNavigate={navigate}
              onPlay={() => play(featured[0])}
              onAccount={() => setAuthOpen(true)}
              onSave={(name, v, d) => {
                setVehicle(v);
                setDisplay(d);
                writeLocal("volta.vehicle", { vehicle: v, display: d });
                const next = profiles.map((p) =>
                  p.id === profileId ? { ...p, name } : p,
                );
                setProfiles(next);
                writeLocal("volta.profiles", next);
                if (account)
                  supabase()
                    .auth.updateUser({
                      data: { vehicle: v, display: d, profiles: next },
                    })
                    .then(({ error }) => {
                      if (error)
                        notify(
                          "Saved on this device. Cloud sync is unavailable.",
                        );
                    });
              }}
            />
          ) : page === "YouTube" && results === null ? (
            <YouTubeView onPlay={play} />
          ) : page === "Stremio" && results === null ? (
            <StremioView onPlay={play} />
          ) : page === "Live TV" && results === null ? (
            <IptvView onPlay={play} />
          ) : page === "Settings" ? (
            <div className="inner-page">
              <div className="page-title">
                <span className="eyebrow">MAKE YOURSELF AT HOME</span>
                <h1>A little more you.</h1>
                <p>Your connections, preferences and peace of mind.</p>
              </div>
              <div className="settings-tabs">
                {[
                  "Connections",
                  "Playback",
                  "Appearance",
                  "Privacy",
                  "Account",
                ].map((t) => (
                  <button
                    className={settingTab === t ? "active" : ""}
                    key={t}
                    onClick={() => setSettingTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {settingTab === "Connections" ? (
                <>
                  <div className="settings-panel">
                    <div className="panel-heading">
                      <span className="service-icon tv-icon">
                        <Tv />
                      </span>
                      <div>
                        <h2>IPTV & program guide</h2>
                        <p>
                          Your provider. Your channels. Your front-row seat.
                        </p>
                      </div>
                      <span className="pill">
                        {channels.length
                          ? `${channels.length} channels`
                          : "Not connected"}
                      </span>
                    </div>
                    <div className="field-row">
                      <label>
                        Playlist URL
                        <input
                          type="url"
                          placeholder="https://your-provider.com/playlist.m3u"
                          value={playlistUrl}
                          onChange={(e) => setPlaylistUrl(e.target.value)}
                        />
                      </label>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={importURL}
                      >
                        {busy ? "Loading…" : "Connect playlist"}
                        <Link2 size={17} />
                      </button>
                    </div>
                    <p className="muted">
                      Only add sources you’re authorized to access. Sources stay
                      in memory and are cleared when this tab closes.
                    </p>
                    <div className="button-row">
                      <button
                        className="secondary"
                        onClick={() => fileInput.current?.click()}
                      >
                        <Upload size={18} />
                        Import M3U file
                      </button>
                      <button
                        className="secondary"
                        onClick={() => setSetupOpen(true)}
                      >
                        Paste playlist
                      </button>
                      <label className="secondary file-label">
                        <Upload size={18} />
                        Import XMLTV guide
                        <input
                          type="file"
                          accept=".xml"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            if (f.size > 10_000_000) {
                              notify("Guide must be smaller than 10 MB.");
                              return;
                            }
                            try {
                              const p = parseXMLTV(await f.text());
                              setPrograms(p);
                              notify(`${p.length} programs imported.`);
                            } catch {
                              notify("Could not read XMLTV guide.");
                            }
                          }}
                        />
                      </label>
                    </div>
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".m3u,.m3u8,.txt"
                      hidden
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          if (f.size > 5_000_000) {
                            notify("Playlist must be smaller than 5 MB.");
                            return;
                          }
                          await importPlaylist(await f.text());
                        }
                      }}
                    />
                  </div>
                  <div className="settings-panel">
                    <div className="panel-heading">
                      <span className="service-icon youtube-icon">
                        <Youtube />
                      </span>
                      <div>
                        <h2>YouTube</h2>
                        <p>Official embeds. All your favorite rabbit holes.</p>
                      </div>
                      <span className="pill">Ready to play</span>
                    </div>
                    <p className="muted">
                      Watch and search with official YouTube APIs. Videos play
                      here inside Volta. Google account sign-in is separate from
                      YouTube subscription authorization.
                    </p>
                    <YouTubeSetup />
                    <ProviderAccount provider="youtube" onPlay={play} />
                    <button
                      className="secondary"
                      onClick={() => navigate("YouTube")}
                    >
                      Open YouTube
                      <ArrowUpRight size={17} />
                    </button>
                  </div>
                  <div className="settings-panel">
                    <div className="panel-heading">
                      <span className="service-icon stremio-icon">
                        <Library />
                      </span>
                      <div>
                        <h2>Stremio-compatible catalogs</h2>
                        <p>Bring your discoveries along.</p>
                      </div>
                      <span className="pill">
                        {catalogBase ? "Connected" : "Optional"}
                      </span>
                    </div>
                    <ProviderAccount provider="stremio" onPlay={play} />
                    <div className="field-row">
                      <label>
                        Legitimate addon manifest URL
                        <input
                          placeholder="https://your-addon.com/manifest.json"
                          value={addonUrl}
                          onChange={(e) => setAddonUrl(e.target.value)}
                        />
                      </label>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={connectAddon}
                      >
                        Connect catalog
                        <Link2 size={17} />
                      </button>
                    </div>
                    <p className="muted">
                      Catalog metadata does not grant access to media. Only
                      direct, authorized HTTPS streams play in Volta. Your
                      Stremio account and cloud library remain in the official
                      Stremio app.
                    </p>
                    <p className="muted">
                      Addon catalogs and compatible authorized streams stay
                      inside Volta. Stremio account linking is available above.
                    </p>
                  </div>
                </>
              ) : settingTab === "Playback" ? (
                <div className="settings-panel">
                  <h2>Make it a comfortable watch.</h2>
                  <div className="setting-row">
                    <div>
                      <strong>Autoplay preference</strong>
                      <p>
                        Saved for this profile. Next-episode playback is coming
                        soon.
                      </p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={profile?.autoplay}
                      aria-label="Autoplay preference"
                      className={`toggle ${profile?.autoplay ? "on" : ""}`}
                      onClick={() => {
                        const next = profiles.map((p) =>
                          p.id === profileId
                            ? { ...p, autoplay: !p.autoplay }
                            : p,
                        );
                        setProfiles(next);
                        writeLocal("volta.profiles", next);
                      }}
                    >
                      <span />
                    </button>
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>Video quality</strong>
                      <p>
                        Adaptive quality follows your connection. Select HLS
                        quality inside the player.
                      </p>
                    </div>
                    <span className="pill">Auto</span>
                  </div>
                  <div className="notice">
                    <MonitorPlay size={20} />
                    Playback availability depends on the display, browser and
                    vehicle restrictions. Passenger displays are supported where
                    the vehicle permits playback.
                  </div>
                </div>
              ) : settingTab === "Appearance" ? (
                <div className="settings-panel">
                  <h2>Made for your screen.</h2>
                  <div className="setting-row">
                    <div>
                      <strong>Comfortable spacing</strong>
                      <p>Roomier cards and larger touch targets.</p>
                    </div>
                    <button
                      className={`toggle ${!compact ? "on" : ""}`}
                      role="switch"
                      aria-label="Comfortable spacing"
                      aria-checked={!compact}
                      onClick={() => setCompact(!compact)}
                    >
                      <span />
                    </button>
                  </div>
                  <div className="vehicle-settings">
                    <label>
                      Your vehicle
                      <select
                        value={vehicle}
                        onChange={(e) => {
                          const v = e.target.value as Vehicle;
                          setVehicle(v);
                          writeLocal("volta.vehicle", { vehicle: v, display });
                          if (account)
                            supabase()
                              .auth.updateUser({
                                data: { vehicle: v, display },
                              })
                              .then(({ error }) => {
                                if (error)
                                  notify("Could not sync vehicle preference.");
                              });
                        }}
                      >
                        {vehicles.map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Display location
                      <select
                        value={display}
                        onChange={(e) => {
                          const d = e.target.value as Display;
                          setDisplay(d);
                          writeLocal("volta.vehicle", { vehicle, display: d });
                          if (account)
                            supabase()
                              .auth.updateUser({
                                data: { vehicle, display: d },
                              })
                              .then(({ error }) => {
                                if (error)
                                  notify("Could not sync display preference.");
                              });
                        }}
                      >
                        {displays.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </label>
                    <p className="muted">
                      The layout fits your actual browser size, including your
                      phone. No fixed screen resolution or vehicle restrictions
                      are overridden.
                    </p>
                  </div>
                  <div className="setting-row">
                    <div>
                      <strong>Appearance</strong>
                      <p>A cinematic dark canvas that’s easy on the eyes.</p>
                    </div>
                    <span className="pill">
                      <Moon size={14} /> Dark
                    </span>
                  </div>
                </div>
              ) : settingTab === "Privacy" ? (
                <div className="settings-panel">
                  <Shield className="accent" size={30} />
                  <h2>Your entertainment is personal.</h2>
                  <p>
                    Guest history and favorites are stored in this browser, per
                    profile. Signed-in library data is protected by database
                    row-level security. Provider playlists stay in memory; we do
                    not store your IPTV credentials.
                  </p>
                  <div className="button-row">
                    <button
                      className="secondary danger"
                      onClick={() => setClearConfirm(true)}
                    >
                      Clear this profile’s watch data
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        const data = new Blob(
                          [JSON.stringify(library, null, 2)],
                          { type: "application/json" },
                        );
                        const url = URL.createObjectURL(data);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "volta-library.json";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      Export my library
                    </button>
                  </div>
                </div>
              ) : (
                <div className="settings-panel">
                  <h2>{account || "A home for all your favorites."}</h2>
                  <p>
                    {account
                      ? "You’re securely signed in."
                      : "Connect an account to sync your entertainment across devices."}
                  </p>
                  <div className="button-row">
                    <button
                      className="primary"
                      onClick={() => setAuthOpen(true)}
                    >
                      {account ? "Manage account" : "Sign in / Create account"}
                      <UserRound size={18} />
                    </button>
                    {account && (
                      <button
                        className="secondary"
                        onClick={async () => {
                          await supabase().auth.signOut();
                          setAccount("");
                          setUserId("");
                          notify("You’ve signed out.");
                        }}
                      >
                        <LogOut size={18} />
                        Sign out
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : page === "Profile" ? (
            <div className="inner-page">
              <div className="page-title">
                <span className="eyebrow">A SPACE FOR EVERYONE</span>
                <h1>Who’s along for the ride?</h1>
                <p>Different tastes. A little space for each of you.</p>
              </div>
              <div className="profiles-grid">
                {profiles.map((p) => (
                  <button
                    className={`profile-card ${p.id === profileId ? "selected" : ""}`}
                    key={p.id}
                    onClick={() => changeProfile(p.id)}
                  >
                    <span
                      className="large-avatar"
                      style={{ background: p.color }}
                    >
                      {p.name[0]}
                    </span>
                    <strong>{p.name}</strong>
                    <span>
                      {p.id === profileId
                        ? "Currently watching"
                        : "Switch profile"}
                    </span>
                  </button>
                ))}
              </div>
              <form className="add-profile" onSubmit={addProfile}>
                <label>
                  New profile name
                  <input
                    value={profileName}
                    maxLength={24}
                    placeholder="Their name"
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </label>
                <button className="secondary">
                  <Plus size={18} />
                  Add profile
                </button>
              </form>
              <div className="settings-panel">
                <h2>
                  {account ? "All signed in." : "Take your favorites with you."}
                </h2>
                <p>
                  {account ||
                    "Create an account to keep your library together across devices."}
                </p>
                <button className="primary" onClick={() => setAuthOpen(true)}>
                  {account ? "Manage account" : "Sign in / Create account"}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="inner-page">
              <div className="page-title">
                <span className="eyebrow">
                  {page === "Live TV"
                    ? "A FRONT-ROW SEAT"
                    : page === "YouTube"
                      ? "FOLLOW YOUR CURIOSITY"
                      : page === "Stremio"
                        ? "YOUR WORLD OF STORIES"
                        : "YOUR PERSONAL COLLECTION"}
                </span>
                <h1>
                  {results !== null
                    ? `Results for “${query}”`
                    : page === "YouTube"
                      ? "Always something to discover."
                      : page === "Live TV"
                        ? "In the moment."
                        : page === "Stremio"
                          ? "One more great story."
                          : page === "Favorites"
                            ? "The good stuff. Saved."
                            : "Right where you left off."}
                </h1>
                <p>
                  {page === "YouTube"
                    ? "Watch official YouTube videos, without leaving the journey."
                    : page === "Live TV"
                      ? "Your live channels, beautifully connected."
                      : page === "Stremio"
                        ? "Open films, your catalogs, and web-compatible playback."
                        : page === "Favorites"
                          ? "All your favorites, ready for the next adventure."
                          : "Your recently watched videos and films."}
                </p>
              </div>
              {["YouTube", "Live TV", "Stremio"].includes(page) && (
                <form className="section-search" onSubmit={doSearch}>
                  <Search size={21} />
                  <input
                    placeholder={
                      page === "YouTube"
                        ? "Search YouTube or paste a video link"
                        : `Search ${page === "Live TV" ? "channels" : "your library"}`
                    }
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button className="primary" disabled={busy}>
                    {busy ? "Searching…" : "Search"}
                  </button>
                </form>
              )}
              {page === "Live TV" && (
                <div className="toolbar">
                  <div className="category-tabs">
                    {[
                      "All channels",
                      ...new Set(channels.map((c) => c.group || "Other")),
                    ].map((g) => (
                      <button
                        key={g}
                        className={group === g ? "active" : ""}
                        onClick={() => {
                          setGroup(g);
                          setResults(null);
                        }}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      navigate("Settings");
                      setSettingTab("Connections");
                    }}
                  >
                    <Plus size={18} />
                    Add source
                  </button>
                </div>
              )}
              {page === "YouTube" && (
                <ProviderAccount provider="youtube" onPlay={play} />
              )}
              {page === "Stremio" && (
                <ProviderAccount provider="stremio" onPlay={play} />
              )}
              {page === "Stremio" && (
                <div className="stremio-banner">
                  <span className="service-icon stremio-icon">
                    <Library />
                  </span>
                  <div>
                    <strong>Your stories. Your sources.</strong>
                    <p>
                      Explore open films now, or connect a legitimate addon
                      catalog.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => navigate("Settings")}
                  >
                    Connect addon
                    <Plus size={17} />
                  </button>
                </div>
              )}
              {page === "Stremio" && catalogs.length > 0 && (
                <label className="catalog-select">
                  Addon catalog
                  <select
                    value={selectedCatalog}
                    onChange={(e) => loadCatalog(e.target.value)}
                  >
                    <option value="">Select a catalog</option>
                    {catalogs.map((c, i) => (
                      <option value={i + 1} key={`${c.type}-${c.id}`}>
                        {c.name || c.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {page === "Stremio" && (
                <details className="direct-stream">
                  <summary>Play a direct authorized media URL</summary>
                  <div className="field-row">
                    <input
                      placeholder="https://your-source.com/video.mp4"
                      value={manualStream}
                      onChange={(e) => setManualStream(e.target.value)}
                    />
                    <button
                      className="primary"
                      onClick={() => {
                        const url = safeStream(manualStream);
                        if (!url) {
                          notify("Enter an HTTPS media URL.");
                          return;
                        }
                        play({
                          id: url,
                          title: "Your media",
                          subtitle: "Personal authorized stream",
                          source: "Stremio",
                          image: artwork.space,
                          url,
                        });
                      }}
                    >
                      <Play size={17} />
                      Play
                    </button>
                  </div>
                </details>
              )}
              {busy ? (
                <div className="media-grid">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="skeleton" />
                  ))}
                </div>
              ) : shown.length ? (
                <>
                  <div className="section-heading">
                    <h2>
                      {results !== null
                        ? `${shown.length} results`
                        : page === "Live TV"
                          ? `${shown.length} channels`
                          : page === "Stremio"
                            ? "Ready for your next watch"
                            : page === "YouTube"
                              ? "A little inspiration"
                              : `${shown.length} saved moments`}
                    </h2>
                  </div>
                  <div className="media-grid">
                    {shown.map((m, i) => card(m, i))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  {page === "Live TV" ? (
                    <Tv size={42} />
                  ) : page === "Favorites" ? (
                    <Heart size={42} />
                  ) : page === "History" ? (
                    <History size={42} />
                  ) : (
                    <Search size={42} />
                  )}
                  <h2>
                    {results !== null
                      ? "Nothing here just yet."
                      : page === "Live TV"
                        ? "Your channels are one step away."
                        : page === "Favorites"
                          ? "Make room for your favorites."
                          : "Your next great watch awaits."}
                  </h2>
                  <p>
                    {results !== null
                      ? "Try a different search or paste a YouTube link."
                      : page === "Live TV"
                        ? "Connect your legitimate M3U playlist to start watching."
                        : page === "Favorites"
                          ? "Tap the + on any title to keep it here."
                          : "Start a film or video and we’ll keep your place."}
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      navigate(page === "Live TV" ? "Settings" : "Home");
                    }}
                  >
                    {page === "Live TV"
                      ? "Connect a source"
                      : "Explore your entertainment"}
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
              {page === "Live TV" && programs.length > 0 && (
                <section className="guide">
                  <div className="section-heading">
                    <h2>On now & up next</h2>
                    <span className="pill">XMLTV guide</span>
                  </div>
                  {channels.map((c) => {
                    const p = programs
                      .filter(
                        (p) => p.channel === c.epgId && p.stop > Date.now(),
                      )
                      .sort((a, b) => a.start - b.start)
                      .slice(0, 2);
                    return (
                      <div className="guide-row" key={c.id}>
                        <button onClick={() => play(c)}>
                          {c.title}
                          <Play size={16} />
                        </button>
                        {p.map((p, i) => (
                          <div key={i}>
                            <small>
                              {new Date(p.start).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </small>
                            <strong>{p.title}</strong>
                          </div>
                        ))}
                        {!p.length && <p>No program information available</p>}
                      </div>
                    );
                  })}
                </section>
              )}
            </div>
          )}
        </main>
        <footer className="status-bar">
          <span>
            <span className="status-dot" />
            Passenger mode<span className="status-separator">·</span>Enjoy the
            ride
          </span>
          <span>
            <MonitorPlay size={13} />
            Optimized for your display
            <span className="status-separator">·</span>
            <BatteryMedium size={16} />
            Volta v1.0
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            onClick={() => setToast("")}
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>
      )}
      {resolving && (
        <div className="toast" role="status">
          Finding browser-compatible sources…
        </div>
      )}
      {streamChoices && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Choose a media source"
          >
            <button
              className="icon-button modal-close"
              aria-label="Close sources"
              onClick={() => setStreamChoices(null)}
            >
              <X />
            </button>
            <span className="eyebrow">YOUR SOURCES, YOUR CHOICE</span>
            <h2>{streamChoices.media.title}</h2>
            <p>
              Choose a source you are authorized to access. Only web-compatible
              sources are shown.
            </p>
            <div className="source-choices">
              {streamChoices.streams.map((stream, i) => (
                <button
                  className="secondary full-width"
                  key={i}
                  onClick={() => {
                    const media = { ...streamChoices.media, ...stream };
                    setStreamChoices(null);
                    play(media);
                  }}
                >
                  <Play size={17} />
                  {stream.name}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {active && (
        <Player
          key={active.id}
          media={active}
          onClose={closePlayer}
          onFavorite={() => favorite(active)}
          isFavorite={favoriteIds.has(active.id)}
          onProgress={(seconds, duration) =>
            setLibrary((old) => ({
              ...old,
              history: old.history.map((m) =>
                m.id === active.id
                  ? {
                      ...m,
                      progress: seconds,
                      duration: Number.isFinite(duration)
                        ? `${Math.ceil((duration - seconds) / 60)} min left`
                        : m.duration,
                    }
                  : m,
              ),
            }))
          }
          onNext={
            active.source === "Live TV" && channels.length > 1
              ? () =>
                  play(
                    channels[
                      (channels.findIndex((c) => c.id === active.id) + 1) %
                        channels.length
                    ],
                  )
              : undefined
          }
          onPrevious={
            active.source === "Live TV" && channels.length > 1
              ? () =>
                  play(
                    channels[
                      (channels.findIndex((c) => c.id === active.id) -
                        1 +
                        channels.length) %
                        channels.length
                    ],
                  )
              : undefined
          }
        />
      )}{" "}
      {authOpen && (
        <Auth
          close={() => setAuthOpen(false)}
          onSignedIn={(user) => {
            setAccount(user.email);
            notify(`Welcome back, ${user.name}! Your account is active.`);
          }}
        />
      )}
      {secretMenuOpen && (
        <SecretMenu onClose={() => setSecretMenuOpen(false)} />
      )}{" "}
      {setupOpen && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Import playlist"
          >
            <button
              className="icon-button modal-close"
              aria-label="Close"
              onClick={() => setSetupOpen(false)}
            >
              <X />
            </button>
            <span className="eyebrow">YOUR CHANNELS, CONNECTED</span>
            <h2>Bring your playlist.</h2>
            <p>Paste an extended M3U playlist from your authorized provider.</p>
            <textarea
              autoFocus
              rows={9}
              value={playlist}
              onChange={(e) => setPlaylist(e.target.value)}
              placeholder={
                '#EXTM3U\n#EXTINF:-1 group-title="My channels",Channel name\nhttps://provider.example/live.m3u8'
              }
            />
            <button className="primary" onClick={() => importPlaylist()}>
              Import channels
              <ArrowRight size={18} />
            </button>
          </section>
        </div>
      )}
      {clearConfirm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-title"
          >
            <h2 id="clear-title">A clean slate?</h2>
            <p>
              This removes favorites and watch history for {profile?.name} on
              this device and your connected cloud profile.
            </p>
            <div className="button-row">
              <button
                className="secondary"
                autoFocus
                onClick={() => setClearConfirm(false)}
              >
                Keep my library
              </button>
              <button
                className="primary"
                onClick={() => {
                  setLibrary({ favorites: [], history: [] });
                  setClearConfirm(false);
                  notify("Your profile’s watch data has been cleared.");
                }}
              >
                Clear watch data
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
