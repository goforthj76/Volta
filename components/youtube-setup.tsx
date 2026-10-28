"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, KeyRound, RefreshCw, ExternalLink } from "lucide-react";
export default function YouTubeSetup() {
  const [connected, setConnected] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function check() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setConnected(Boolean(data.youtube?.configured));
    } catch {
      setError("Connection status could not be checked. Try again.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void check();
  }, []);
  return (
    <div className="youtube-setup">
      <div className="youtube-setup-status">
        {connected ? <CheckCircle2 size={19} /> : <KeyRound size={19} />}
        <span>
          {connected === null
            ? "Checking search connection…"
            : connected
              ? "YouTube API key is configured"
              : "One-time owner setup"}
        </span>
        <button
          className="icon-button"
          aria-label="Refresh YouTube connection status"
          disabled={busy}
          onClick={check}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      {!connected && (
        <>
          <p>
            Visitors can search and watch here once the owner connects an
            official YouTube API key. No Google sign-in is needed to search.
          </p>
          <ol>
            <li>
              <a
                href="https://console.cloud.google.com/projectcreate"
                target="_blank"
                rel="noopener noreferrer"
              >
                Create a Google Cloud project
                <ExternalLink size={12} />
              </a>{" "}
              named Volta.
            </li>
            <li>
              <a
                href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                Enable YouTube Data API v3
                <ExternalLink size={12} />
              </a>
              .
            </li>
            <li>
              Under APIs & Services → Credentials, create an API key and
              restrict it to YouTube Data API v3.
            </li>
            <li>
              Store the key in this site’s server secrets as{" "}
              <code>YOUTUBE_API_KEY</code>, then deploy the updated environment.
            </li>
          </ol>
          <small>
            Keep the key out of playlists, client code, and browser storage.
            Google’s daily API quota applies.
          </small>
        </>
      )}
      {error && <p role="status">{error}</p>}
    </div>
  );
}
