"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Link2,
  LogOut,
  ArrowLeft,
  RefreshCw,
  Play,
  Film,
  Youtube,
  LogIn,
} from "lucide-react";
import type { Media } from "@/lib/media";
import { readLocal, writeLocal } from "@/lib/storage";

type Item = {
  id: string;
  title: string;
  image: string;
  subtitle: string;
  youtubeId?: string;
};

export default function ProviderAccount({
  provider,
  onPlay,
}: {
  provider: "youtube" | "stremio";
  onPlay: (media: Media) => void;
}) {
  const [status, setStatus] = useState<{
    configured: boolean;
    connected: boolean;
    callback?: string;
  } | null>(null);

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [view, setView] = useState("playlists");
  const [playlist, setPlaylist] = useState("");

  // Stremio direct credentials state
  const [stremioEmail, setStremioEmail] = useState("");
  const [stremioPassword, setStremioPassword] = useState("");
  const [stremioAuthKey, setStremioAuthKey] = useState("");
  const [stremioConnected, setStremioConnected] = useState(false);
  const [stremioUserEmail, setStremioUserEmail] = useState("");
  const [showStremioForm, setShowStremioForm] = useState(false);

  const base = "/api/connections/" + provider;
  const title = provider === "youtube" ? "YouTube" : "Stremio";

  useEffect(() => {
    if (provider === "stremio") {
      const savedKey = readLocal("volta.stremio.authKey", "");
      const savedEmail = readLocal("volta.stremio.email", "");
      if (savedKey) {
        setStremioConnected(true);
        setStremioUserEmail(savedEmail || "Stremio User");
      }
    }
  }, [provider]);

  const check = useCallback(async () => {
    try {
      const r = await fetch(base + "/status", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setStatus(data);
      }
    } catch {
      // Ignore
    }
  }, [base]);

  useEffect(() => {
    void check();
  }, [check]);

  async function request(path: string, post = false) {
    const r = await fetch(base + path, {
      method: post ? "POST" : "GET",
      headers: post ? { "Content-Type": "application/json" } : {},
      body: post ? "{}" : undefined,
      cache: "no-store",
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Connection failed.");
    return d;
  }

  async function connectYouTube() {
    setMessage("");
    if (!status?.configured) {
      setMessage(
        "To enable YouTube personal account login (for your subscriptions/playlists), add your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your hosting environment secrets. Public YouTube search works out of the box!",
      );
      return;
    }
    location.assign(base + "/start");
  }

  async function handleDirectStremioLogin() {
    setBusy(true);
    setMessage("");
    try {
      if (stremioAuthKey.trim()) {
        const key = stremioAuthKey.trim();
        writeLocal("volta.stremio.authKey", key);
        writeLocal("volta.stremio.email", "Stremio User");
        setStremioConnected(true);
        setStremioUserEmail("Stremio User");
        setShowStremioForm(false);
        setMessage("Stremio account connected via AuthKey!");
        return;
      }

      if (!stremioEmail || !stremioPassword) {
        setMessage("Please enter both email and password for Stremio.");
        setBusy(false);
        return;
      }

      const res = await fetch("/api/stremio?action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: stremioEmail, password: stremioPassword }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setMessage(data.error || "Could not log into Stremio. Verify credentials.");
        return;
      }

      const key = data.authKey;
      const user = data.user?.email || stremioEmail;
      writeLocal("volta.stremio.authKey", key);
      writeLocal("volta.stremio.email", user);
      setStremioConnected(true);
      setStremioUserEmail(user);
      setShowStremioForm(false);
      setMessage(`Successfully logged in as ${user}! Addons and library synced.`);
    } catch {
      setMessage("Network error connecting to Stremio.");
    } finally {
      setBusy(false);
    }
  }

  function handleStremioDisconnect() {
    writeLocal("volta.stremio.authKey", "");
    writeLocal("volta.stremio.email", "");
    setStremioConnected(false);
    setStremioUserEmail("");
    setItems([]);
    setMessage("Stremio account disconnected.");
  }

  async function loadStremioLibrary() {
    setBusy(true);
    setMessage("");
    try {
      const key = readLocal("volta.stremio.authKey", "");
      if (!key) {
        setMessage("Please log into Stremio first.");
        return;
      }
      const res = await fetch("/api/stremio?action=library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authKey: key }),
      });
      const data = (await res.json()) as { items?: Array<{ id: string; name: string; type: string; poster?: string }> };
      if (Array.isArray(data.items)) {
        const mapped: Item[] = data.items.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle: i.type,
          image: i.poster || "/art/space.jpg",
        }));
        setItems(mapped);
      }
    } catch {
      setMessage("Could not load Stremio library.");
    } finally {
      setBusy(false);
    }
  }

  async function loadYouTube(kind = view, id = "") {
    setBusy(true);
    setMessage("");
    try {
      const d = await request(
        "/data?kind=" + encodeURIComponent(kind) + (id ? "&playlist=" + encodeURIComponent(id) : ""),
      );
      setItems(d.items || []);
      setView(kind);
      setPlaylist(id);
      if (!d.items?.length) setMessage("Nothing in this collection yet.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not load YouTube data.";
      setMessage(msg);
    } finally {
      setBusy(false);
    }
  }

  const isConnected = provider === "stremio" ? stremioConnected : status?.connected;

  return (
    <section className="provider-account">
      <div className="provider-account-heading">
        <span
          className={`service-icon ${provider === "youtube" ? "youtube-icon-badge" : "stremio-icon-badge"}`}
        >
          {provider === "youtube" ? (
            <Youtube size={24} className="yt-icon-svg" />
          ) : (
            <Film size={24} className="stremio-icon-svg" />
          )}
        </span>
        <div>
          <strong>Your {title} Account</strong>
          <p>
            {isConnected
              ? `Connected securely (${provider === "stremio" ? stremioUserEmail : "OAuth Active"})`
              : provider === "youtube"
                ? "Sign in to access your YouTube playlists and subscriptions on the road."
                : "Log into your official Stremio account to sync your library and addons."}
          </p>
        </div>
        <span className={`pill ${isConnected ? "pill-connected" : ""}`}>
          {isConnected ? "Connected" : "Optional"}
        </span>
      </div>

      <div className="button-row">
        {provider === "stremio" ? (
          isConnected ? (
            <>
              <button
                className="secondary"
                disabled={busy}
                onClick={loadStremioLibrary}
              >
                <Film size={16} />
                Load Stremio Library
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={handleStremioDisconnect}
              >
                <LogOut size={15} />
                Disconnect
              </button>
            </>
          ) : (
            <button
              className="primary"
              disabled={busy}
              onClick={() => setShowStremioForm(!showStremioForm)}
            >
              <LogIn size={16} />
              {showStremioForm ? "Cancel Login" : "Log In to Stremio"}
            </button>
          )
        ) : isConnected ? (
          <>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => loadYouTube("playlists")}
            >
              <Youtube size={16} />
              My Playlists
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => loadYouTube("subscriptions")}
            >
              My Subscriptions
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                try {
                  await request("/disconnect", true);
                  setItems([]);
                  await check();
                } catch {
                  // Ignore
                }
              }}
            >
              <LogOut size={15} />
              Disconnect
            </button>
          </>
        ) : (
          <button
            className="secondary"
            disabled={busy}
            onClick={connectYouTube}
          >
            <Link2 size={16} />
            Connect YouTube Account
          </button>
        )}

        <button
          className="icon-button"
          aria-label={`Refresh ${title} account status`}
          onClick={check}
        >
          <RefreshCw size={17} className={busy ? "spin" : ""} />
        </button>
      </div>

      {/* Stremio Direct Login Box */}
      {provider === "stremio" && showStremioForm && !isConnected && (
        <div className="provider-login-box">
          <h4>Sign in with Stremio Credentials</h4>
          <p>Direct login calls api.strem.io securely — no broken device links.</p>

          <div className="provider-form-inputs">
            <input
              type="email"
              placeholder="Stremio Email"
              value={stremioEmail}
              onChange={(e) => setStremioEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={stremioPassword}
              onChange={(e) => setStremioPassword(e.target.value)}
            />
          </div>

          <div className="or-divider"><span>OR PASTE AUTHKEY</span></div>

          <input
            type="text"
            placeholder="Stremio AuthKey (Optional)"
            value={stremioAuthKey}
            onChange={(e) => setStremioAuthKey(e.target.value)}
            className="authkey-input"
          />

          <button
            className="submit-login-btn small"
            onClick={handleDirectStremioLogin}
            disabled={busy}
          >
            {busy ? "Authenticating…" : "Connect Account & Sync Library"}
          </button>
        </div>
      )}

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      {/* Items view */}
      {items.length > 0 && (
        <div className="provider-items-grid">
          {playlist && (
            <button
              className="secondary back-btn"
              onClick={() => (provider === "youtube" ? loadYouTube("playlists") : loadStremioLibrary())}
            >
              <ArrowLeft size={16} /> Back to playlists
            </button>
          )}
          <div className="media-grid">
            {items.map((i) => (
              <div
                key={i.id}
                className="media-card"
                onClick={() => {
                  if (provider === "youtube" && view === "playlists" && !playlist) {
                    void loadYouTube("playlistItems", i.id);
                  } else {
                    onPlay({
                      id: i.id,
                      title: i.title,
                      subtitle: i.subtitle,
                      image: i.image,
                      source: provider === "youtube" ? "YouTube" : "Stremio",
                      youtubeId: i.youtubeId,
                    });
                  }
                }}
              >
                <div className="card-thumb">
                  <img src={i.image} alt={i.title} onError={(e) => { (e.target as HTMLImageElement).src = "/art/hero.jpg"; }} />
                  <div className="play-overlay"><Play size={24} fill="currentColor" /></div>
                </div>
                <div className="card-text">
                  <h5>{i.title}</h5>
                  <span>{i.subtitle}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
