"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Link2,
  LogOut,
  ArrowLeft,
  Library,
  RefreshCw,
  Play,
} from "lucide-react";
import type { Media } from "@/lib/media";
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
    } | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState<{ code: string; link: string } | null>(null),
    [items, setItems] = useState<Item[]>([]),
    [view, setView] = useState("playlists"),
    [playlist, setPlaylist] = useState("");
  const base = "/api/connections/" + provider;
  const title = provider === "youtube" ? "YouTube" : "Stremio";
  const check = useCallback(async () => {
    try {
      const r = await fetch(base + "/status", { cache: "no-store" });
      if (!r.ok) throw new Error();
      setStatus(await r.json());
    } catch {
      setMessage("Connection status could not be checked.");
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
  async function connect() {
    setMessage("");
    if (provider === "youtube") {
      if (!status?.configured) {
        setMessage(
          "The site owner needs to add a Google OAuth web client before account login can be enabled. Public search already works.",
        );
        return;
      }
      location.assign(base + "/start");
      return;
    }
    setBusy(true);
    try {
      setLink(await request("/start", true));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  }
  async function poll() {
    setBusy(true);
    try {
      const d = await request("/poll", true);
      if (d.connected) {
        setLink(null);
        await check();
        setMessage(
          "Your Stremio account is connected. Open your library below.",
        );
      } else
        setMessage(
          "Waiting for approval. Complete sign-in on Stremio, then check again.",
        );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not check approval.");
    } finally {
      setBusy(false);
    }
  }
  async function load(kind = view, id = "") {
    setBusy(true);
    setMessage("");
    try {
      const d = await request(
        "/data" +
          (provider === "youtube"
            ? `?kind=${encodeURIComponent(kind)}${id ? "&playlist=" + encodeURIComponent(id) : ""}`
            : ""),
      );
      setItems(d.items || []);
      setView(kind);
      setPlaylist(id);
      if (!d.items?.length) setMessage("Nothing in this collection yet.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not load your library.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="provider-account">
      <div className="provider-account-heading">
        <span
          className={`service-icon ${provider === "youtube" ? "youtube-icon" : "stremio-icon"}`}
        >
          <Library size={21} />
        </span>
        <div>
          <strong>Your {title} account</strong>
          <p>
            {status?.connected
              ? "Connected securely on this browser"
              : provider === "youtube"
                ? "Bring your playlists and subscriptions."
                : "Connect your library without sharing your password with Volta."}
          </p>
        </div>
        <span className="pill">
          {status?.connected ? "Connected" : "Optional"}
        </span>
      </div>
      <div className="button-row">
        {status?.connected ? (
          <>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                load(provider === "youtube" ? "playlists" : "library")
              }
            >
              <Library size={16} />
              {provider === "youtube" ? "My playlists" : "My library"}
            </button>
            {provider === "youtube" && (
              <button
                className="secondary"
                disabled={busy}
                onClick={() => load("subscriptions")}
              >
                My subscriptions
              </button>
            )}
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                try {
                  await request("/disconnect", true);
                  setItems([]);
                  setLink(null);
                  await check();
                } catch (e) {
                  setMessage(String(e));
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
            disabled={busy || !status}
            onClick={connect}
          >
            <Link2 size={16} />
            {busy ? "Connecting…" : `Connect ${title}`}
          </button>
        )}
        <button
          className="icon-button"
          aria-label={`Refresh ${title} account status`}
          onClick={check}
        >
          <RefreshCw size={15} />
        </button>
      </div>
      {link && (
        <div className="provider-approval">
          <strong>Approve your connection on Stremio</strong>
          <p>
            Use the official approval page. Your password stays with Stremio.
            This code expires shortly.
          </p>
          <a
            className="primary"
            href={link.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Stremio approval
          </a>
          <button className="secondary" disabled={busy} onClick={poll}>
            I’ve approved — check connection
          </button>
          <small>Connection code: {link.code}</small>
        </div>
      )}
      {provider === "youtube" && status && !status.configured && (
        <details className="connection-owner-setup">
          <summary>Owner setup: enable Google account login</summary>
          <ol>
            <li>
              In the Google Cloud project used for search, configure the OAuth
              consent screen and add your own email as a test user.
            </li>
            <li>
              Create an OAuth client ID with application type Web application.
            </li>
            <li>
              Add this exact authorized redirect URI:{" "}
              <code>{status.callback}</code>
            </li>
            <li>
              Configure server secrets <code>GOOGLE_CLIENT_ID</code> and{" "}
              <code>GOOGLE_CLIENT_SECRET</code>, then deploy. No visitor Google
              password is handled by Volta.
            </li>
          </ol>
        </details>
      )}
      {message && (
        <p className="provider-message" role="status">
          {message}
        </p>
      )}
      {playlist && (
        <button className="text-link" onClick={() => load("playlists")}>
          <ArrowLeft size={14} />
          Back to playlists
        </button>
      )}
      {items.length > 0 && (
        <div className="account-items">
          {items.map((i) => (
            <button
              key={i.id}
              className="account-item"
              disabled={provider === "youtube" && view === "subscriptions"}
              onClick={() => {
                if (provider === "youtube" && view === "playlists") {
                  void load("playlistItems", i.id);
                  return;
                }
                onPlay({
                  id: i.id,
                  title: i.title,
                  image: i.image,
                  subtitle: i.subtitle,
                  source: provider === "youtube" ? "YouTube" : "Stremio",
                  youtubeId: i.youtubeId,
                });
              }}
            >
              {i.image && <img src={i.image} alt="" loading="lazy" />}
              <span>
                <strong>{i.title}</strong>
                <small>
                  {provider === "youtube" && view === "subscriptions"
                    ? "Subscribed channel"
                    : i.subtitle}
                </small>
              </span>
              {i.youtubeId && <Play size={16} />}
            </button>
          ))}
        </div>
      )}
      {provider === "stremio" && (
        <small className="connection-limitation">
          Account linking imports metadata, not playback rights or a torrent
          engine. Choose an authorized browser-compatible source to play a
          library title.
        </small>
      )}
      {provider === "youtube" && (
        <small className="connection-limitation">
          Read-only account access. Google’s watch history and personalized home
          feed are not exposed by this integration. YouTube Premium benefits may
          not carry into embedded playback.
        </small>
      )}
    </section>
  );
}
