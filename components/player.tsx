"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  X,
  Maximize,
  Minimize,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  LoaderCircle,
  RotateCcw,
  RotateCw,
  Car,
  Tv,
} from "lucide-react";
import type { Media } from "@/lib/media";

export default function Player({
  media,
  onClose,
  onProgress,
  onFavorite,
  isFavorite,
}: {
  media: Media;
  onClose: () => void;
  onProgress: (seconds: number, duration: number) => void;
  onFavorite: () => void;
  isFavorite: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const rafRef = useRef<number>(0);

  // Anti-pause guard ref: tracks when the user intentionally pauses playback.
  // If Tesla's QtWebEngine/Chromium fires a pause event when the vehicle shifts into Drive,
  // we catch it and immediately resume playback.
  const userPausedRef = useRef<boolean>(false);

  // Drive Mode is active by default (Zero visible <video> in viewport, 100% Canvas blit + Audio)
  const [inMotionMode, setInMotionMode] = useState<boolean>(true);
  const [aspectMode, setAspectMode] = useState<"contain" | "cover">("contain");
  const [fullscreen, setFullscreen] = useState<boolean>(false);

  const [error, setError] = useState<string>("");
  const [playing, setPlaying] = useState<boolean>(false);
  const [time, setTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [waiting, setWaiting] = useState<boolean>(true);
  const [audioModalOpen, setAudioModalOpen] = useState<boolean>(false);

  // YouTube detection: Only treat as YouTube if explicitly YouTube source or only youtubeId is available
  const isYouTube = media.source === "YouTube" || (!media.url && Boolean(media.youtubeId));
  const lastSave = useRef<number>(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide controls
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setControlsVisible(false);
    }, 3500);
  }, [playing]);

  // Sync volume with Tesla bottom dock events
  useEffect(() => {
    const handleDockVolume = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const targetAudio = isYouTube ? audioRef.current : videoRef.current;
      if (!targetAudio) return;
      if (typeof detail?.muted === "boolean") {
        targetAudio.muted = detail.muted;
        setMuted(detail.muted);
      }
      if (typeof detail?.volume === "number") {
        const val = Math.max(0, Math.min(1, detail.volume / 100));
        targetAudio.volume = val;
        setVolume(val);
        if (val > 0 && targetAudio.muted) {
          targetAudio.muted = false;
          setMuted(false);
        }
      }
    };
    window.addEventListener("volta-dock-volume", handleDockVolume);
    return () => window.removeEventListener("volta-dock-volume", handleDockVolume);
  }, [isYouTube]);

  const forceUnmute = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (v) {
      if (!isYouTube) {
        v.muted = false;
        if (v.volume === 0) v.volume = 1;
      }
    }
    if (a && isYouTube) {
      a.muted = false;
      if (a.volume === 0) a.volume = 1;
    }
    setMuted(false);
    setVolume(1);
  }, [isYouTube]);

  // Master Play / Pause
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;

    if (playing) {
      userPausedRef.current = true;
      v.pause();
      if (isYouTube && a) a.pause();
      setPlaying(false);
    } else {
      userPausedRef.current = false;
      const playPromise = v.play();
      if (isYouTube && a) void a.play().catch(() => {});
      playPromise
        .then(() => {
          setPlaying(true);
          setWaiting(false);
        })
        .catch(() => {
          // If unmuted autoplay blocked, retry muted so the video still starts
          v.muted = true;
          if (!isYouTube) setMuted(true);
          void v.play().then(() => setPlaying(true)).catch(() => {});
        });
    }
  }, [playing, isYouTube]);

  const handleViewportClick = () => {
    if (muted) {
      forceUnmute();
      return;
    }
    togglePlay();
  };

  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  // Seek
  const seek = useCallback((seconds: number) => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (v && Number.isFinite(seconds)) {
      v.currentTime = Math.max(0, seconds);
    }
    if (isYouTube && a && Number.isFinite(seconds)) {
      a.currentTime = Math.max(0, seconds);
    }
    setTime(seconds);
  }, [isYouTube]);

  const skip = useCallback(
    (delta: number) => {
      const current = time;
      const target = Math.max(0, current + delta);
      seek(target);
    },
    [time, seek],
  );

  const toggleMute = useCallback(() => {
    const targetAudio = isYouTube ? audioRef.current : videoRef.current;
    if (!targetAudio) return;
    targetAudio.muted = !targetAudio.muted;
    setMuted(targetAudio.muted);
    if (!targetAudio.muted && targetAudio.volume === 0) {
      targetAudio.volume = 1;
      setVolume(1);
    }
  }, [isYouTube]);

  const handleVolumeChange = (newVol: number) => {
    const targetAudio = isYouTube ? audioRef.current : videoRef.current;
    if (!targetAudio) return;
    targetAudio.volume = newVol;
    setVolume(newVol);
    if (newVol > 0) {
      targetAudio.muted = false;
      setMuted(false);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      // Fullscreen not permitted or rejected
    }
  };

  // Canvas Blit Loop (Proven Tesla in-motion blit architecture)
  useEffect(() => {
    if (!inMotionMode) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;

    const ctx = c.getContext("2d", { alpha: false });
    if (!ctx) return;

    const blit = () => {
      if (v.videoWidth > 0 && v.videoHeight > 0) {
        const w = c.clientWidth;
        const h = c.clientHeight;
        if (w > 0 && h > 0) {
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const pw = Math.round(w * dpr);
          const ph = Math.round(h * dpr);
          if (c.width !== pw || c.height !== ph) {
            c.width = pw;
            c.height = ph;
          }

          if (aspectMode === "cover") {
            const s = Math.max(pw / v.videoWidth, ph / v.videoHeight);
            const dw = v.videoWidth * s;
            const dh = v.videoHeight * s;
            const dx = (pw - dw) / 2;
            const dy = (ph - dh) / 2;
            try {
              ctx.drawImage(v, dx, dy, dw, dh);
            } catch {
              // cross-origin draw catch
            }
          } else {
            // Contain-fit, letterboxed on pitch black
            const s = Math.min(pw / v.videoWidth, ph / v.videoHeight);
            const dw = v.videoWidth * s;
            const dh = v.videoHeight * s;
            const dx = (pw - dw) / 2;
            const dy = (ph - dh) / 2;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, pw, ph);
            try {
              ctx.drawImage(v, dx, dy, dw, dh);
            } catch {
              // cross-origin draw catch
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(blit);
    };

    rafRef.current = requestAnimationFrame(blit);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [inMotionMode, aspectMode]);

  // Anti-Pause Guardian: Intercepts QtWebEngine/Chromium vehicle pause events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handlePause = () => {
      // If the pause was not triggered by an explicit user gesture and inMotionMode is active,
      // it was triggered by Tesla shifting out of Park. Instantly resume playback!
      if (!userPausedRef.current && inMotionMode) {
        void v.play().catch(() => {});
      } else {
        setPlaying(false);
      }
    };

    const handlePlay = () => {
      setPlaying(true);
      setWaiting(false);
    };

    const handleWaiting = () => {
      setWaiting(true);
    };

    const handlePlaying = () => {
      setWaiting(false);
      setPlaying(true);
    };

    const handleTimeUpdate = () => {
      if (!isYouTube) {
        setTime(v.currentTime);
        setDuration(v.duration || 0);
        if (Math.abs(v.currentTime - lastSave.current) > 5) {
          lastSave.current = v.currentTime;
          onProgressRef.current(v.currentTime, v.duration || 0);
        }
      }
    };

    v.addEventListener("pause", handlePause);
    v.addEventListener("play", handlePlay);
    v.addEventListener("waiting", handleWaiting);
    v.addEventListener("playing", handlePlaying);
    v.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      v.removeEventListener("pause", handlePause);
      v.removeEventListener("play", handlePlay);
      v.removeEventListener("waiting", handleWaiting);
      v.removeEventListener("playing", handlePlaying);
      v.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [inMotionMode, isYouTube]);

  // Main Stream Loader: Supports Live TV (HLS), Stremio (MP4/MKV), and YouTube
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (!v) return;

    userPausedRef.current = false;
    setWaiting(true);
    setError("");

    // Cleanup previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let isCancelled = false;

    if (isYouTube) {
      // YouTube uses official iframe embed: zero 403 errors, full 1080p, immediate playback
      setWaiting(false);
      setError("");
      setPlaying(true);
      return;
    } else if (media.url) {
      // 2. Live TV & Stremio / Direct Movies
      const targetUrl = media.url;
      const isM3U8 =
        /\.m3u8(?:\?|$)/i.test(targetUrl) ||
        media.source === "Live TV" ||
        targetUrl.includes("/live/");

      // Ensure stream goes through CORS proxy if external
      const proxiedStreamUrl =
        targetUrl.startsWith("/api/proxy") || targetUrl.startsWith("/")
          ? targetUrl
          : `/api/proxy?url=${encodeURIComponent(targetUrl)}`;

      if (isM3U8) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 30,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;
          hls.loadSource(proxiedStreamUrl);
          hls.attachMedia(v);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (isCancelled) return;
            v.play().catch(() => {
              v.muted = true;
              setMuted(true);
              void v.play().catch(() => {});
            });
          });
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal && !isCancelled) {
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                hls.startLoad();
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
              } else {
                setError("Stream playback error. Tap Try Again or Sound/Codec to adjust.");
              }
            }
          });
        } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
          v.src = proxiedStreamUrl;
          void v.play().catch(() => {
            v.muted = true;
            setMuted(true);
            void v.play().catch(() => {});
          });
        }
      } else {
        // Direct MP4 / Stremio Movie Stream
        v.src = proxiedStreamUrl;
        void v.play().catch(() => {
          v.muted = true;
          setMuted(true);
          void v.play().catch(() => {});
        });
      }
    } else {
      setWaiting(false);
      setError("No valid stream URL found for this title.");
    }

    return () => {
      isCancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      v.pause();
      v.removeAttribute("src");
      v.load();
      if (a) {
        a.pause();
        a.removeAttribute("src");
        a.load();
      }
    };
  }, [media, isYouTube]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "ArrowLeft") skip(-10);
      if (e.key === "ArrowRight") skip(10);
      if (e.key === "m" || e.key === "M") toggleMute();
      if (e.key === "f" || e.key === "F") void toggleFullscreen();
    };
    document.addEventListener("keydown", handleKeyDown);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = before;
    };
  }, [onClose, skip, togglePlay, toggleMute]);

  const format = (s: number) =>
    Number.isFinite(s)
      ? `${Math.floor(s / 60)}:${Math.floor(s % 60)
          .toString()
          .padStart(2, "0")}`
      : "LIVE";

  return (
    <div
      className="player-overlay"
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={media.title}
      onPointerMove={showControls}
      onClick={showControls}
    >
      {/* Top Header HUD */}
      <div className={`player-top ${!controlsVisible ? "hidden-controls" : ""}`}>
        <div className="player-title-box">
          <div className="player-badges">
            <span className="eyebrow">{media.source.toUpperCase()}</span>
            {inMotionMode ? (
              <span className="drive-badge">
                <Car size={13} />
                <span>IN-MOTION CANVAS ACTIVE (PASSENGER PLAY)</span>
              </span>
            ) : (
              <span className="embed-badge">
                <Tv size={13} />
                <span>PARKED MODE (NATIVE VIDEO)</span>
              </span>
            )}
          </div>
          <h2>{media.title}</h2>
          {media.subtitle && <p className="player-subtitle">{media.subtitle}</p>}
        </div>

        <div className="player-top-actions">
          {/* Mode switch for driving bypass */}
          <button
            className={`mode-toggle-btn ${inMotionMode ? "active" : ""}`}
            onClick={() => setInMotionMode(!inMotionMode)}
            title="Toggle Driving In-Motion Canvas Mode"
          >
            <Car size={16} />
            <span>{inMotionMode ? "Drive Mode (Canvas)" : "Parked Mode (Native)"}</span>
          </button>

          {/* Audio Diagnostics & Codec Assistant */}
          <button
            className="mode-toggle-btn audio-diag-btn"
            onClick={() => setAudioModalOpen(true)}
            title="Audio settings, unmuting, and codec fix"
          >
            <Volume2 size={16} />
            <span>Sound / Codec</span>
          </button>

          <button
            className={`icon-button ${isFavorite ? "favorite-active" : ""}`}
            onClick={onFavorite}
            aria-label="Add to favorites"
          >
            <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
          </button>

          <button
            className="icon-button close-btn"
            aria-label="Close player"
            autoFocus
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      {isYouTube && media.youtubeId ? (
        <div className="youtube-embed-container">
          <iframe
            className="video"
            title={media.title}
            src={`https://www.youtube-nocookie.com/embed/${media.youtubeId}?autoplay=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="video-viewport" onClick={handleViewportClick}>
          {/* Hardware-accelerated Video Element. In Drive Mode, pushed off-screen with opacity: 1 so Chromium compositor actively renders frames */}
          <video
            ref={videoRef}
            className={inMotionMode ? "video-offscreen" : "video"}
            playsInline
            crossOrigin="anonymous"
            poster={media.image}
            preload="auto"
            onEnded={() => {
              onProgress(duration, duration);
              setPlaying(false);
            }}
            onError={() => {
              const v = videoRef.current;
              // If the proxied stream failed and we haven't tried direct yet, fallback to raw media.url
              if (v && media.url && v.src.includes("/api/proxy") && !v.src.endsWith(media.url)) {
                v.src = media.url;
                void v.play().catch(() => {});
                return;
              }
              setWaiting(false);
              setError("Unable to play stream. Tap Try Again or Sound/Codec to adjust.");
            }}
          />

          {/* Visible Canvas in Drive Mode: Tesla's in-motion video block does NOT apply to Canvas */}
          <canvas
            ref={canvasRef}
            className={`player-canvas ${!inMotionMode ? "canvas-hidden" : ""}`}
            width={1280}
            height={720}
          />

          {/* Audio Element */}
          <audio
            ref={audioRef}
            playsInline
            preload="auto"
            onEnded={() => {
              onProgress(duration, duration);
              setPlaying(false);
            }}
          />

          {/* Center Play Indicator on Pause */}
          {!playing && !error && !waiting && (
            <div className="center-play-button">
              <Play size={44} fill="currentColor" />
            </div>
          )}

          {/* Muted Autoplay Banner Pill */}
          {playing && muted && (
            <button
              className="unmute-banner-pill"
              onClick={(e) => {
                e.stopPropagation();
                forceUnmute();
              }}
            >
              <VolumeX size={18} />
              <span>🔇 AUDIO MUTED · TAP ANYWHERE TO UNMUTE 🔊</span>
            </button>
          )}

          {/* Loading Spinner */}
          {waiting && !error && (
            <div className="player-loading">
              <LoaderCircle className="spin" size={40} />
              <span>{inMotionMode ? "Buffering in-motion stream…" : "Buffering stream…"}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="playback-error">
          <h2>Stream Notice</h2>
          <p>{error}</p>
          <div className="error-actions">
            <button
              className="primary"
              onClick={() => {
                setError("");
                setWaiting(true);
                const v = videoRef.current;
                if (v) void v.play().catch(() => {});
              }}
            >
              Try Again
            </button>
            <button className="secondary" onClick={onClose}>
              Close Player
            </button>
          </div>
        </div>
      )}

      {/* Bottom HUD Controls */}
      {!isYouTube && (
        <div className={`player-bottom ${!controlsVisible ? "hidden-controls" : ""}`}>
          {/* Progress Timeline Scrubber */}
          {Number.isFinite(duration) && duration > 0 && (
            <div className="timeline-container">
              <input
                type="range"
                className="timeline-slider"
                min={0}
                max={duration || 100}
                value={time}
                step={0.5}
                onChange={(e) => seek(parseFloat(e.target.value))}
                aria-label="Seek timeline"
              />
              <div className="timeline-times">
                <span>{format(time)}</span>
                <span>{format(duration)}</span>
              </div>
            </div>
          )}

          {/* Touch Controls Bar */}
          <div className="player-actions">
            <button
              className="action-btn play-pause-btn"
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
            </button>

            {Number.isFinite(duration) && duration > 0 && (
              <>
                <button
                  className="action-btn skip-btn"
                  onClick={() => skip(-10)}
                  aria-label="Skip backward 10s"
                >
                  <RotateCcw size={20} />
                  <span className="skip-label">10s</span>
                </button>
                <button
                  className="action-btn skip-btn"
                  onClick={() => skip(10)}
                  aria-label="Skip forward 10s"
                >
                  <RotateCw size={20} />
                  <span className="skip-label">10s</span>
                </button>
              </>
            )}

            {/* Live Indicator */}
            {(!Number.isFinite(duration) || duration === 0) && (
              <div className="live-pill">
                <span className="live-dot" />
                <span>LIVE FEED</span>
              </div>
            )}

            <div className="spacer" />

            {/* Aspect Ratio Toggle (Fit vs Fill) */}
            <button
              className="action-btn aspect-btn"
              onClick={() => setAspectMode(aspectMode === "contain" ? "cover" : "contain")}
              title={`Current: ${aspectMode.toUpperCase()}`}
            >
              <span>{aspectMode === "contain" ? "FIT" : "FILL"}</span>
            </button>

            {/* Volume */}
            <div className="volume-control">
              <button
                className="action-btn"
                onClick={toggleMute}
                aria-label={muted ? "Unmute" : "Mute"}
              >
                {muted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
              </button>
              <input
                type="range"
                className="volume-slider"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                aria-label="Volume"
              />
            </div>

            {/* Fullscreen */}
            <button
              className="action-btn fullscreen-btn"
              onClick={() => void toggleFullscreen()}
              aria-label="Toggle Fullscreen"
            >
              {fullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
            </button>
          </div>
        </div>
      )}

      {/* Audio Diagnostics & Codec Assistant Modal */}
      {audioModalOpen && (
        <div className="audio-modal-overlay" onClick={() => setAudioModalOpen(false)}>
          <div className="audio-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="audio-modal-header">
              <div className="audio-icon-wrap">
                <Volume2 size={24} />
              </div>
              <div className="audio-header-text">
                <h3>Audio Diagnostics & Sound Fix</h3>
                <p>Tesla Sound, Codecs & In-Motion Status</p>
              </div>
              <button
                className="icon-button close-btn"
                onClick={() => setAudioModalOpen(false)}
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="audio-status-box">
              <div className="audio-status-row">
                <span>Sound Output:</span>
                <strong style={{ color: muted ? "#f87171" : "#4ade80" }}>
                  {muted
                    ? "MUTED (Browser Autoplay Policy)"
                    : `UNMUTED (${Math.round(volume * 100)}% Volume)`}
                </strong>
              </div>
              <div className="audio-status-row">
                <span>Playback Mode:</span>
                <strong style={{ color: "#38bdf8" }}>
                  {inMotionMode
                    ? "In-Motion Drive Mode (Canvas Active)"
                    : "Parked Native Video Mode"}
                </strong>
              </div>
              <div className="audio-status-row">
                <span>Stream Source:</span>
                <strong className="text-truncate">
                  {media.source} · {media.title}
                </strong>
              </div>
            </div>

            <div className="audio-codec-explanation">
              <h4>In-Motion Tesla Driving Bypass Details</h4>
              <p>
                Tesla vehicles pause visible <code>&lt;video&gt;</code> HTML tags when shifting
                into Drive. Volta streams video through an offscreen hardware-accelerated pipeline
                with an active compositor and blits frames to a visible canvas at display rate.
                Audio plays natively through the Tesla audio bus.
              </p>
            </div>

            <div className="audio-actions-list">
              <button
                className="audio-action-btn primary"
                onClick={() => {
                  forceUnmute();
                  setAudioModalOpen(false);
                }}
              >
                <Volume2 size={18} />
                <span>Force Unmute & Set Max Volume (100%)</span>
              </button>

              <button
                className="audio-action-btn accent"
                onClick={() => {
                  setInMotionMode(!inMotionMode);
                  setAudioModalOpen(false);
                }}
              >
                <Car size={18} />
                <span>
                  Toggle to {inMotionMode ? "Parked Native Video" : "In-Motion Canvas Mode"}
                </span>
              </button>

              <button
                className="audio-action-btn dismiss"
                onClick={() => setAudioModalOpen(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
