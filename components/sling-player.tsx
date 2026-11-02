"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import type shakaTypes from "shaka-player";
import type { SlingChannel } from "@/lib/sling";
import styles from "./sling.module.css";

export default function SlingPlayer({
  channel,
  onClose,
  onSwitchToDrivePlayer,
}: {
  channel: SlingChannel;
  onClose: () => void;
  onSwitchToDrivePlayer?: (channel: SlingChannel) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState("Connecting to Sling live broadcast…");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    closeRef.current?.focus();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let disposed = false;
    let player: shakaTypes.Player | undefined;
    const abort = new AbortController();
    setStatus("Connecting to Sling live broadcast…");
    setError("");
    const fail = (message: string) => {
      if (!disposed) {
        setError(message);
        setStatus("Protected playback unavailable on this browser");
      }
    };

    async function start() {
      if (!video) return;
      try {
        const shaka = (await import("shaka-player")).default;
        if (disposed) return;
        shaka.polyfill.installAll();
        if (
          !shaka.Player.isBrowserSupported() ||
          !navigator.requestMediaKeySystemAccess
        ) {
          fail(
            "This browser does not support Widevine DRM. Tap 'Switch to Driving Canvas Player' below to watch in motion.",
          );
          return;
        }
        player = new shaka.Player();
        player.addEventListener("error", () =>
          fail(
            "Protected stream license unavailable on this device. Tap 'Switch to Driving Canvas Player' below.",
          ),
        );
        await player.attach(video);
        if (disposed) return;
        const networking = player.getNetworkingEngine();
        networking?.registerRequestFilter((type, outgoing) => {
          outgoing.uris = outgoing.uris.map((uri) => {
            const url = new URL(uri, window.location.href);
            if (
              url.protocol === "http:" &&
              url.origin !== window.location.origin
            )
              url.protocol = "https:";
            return url.href;
          });
          if (type === shaka.net.NetworkingEngine.RequestType.LICENSE)
            outgoing.headers["Content-Type"] = "application/octet-stream";
        });
        player.configure({
          drm: {
            servers: {
              "com.widevine.alpha": `${window.location.origin}/api/sling/license?channel=${encodeURIComponent(channel.id)}`,
            },
          },
        });
        const response = await fetch(
          `/api/sling/stream?channel=${encodeURIComponent(channel.id)}`,
          { signal: abort.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error("Sling stream endpoint returned error.");
        const data = await response.json();
        if (
          typeof data.manifest !== "string" ||
          !data.manifest.startsWith("https://")
        )
          throw new Error("Unsupported stream format.");
        if (disposed) return;
        await player.load(data.manifest);
        if (disposed) return;
        setStatus("Ready. Press Play if playback does not start.");
        try {
          await video?.play();
        } catch {
          /* Native Play remains available if autoplay is blocked. */
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        fail(
          msg.includes("DRM") || msg.includes("license")
            ? "DRM license unavailable on this browser. Tap 'Switch to Driving Canvas Player' below."
            : "Stream unavailable on direct player. Switch to Driving Canvas Player below.",
        );
      }
    }
    void start();
    return () => {
      disposed = true;
      abort.abort();
      video.pause();
      if (player) void player.destroy().catch(() => undefined);
    };
  }, [channel.id, attempt]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={`Sling: ${channel.name}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.playerHeader}>
        <div>
          <span className={styles.liveBadge} style={{ position: "static", display: "inline-block", marginBottom: "4px" }}>
            SLING · LIVE
          </span>
          <h2 style={{ margin: "4px 0" }}>{channel.name}</h2>
          <p style={{ margin: "2px 0", fontSize: "12px", color: "#8da4be" }}>
            Passenger Driving Mode Compatible · Full Sound Enabled
          </p>
        </div>
        <button
          ref={closeRef}
          className={styles.secondary}
          onClick={onClose}
          aria-label="Close Sling player"
        >
          Close
        </button>
      </div>

      <div ref={viewportRef} className={styles.viewport}>
        <video
          ref={videoRef}
          controls
          playsInline
          autoPlay
          aria-label={channel.name}
          onPlaying={() => {
            setStatus("Playing live");
            setError("");
          }}
        />
      </div>

      <div className={styles.playerFooter}>
        <p role={error ? "alert" : "status"}>{error || status}</p>
        <div className={styles.actions}>
          {onSwitchToDrivePlayer && (
            <button
              className={styles.secondary}
              style={{
                background: "#00a3e0",
                color: "#04101c",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              onClick={() => {
                onClose();
                onSwitchToDrivePlayer(channel);
              }}
            >
              <Play size={14} fill="currentColor" />
              <span>Switch to Driving Canvas Player</span>
            </button>
          )}
          {error && (
            <button
              className={styles.secondary}
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry
            </button>
          )}
          <button
            className={styles.secondary}
            onClick={() => {
              void viewportRef.current
                ?.requestFullscreen?.()
                .catch(() =>
                  setStatus(
                    "Fullscreen is unavailable. You can use the video's native controls.",
                  ),
                );
            }}
          >
            Fullscreen
          </button>
        </div>
      </div>
    </dialog>
  );
}
