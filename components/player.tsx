"use client";
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  X,
  Maximize,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Heart,
  ExternalLink,
  LoaderCircle,
} from "lucide-react";
import type { Media } from "@/lib/media";
export default function Player({
  media,
  onClose,
  onProgress,
  onFavorite,
  isFavorite,
  onNext,
  onPrevious,
}: {
  media: Media;
  onClose: () => void;
  onProgress: (seconds: number, duration: number) => void;
  onFavorite: () => void;
  isFavorite: boolean;
  onNext?: () => void;
  onPrevious?: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null),
    container = useRef<HTMLDivElement>(null),
    hls = useRef<Hls | null>(null);
  const [error, setError] = useState(""),
    [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [duration, setDuration] = useState(0),
    [muted, setMuted] = useState(false),
    [visible, setVisible] = useState(true),
    [qualities, setQualities] = useState<number[]>([]),
    [quality, setQuality] = useState(-1),
    [volume, setVolume] = useState(1);
  const lastSave = useRef(0);
  const [nativeControls, setNativeControls] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    setNativeControls(window.matchMedia("(pointer: coarse)").matches);
  }, []);
  async function startPlayback() {
    const v = video.current;
    if (!v) return;
    setError("");
    setWaiting(true);
    try {
      await v.play();
      setStarted(true);
    } catch (e) {
      setWaiting(false);
      if (e instanceof DOMException && e.name === "NotAllowedError")
        setError(
          "Your browser needs a tap to start. Try again, or use Open video directly below.",
        );
      else
        setError(
          "This source could not start. Try opening the video directly.",
        );
    }
  }

  useEffect(() => {
    const el = video.current;
    if (!el || !media.url) return;
    setError("");
    const resume = () => {
      if (media.progress && Number.isFinite(el.duration))
        el.currentTime = Math.min(media.progress, el.duration - 1);
    };
    el.addEventListener("loadedmetadata", resume);
    if (
      /\.m3u8(?:\?|$)/i.test(media.url) &&
      !el.canPlayType("application/vnd.apple.mpegurl") &&
      Hls.isSupported()
    ) {
      const engine = new Hls();
      hls.current = engine;
      engine.loadSource(media.url);
      engine.attachMedia(el);
      engine.on(Hls.Events.MANIFEST_PARSED, () =>
        setQualities(engine.levels.map((l) => l.height)),
      );
      engine.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal)
          setError(
            "This stream could not play. Your provider may require CORS access or a different browser codec.",
          );
      });
    } else el.src = media.url;
    return () => {
      el.removeEventListener("loadedmetadata", resume);
      hls.current?.destroy();
      hls.current = null;
    };
  }, [media]);
  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(id);
  }, [playing, visible]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = before;
    };
  }, [onClose]);
  const format = (s: number) =>
    Number.isFinite(s)
      ? `${Math.floor(s / 60)}:${Math.floor(s % 60)
          .toString()
          .padStart(2, "0")}`
      : "LIVE";
  return (
    <div
      className={`player-overlay ${media.youtubeId ? "youtube-player" : ""} ${nativeControls ? "native-player" : ""}`}
      ref={container}
      role="dialog"
      aria-modal="true"
      aria-label={media.title}
      onPointerMove={() => setVisible(true)}
      onClick={() => setVisible(true)}
    >
      <div className={`player-top ${!visible ? "hidden-controls" : ""}`}>
        <div>
          <span className="eyebrow">NOW PLAYING · {media.source}</span>
          <h2>{media.title}</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close player"
          autoFocus
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {media.youtubeId ? (
        <iframe
          className="video"
          title={media.title}
          src={`https://www.youtube-nocookie.com/embed/${media.youtubeId}?autoplay=1&rel=0`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <video
          className="video"
          ref={video}
          preload="metadata"
          poster={media.image}
          playsInline
          controls={nativeControls}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => {
            setWaiting(false);
            setStarted(true);
            setPlaying(true);
          }}
          onCanPlay={() => setWaiting(false)}
          onLoadedMetadata={() => {
            const v = video.current;
            if (v) setDuration(v.duration);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={() => {
            if (nativeControls) return;
            const v = video.current;
            if (v) {
              if (v.paused) void startPlayback();
              else v.pause();
            }
          }}
          onError={() => {
            setWaiting(false);
            setError(
              "Unable to play this media. The source may be offline, blocked by CORS, or use an unsupported codec.",
            );
          }}
          onTimeUpdate={() => {
            const v = video.current;
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
      )}
      {!media.youtubeId && !playing && !error && !waiting && (
        <button
          className="big-play"
          aria-label={`Start ${media.title}`}
          onClick={() => void startPlayback()}
        >
          <span>
            <Play size={32} fill="currentColor" />
          </span>
          <strong>{started ? "Resume watching" : "Ready when you are"}</strong>
          <small>Tap to play · {media.title}</small>
        </button>
      )}
      {!media.youtubeId && waiting && !error && (
        <div className="player-loading" role="status">
          <LoaderCircle className="spin" size={30} />
          <span>Getting your screen ready…</span>
        </div>
      )}
      {media.youtubeId && (
        <div className="youtube-help">
          <span>YouTube controls playback and availability.</span>
          <a
            href={`https://www.youtube.com/watch?v=${media.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open on YouTube
            <ExternalLink size={15} />
          </a>
        </div>
      )}
      {error && (
        <div className="playback-error">
          <h2>Let’s get you back to watching.</h2>
          <p>{error}</p>
          <button
            className="primary"
            onClick={() => {
              setError("");
              setWaiting(false);
              if (hls.current) {
                hls.current.startLoad();
              } else video.current?.load();
            }}
          >
            Try again
          </button>
          {media.url && (
            <a
              className="video-direct-link"
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open video directly
              <ExternalLink size={16} />
            </a>
          )}
        </div>
      )}
      {!media.youtubeId && !nativeControls && (
        <div className={`player-bottom ${!visible ? "hidden-controls" : ""}`}>
          <input
            aria-label="Playback position"
            type="range"
            min="0"
            max={Number.isFinite(duration) ? duration : 0}
            value={time}
            onChange={(e) => {
              if (video.current)
                video.current.currentTime = Number(e.target.value);
            }}
          />
          <div className="player-actions">
            <button
              className="icon-button"
              onClick={onPrevious}
              disabled={!onPrevious}
              aria-label="Previous channel"
            >
              <ChevronLeft />
            </button>
            <button
              className="icon-button"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => {
                const v = video.current;
                if (v) {
                  if (v.paused) void startPlayback();
                  else v.pause();
                }
              }}
            >
              {playing ? <Pause /> : <Play />}
            </button>
            <button
              className="icon-button"
              onClick={onNext}
              disabled={!onNext}
              aria-label="Next channel"
            >
              <ChevronRight />
            </button>
            <span>
              {format(time)} / {format(duration)}
            </span>
            <div className="spacer" />
            <button
              className="icon-button"
              aria-label="Favorite"
              onClick={onFavorite}
            >
              <Heart fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button
              className="icon-button"
              aria-label="Mute"
              onClick={() => {
                if (video.current) video.current.muted = !muted;
                setMuted(!muted);
              }}
            >
              {muted ? <VolumeX /> : <Volume2 />}
            </button>
            <input
              className="volume"
              aria-label="Volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                setVolume(+e.target.value);
                if (video.current) video.current.volume = +e.target.value;
              }}
            />
            {qualities.length > 0 && (
              <select
                aria-label="Video quality"
                value={quality}
                onChange={(e) => {
                  setQuality(+e.target.value);
                  if (hls.current) hls.current.currentLevel = +e.target.value;
                }}
              >
                <option value={-1}>Auto</option>
                {qualities.map((q, i) => (
                  <option value={i} key={i}>
                    {q}p
                  </option>
                ))}
              </select>
            )}
            <button
              className="icon-button"
              aria-label="Fullscreen"
              onClick={() => {
                container.current
                  ?.requestFullscreen?.()
                  .catch(() =>
                    setError("Fullscreen is not available on this display."),
                  );
              }}
            >
              <Maximize />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
