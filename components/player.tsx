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

type CustomVideoElement = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

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
  const videoRef = useRef<CustomVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Drive Mode (Canvas In-Motion) vs Parked Mode (Native Video)
  const [inMotionMode, setInMotionMode] = useState(true);
  const [aspectMode, setAspectMode] = useState<"contain" | "cover">("contain");
  const [fullscreen, setFullscreen] = useState(false);

  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [useOfficialEmbed, setUseOfficialEmbed] = useState(Boolean(media.youtubeId));

  const lastSave = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameCallbackId = useRef<number | null>(null);
  const animFrameId = useRef<number | null>(null);

  // Canvas render loop for Tesla in-motion playback
  const renderCanvasFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !inMotionMode) return;

    if (video.readyState >= 2 && !video.paused && !video.ended) {
      const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      if (ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        const targetW = Math.max(1, Math.round(rect.width * dpr));
        const targetH = Math.max(1, Math.round(rect.height * dpr));

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const vw = video.videoWidth || 16;
        const vh = video.videoHeight || 9;
        const vAspect = vw / vh;
        const cAspect = targetW / targetH;

        let drawW = targetW;
        let drawH = targetH;
        let drawX = 0;
        let drawY = 0;

        if (aspectMode === "contain") {
          if (vAspect > cAspect) {
            drawH = Math.round(targetW / vAspect);
            drawY = Math.round((targetH - drawH) / 2);
          } else {
            drawW = Math.round(targetH * vAspect);
            drawX = Math.round((targetW - drawW) / 2);
          }
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, targetW, targetH);
        } else {
          // Cover mode
          if (vAspect > cAspect) {
            drawW = Math.round(targetH * vAspect);
            drawX = Math.round((targetW - drawW) / 2);
          } else {
            drawH = Math.round(targetW / vAspect);
            drawY = Math.round((targetH - drawH) / 2);
          }
        }

        ctx.drawImage(video, drawX, drawY, drawW, drawH);
      }
    }

    if (video.requestVideoFrameCallback) {
      frameCallbackId.current = video.requestVideoFrameCallback(() => {
        renderCanvasFrame();
      });
    } else {
      animFrameId.current = requestAnimationFrame(renderCanvasFrame);
    }
  }, [inMotionMode, aspectMode]);

  // Start canvas loop when playing
  useEffect(() => {
    const currentVideo = videoRef.current;
    if (playing && inMotionMode) {
      renderCanvasFrame();
    }
    return () => {
      if (currentVideo && frameCallbackId.current !== null && currentVideo.cancelVideoFrameCallback) {
        currentVideo.cancelVideoFrameCallback(frameCallbackId.current);
      }
      if (animFrameId.current !== null) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [playing, inMotionMode, renderCanvasFrame]);

  // Controls auto-hide
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setControlsVisible(false);
    }, 3500);
  }, [playing]);

  useEffect(() => {
    showControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showControls]);

  async function startPlayback() {
    const v = videoRef.current;
    if (!v) return;
    setError("");
    setWaiting(true);
    try {
      await v.play();
      setPlaying(true);
      setWaiting(false);
    } catch (e: unknown) {
      setWaiting(false);
      if (e instanceof DOMException && e.name === "NotAllowedError") {
        setError("Your browser requires a tap to start audio & video.");
      } else {
        setError("Playback failed to start. Verify stream availability.");
      }
    }
  }

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void startPlayback();
    } else {
      v.pause();
      setPlaying(false);
    }
  }, []);

  const seek = (seconds: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(seconds, v.duration));
  };

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.currentTime + delta, v.duration));
  }, []);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleVolumeChange = (newVol: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && v.muted) {
      v.muted = false;
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
      // Ignore fullscreen rejection
    }
  };

  // Video / HLS source setup
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !media.url || useOfficialEmbed) return;

    setError("");
    const resume = () => {
      if (media.progress && Number.isFinite(el.duration)) {
        el.currentTime = Math.min(media.progress, el.duration - 1);
      }
    };
    el.addEventListener("loadedmetadata", resume);

    if (
      /\.m3u8(?:\?|$)/i.test(media.url) &&
      !el.canPlayType("application/vnd.apple.mpegurl") &&
      Hls.isSupported()
    ) {
      const engine = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = engine;
      engine.loadSource(media.url);
      engine.attachMedia(el);
      engine.on(Hls.Events.MANIFEST_PARSED, () => {
        void startPlayback();
      });
      engine.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError("Stream could not play. Check CORS headers or source connectivity.");
        }
      });
    } else {
      el.src = media.url;
      void startPlayback();
    }

    return () => {
      el.removeEventListener("loadedmetadata", resume);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [media, useOfficialEmbed]);

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
  }, [onClose, skip, togglePlay]);

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
            {inMotionMode && !useOfficialEmbed && (
              <span className="drive-badge">
                <Car size={13} />
                <span>IN-MOTION CANVAS ACTIVE (PASSENGER PLAY)</span>
              </span>
            )}
            {useOfficialEmbed && (
              <span className="embed-badge">
                <Tv size={13} />
                <span>OFFICIAL YOUTUBE EMBED</span>
              </span>
            )}
          </div>
          <h2>{media.title}</h2>
          {media.subtitle && <p className="player-subtitle">{media.subtitle}</p>}
        </div>

        <div className="player-top-actions">
          {/* Mode switch for driving bypass */}
          {!useOfficialEmbed && (
            <button
              className={`mode-toggle-btn ${inMotionMode ? "active" : ""}`}
              onClick={() => setInMotionMode(!inMotionMode)}
              title="Toggle Canvas Driving Bypass Mode"
            >
              <Car size={16} />
              <span>{inMotionMode ? "Drive Mode (Canvas)" : "Parked Mode (Native)"}</span>
            </button>
          )}

          {media.youtubeId && (
            <button
              className="mode-toggle-btn"
              onClick={() => {
                setUseOfficialEmbed(!useOfficialEmbed);
              }}
            >
              <span>{useOfficialEmbed ? "Switch to Canvas" : "Switch to Embed"}</span>
            </button>
          )}

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

      {/* Main Video Viewport */}
      {useOfficialEmbed && media.youtubeId ? (
        <div className="youtube-embed-container">
          <iframe
            className="video"
            title={media.title}
            src={`https://www.youtube-nocookie.com/embed/${media.youtubeId}?autoplay=1&rel=0&playsinline=1`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
          <div className="youtube-hint-banner">
            <span>
              Tesla center console blocks standard video elements in Drive. For in-motion driving playback,
              use Live TV, Stremio streams, or direct video streams.
            </span>
          </div>
        </div>
      ) : (
        <div className="video-viewport" onClick={togglePlay}>
          {/* Canvas for Tesla in-motion playback */}
          <canvas
            ref={canvasRef}
            className={`player-canvas ${!inMotionMode ? "canvas-hidden" : ""}`}
          />

          {/* Off-screen or Native Video element */}
          <video
            className={`video ${inMotionMode ? "video-offscreen" : ""}`}
            ref={videoRef}
            preload="auto"
            poster={media.image}
            playsInline
            onWaiting={() => setWaiting(true)}
            onPlaying={() => {
              setWaiting(false);
              setPlaying(true);
            }}
            onCanPlay={() => setWaiting(false)}
            onLoadedMetadata={() => {
              const v = videoRef.current;
              if (v) setDuration(v.duration);
            }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onError={() => {
              setWaiting(false);
              setError(
                "Unable to play this stream. Check CORS headers, network access, or provider format.",
              );
            }}
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (!v) return;
              setTime(v.currentTime);
              setDuration(v.duration);
              if (Math.abs(v.currentTime - lastSave.current) > 5) {
                lastSave.current = v.currentTime;
                onProgress(v.currentTime, v.duration);
              }
            }}
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

          {/* Loading Indicator */}
          {waiting && !error && (
            <div className="player-loading">
              <LoaderCircle className="spin" size={40} />
              <span>Buffering in-motion stream…</span>
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
                void startPlayback();
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
      {!useOfficialEmbed && (
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
    </div>
  );
}
