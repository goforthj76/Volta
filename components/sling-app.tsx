"use client";

import { useEffect, useMemo, useState } from "react";
import type { SlingChannel } from "@/lib/sling";
import SlingPlayer from "./sling-player";
import styles from "./sling.module.css";

export default function SlingApp({
  onStartPlayback,
}: {
  onStartPlayback: () => void;
}) {
  const [channels, setChannels] = useState<SlingChannel[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<SlingChannel | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    fetch("/api/sling/channels", { signal: abort.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Sling's free channels are unavailable. Please retry.",
          );
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

  const visible = useMemo(
    () =>
      channels.filter((channel) =>
        `${channel.name} ${channel.group}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [channels, query],
  );

  return (
    <section className={styles.app} aria-label="Sling">
      <header className={styles.header}>
        <div>
          <img src="/sling-logo.svg" alt="Sling" className={styles.logo} />
          <h1>Sling</h1>
          <p>Freestream live channels · Watch while parked</p>
        </div>
        <a
          href="https://watch.sling.com"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.secondary}
        >
          Open official Sling
        </a>
      </header>
      <p className={styles.notice}>
        Free channels play here. Your paid Sling subscription is not connected
        yet.
      </p>
      <label className={styles.search}>
        <span>Find a channel</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search channels or categories"
        />
      </label>
      <div className={styles.feedback} aria-live="polite">
        {loading
          ? "Loading Sling channels…"
          : error || `${visible.length} free live channels`}
        {error && (
          <button
            className={styles.secondary}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry channel list
          </button>
        )}
      </div>
      {!loading && !error && (
        <div className={styles.grid}>
          {visible.map((channel) => (
            <button
              key={channel.id}
              className={styles.channel}
              aria-label={`Watch ${channel.name}`}
              onClick={() => {
                onStartPlayback();
                setSelected(channel);
              }}
            >
              <div className={styles.channelArt}>
                {channel.logo && (
                  <img
                    src={channel.logo}
                    alt=""
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.hidden = true;
                    }}
                  />
                )}
                <span className={styles.live}>LIVE</span>
              </div>
              <strong>{channel.name}</strong>
              <span>{channel.group}</span>
            </button>
          ))}
          {!visible.length && <p>No channels match your search.</p>}
        </div>
      )}
      {selected && (
        <SlingPlayer
          key={selected.id}
          channel={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
