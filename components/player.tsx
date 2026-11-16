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
import {
  InMotionMP4Player,
  InMotionTSPlayer,
  type IInMotionPlayer,
} from "@/lib/inmotion-engine";

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
  // Parked mode native video ref
  const videoRef = useRef<CustomVideoElement>(null);
  // In-Motion drive mode canvas and audio refs (ZERO <video> tag in DOM!)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const inMotionPlayerRef = useRef<IInMotionPlayer | null>(null);

  // Drive Mode is active by default (Zero <video> tag, 100% Canvas + Audio)
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
  const [useOfficialEmbed] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);

  const lastSave = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Controls auto-hide
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing) setControlsVisible(false);
    }, 3500);
  }, [playing]);

  // Sync audio with Tesla bottom dock
  useEffect(() => {
    const handleDockVolume = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const targetAudio = inMotionMode ? audioRef.current : videoRef.current;
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
  }, [inMotionMode]);

  const forceUnmute = useCallback(() => {
    const targetAudio = inMotionMode ? audioRef.current : videoRef.current;
    if (!targetAudio) return;
    targetAudio.muted = false;
    if (targetAudio.volume === 0) targetAudio.volume = 1;
    setVolume(targetAudio.volume);
    setMuted(false);
  }, [inMotionMode]);

  const handleViewportClick = () => {
    const targetAudio = inMotionMode ? audioRef.current : videoRef.current;
    if (targetAudio && (muted || targetAudio.muted)) {
      forceUnmute();
      return;
    }
    togglePlay();
  };

  useEffect(() => {
    showControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showControls]);

  // Start In-Motion Playback (Zero <video> tag, 100% Canvas + Audio)
  const startInMotionEngine = useCallback(async () => {
    if (!canvasRef.current || !audioRef.current) return;
    setWaiting(true);
    setError("");

    inMotionPlayerRef.current?.destroy();
    inMotionPlayerRef.current = null;

    try {
      if (media.youtubeId) {
        // 1. YouTube in Drive: Resolve direct stream via serverless extractor
        const res = await fetch(`/api/youtube/stream?v=${encodeURIComponent(media.youtubeId)}`);
        if (!res.ok) {
          throw new Error("Unable to resolve YouTube direct stream. Retrying...");
        }
        const data = await res.json();
        if (!data.video?.proxyUrl || !data.audio?.proxyUrl) {
          throw new Error(data.error || "No playable stream returned");
        }

        const player = new InMotionMP4Player({
          canvas: canvasRef.current,
          audio: audioRef.current,
          videoUrl: data.video.proxyUrl,
          audioUrl: data.audio.proxyUrl,
          onReady: () => {
            setWaiting(false);
            if (audioRef.current) {
              audioRef.current
                .play()
                .then(() => setPlaying(true))
                .catch(() => {
                  if (audioRef.current) {
                    audioRef.current.muted = true;
                    setMuted(true);
                    audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
                  }
                });
            }
          },
          onError: (err) => {
            setWaiting(false);
            setError(err);
          },
          onProgress: (cur, dur) => {
            setTime(cur);
            setDuration(dur);
          },
        });
        inMotionPlayerRef.current = player;
        await player.start();
      } else if (media.url) {
        const targetUrl = media.url;
        const isM3U8 =
          /\.m3u8(?:\?|$)/i.test(targetUrl) ||
          media.source === "Live TV" ||
          targetUrl.includes("/live/");

        if (isM3U8) {
          // 2. Live TV (HLS MPEG-TS in Drive Mode)
          const proxiedStreamUrl = targetUrl.startsWith("/api/proxy")
            ? targetUrl
            : `/api/proxy?url=${encodeURIComponent(targetUrl)}`;

          const player = new InMotionTSPlayer({
            canvas: canvasRef.current,
            audio: audioRef.current,
            videoUrl: proxiedStreamUrl,
            isLive: true,
            onReady: () => {
              setWaiting(false);
              if (audioRef.current) {
                audioRef.current
                  .play()
                  .then(() => setPlaying(true))
                  .catch(() => {
                    if (audioRef.current) {
                      audioRef.current.muted = true;
                      setMuted(true);
                      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
                    }
                  });
              }
            },
            onError: (err) => {
              setWaiting(false);
              setError(err);
            },
          });
          inMotionPlayerRef.current = player;
          await player.start();
        } else {
          // 3. Stremio & Direct MP4 in Drive Mode
          const player = new InMotionMP4Player({
            canvas: canvasRef.current,
            audio: audioRef.current,
            videoUrl: targetUrl,
            audioUrl: targetUrl,
            onReady: () => {
              setWaiting(false);
              if (audioRef.current) {
                audioRef.current
                  .play()
                  .then(() => setPlaying(true))
                  .catch(() => {
                    if (audioRef.current) {
                      audioRef.current.muted = true;
                      setMuted(true);
                      audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
                    }
                  });
              }
            },
            onError: (err) => {
              setWaiting(false);
              setError(err);
            },
            onProgress: (cur, dur) => {
              setTime(cur);
              setDuration(dur);
            },
          });
          inMotionPlayerRef.current = player;
          await player.start();
        }
      }
    } catch (err: unknown) {
      setWaiting(false);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [media]);

  // Parked mode playback (traditional native video element)
  const startParkedPlayback = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    setError("");
    setWaiting(true);
    try {
      v.volume = volume > 0 ? volume : 1;
      await v.play();
      setPlaying(true);
      setWaiting(false);
      setMuted(false);
    } catch {
      try {
        v.muted = true;
        setMuted(true);
        await v.play();
        setPlaying(true);
        setWaiting(false);
      } catch {
        setWaiting(false);
        setPlaying(false);
      }
    }
  }, [volume]);

  // Master toggle play/pause
  const togglePlay = useCallback(() => {
    if (inMotionMode) {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) {
        a.play()
          .then(() => {
            setPlaying(true);
            setWaiting(false);
          })
          .catch(() => {
            a.muted = true;
            setMuted(true);
            return a.play().then(() => setPlaying(true));
          });
      } else {
        a.pause();
        setPlaying(false);
      }
    } else {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        v.play()
          .then(() => {
            setPlaying(true);
            setWaiting(false);
          })
          .catch(() => {
            v.muted = true;
            setMuted(true);
            return v.play().then(() => setPlaying(true));
          });
      } else {
        v.pause();
        setPlaying(false);
      }
    }
  }, [inMotionMode]);

  const seek = (seconds: number) => {
    if (inMotionMode) {
      const a = audioRef.current;
      if (a && Number.isFinite(a.duration)) {
        a.currentTime = Math.max(0, Math.min(seconds, a.duration));
        inMotionPlayerRef.current?.seek(a.currentTime);
      }
    } else {
      const v = videoRef.current;
      if (!v || !Number.isFinite(v.duration)) return;
      v.currentTime = Math.max(0, Math.min(seconds, v.duration));
    }
  };

  const skip = useCallback(
    (delta: number) => {
      if (inMotionMode) {
        const a = audioRef.current;
        if (a && Number.isFinite(a.duration)) {
          const target = Math.max(0, Math.min(a.currentTime + delta, a.duration));
          a.currentTime = target;
          inMotionPlayerRef.current?.seek(target);
        }
      } else {
        const v = videoRef.current;
        if (!v || !Number.isFinite(v.duration)) return;
        v.currentTime = Math.max(0, Math.min(v.currentTime + delta, v.duration));
      }
    },
    [inMotionMode],
  );

  const toggleMute = useCallback(() => {
    const targetAudio = inMotionMode ? audioRef.current : videoRef.current;
    if (!targetAudio) return;
    targetAudio.muted = !targetAudio.muted;
    setMuted(targetAudio.muted);
    if (!targetAudio.muted && targetAudio.volume === 0) {
      targetAudio.volume = 1;
      setVolume(1);
    }
  }, [inMotionMode]);

  const handleVolumeChange = (newVol: number) => {
    const targetAudio = inMotionMode ? audioRef.current : videoRef.current;
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
      // Fullscreen rejection catch
    }
  };

  // Main lifecycle trigger
  useEffect(() => {
    if (inMotionMode) {
      void startInMotionEngine();
    } else {
      const el = videoRef.current;
      if (!el || useOfficialEmbed) return;

      if (!media.url) {
        if (!media.youtubeId) {
          setError("No direct video stream found for this title.");
        }
        return;
      }

      setError("");
      setWaiting(true);

      const targetUrl = media.url;
      const isM3U8 =
        /\.m3u8(?:\?|$)/i.test(targetUrl) ||
        media.source === "Live TV" ||
        targetUrl.includes("/live/");

      if (isM3U8 && !el.canPlayType("application/vnd.apple.mpegurl") && Hls.isSupported()) {
        const engine = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = engine;
        engine.on(Hls.Events.MANIFEST_PARSED, () => {
          void startParkedPlayback();
        });
        engine.loadSource(targetUrl);
        engine.attachMedia(el);
      } else {
        el.src = targetUrl;
        void startParkedPlayback();
      }
    }

    return () => {
      inMotionPlayerRef.current?.destroy();
      inMotionPlayerRef.current = null;
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [inMotionMode, media, useOfficialEmbed, startInMotionEngine, startParkedPlayback]);

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
      {inMotionMode ? (
        /* In-Motion Mode: ZERO <video> tag in the DOM! Only Canvas + Audio! */
        <div className="video-viewport" onClick={handleViewportClick}>
          <canvas
            ref={canvasRef}
            className="player-canvas"
            width={1280}
            height={720}
          />
          {/* Audio element: Tesla NEVER pauses <audio> in Drive! */}
          <audio
            ref={audioRef}
            playsInline
            autoPlay
            onWaiting={() => setWaiting(true)}
            onPlaying={() => {
              setWaiting(false);
              setPlaying(true);
            }}
            onCanPlay={() => setWaiting(false)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={() => {
              const a = audioRef.current;
              if (!a) return;
              setTime(a.currentTime);
              setDuration(a.duration || 0);
              if (Math.abs(a.currentTime - lastSave.current) > 5) {
                lastSave.current = a.currentTime;
                onProgress(a.currentTime, a.duration || 0);
              }
            }}
            onEnded={() => {
              onProgress(duration, duration);
              setPlaying(false);
            }}
            onError={() => {
              setWaiting(false);
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

          {/* Loading Indicator */}
          {waiting && !error && (
            <div className="player-loading">
              <LoaderCircle className="spin" size={40} />
              <span>Buffering in-motion stream…</span>
            </div>
          )}
        </div>
      ) : (
        /* Parked Mode: Traditional native player / YouTube embed */
        useOfficialEmbed && media.youtubeId ? (
          <div className="youtube-embed-container">
            <iframe
              className="video"
              title={media.title}
              src={`https://www.youtube.com/embed/${media.youtubeId}?autoplay=1&playsinline=1&enablejsapi=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="video-viewport" onClick={handleViewportClick}>
            <video
              className="video"
              ref={videoRef}
              preload="auto"
              crossOrigin="anonymous"
              poster={media.image}
              playsInline
              onWaiting={() => setWaiting(true)}
              onPlaying={() => {
                setWaiting(false);
                setPlaying(true);
              }}
              onCanPlay={() => setWaiting(false)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onError={() => {
                setWaiting(false);
                setError("Unable to play stream in parked mode.");
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
          </div>
        )
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
                if (inMotionMode) void startInMotionEngine();
                else void startParkedPlayback();
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
                    ? "In-Motion Drive Mode (Zero <video> Canvas)"
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
                Tesla vehicles pause all <code>&lt;video&gt;</code> HTML tags and YouTube iframes
                when shifting into Drive. Volta&apos;s In-Motion Drive Mode operates with{" "}
                <strong>zero &lt;video&gt; tags</strong> in the DOM, streaming video frames through
                hardware-accelerated WebCodecs Canvas while audio plays uninterrupted via the HTML5
                audio bus.
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
