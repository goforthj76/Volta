"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Star,
  Tv,
  Film,
  Sparkles,
  Car,
  ChevronRight,
} from "lucide-react";
import dynamic from "next/dynamic";
const VehicleStudio = dynamic(() => import("./vehicle-studio"), { ssr: false });
import { Vehicle, Display } from "@/lib/vehicle";
import { readLocal } from "@/lib/storage";
import { Media } from "@/lib/media";

// Official Branded Service SVGs
function YouTubeLogo() {
  return (
    <svg viewBox="0 0 48 34" width="38" height="26" fill="none">
      <path
        d="M47.06 5.27A6.03 6.03 0 0042.82 1C39.08 0 24 0 24 0S8.92 0 5.18 1A6.03 6.03 0 00.94 5.27C0 9.03 0 17 0 17s0 7.97.94 11.73A6.03 6.03 0 005.18 33c3.74 1 18.82 1 18.82 1s15.08 0 18.82-1a6.03 6.03 0 004.24-4.27c.94-3.76.94-11.73.94-11.73s0-7.97-.94-11.73z"
        fill="#FF0000"
      />
      <path d="M19.2 24.23L31.68 17 19.2 9.77v14.46z" fill="#FFFFFF" />
    </svg>
  );
}

function NetflixLogo() {
  return (
    <svg viewBox="0 0 111 30" width="68" height="20" fill="none">
      <path
        d="M105.06 14.34l5.94 15.66h-5.26l-3.32-8.77-3.34 8.77h-5.28l5.96-15.66-5.69-14.34h5.28l3.07 8.16 3.09-8.16h5.24l-5.69 14.34zm-22.39 15.66h-5.07V0h5.07v30zm-10.45-25.29h-5.8v25.29h-5.07V4.71h-5.8V0h16.67v4.71zm-21.72 25.29H38.7V0h11.8v4.71H43.77v7.92h6.1v4.71h-6.1v7.95h6.73v4.71zm-17.7 0H21.2l-6.84-18.06v18.06H9.4V0h11.6l6.83 18.06V0h4.97v30zM5.07 30H0V0h5.07v30z"
        fill="#E50914"
      />
    </svg>
  );
}

function PrimeVideoLogo() {
  return (
    <svg viewBox="0 0 100 30" width="72" height="22" fill="none">
      <text
        x="0"
        y="18"
        fill="#FFFFFF"
        fontFamily="system-ui, sans-serif"
        fontWeight="800"
        fontSize="15"
        letterSpacing="-0.5"
      >
        prime video
      </text>
      <path
        d="M2 24c22 7 55 6 78-2"
        stroke="#00A8E1"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path d="M78 20l4 2.5-3 3" fill="#00A8E1" />
    </svg>
  );
}

function DisneyPlusLogo() {
  return (
    <svg viewBox="0 0 90 32" width="62" height="22" fill="none">
      <text
        x="0"
        y="22"
        fill="#FFFFFF"
        fontFamily="Georgia, serif"
        fontWeight="bold"
        fontSize="19"
        letterSpacing="0.5"
      >
        Disney
      </text>
      <text
        x="66"
        y="20"
        fill="#42A5F5"
        fontFamily="system-ui, sans-serif"
        fontWeight="900"
        fontSize="21"
      >
        +
      </text>
    </svg>
  );
}

function MaxLogo() {
  return (
    <svg viewBox="0 0 70 26" width="52" height="20" fill="none">
      <text
        x="2"
        y="21"
        fill="#FFFFFF"
        fontFamily="system-ui, sans-serif"
        fontWeight="900"
        fontSize="22"
        letterSpacing="-1"
      >
        max
      </text>
    </svg>
  );
}

// Curated Showcase Content
const heroFeature: Media = {
  id: "hero-tlou",
  title: "The Last of Us",
  subtitle: "HBO Original · 4K UHD · Dolby Atmos",
  image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
  source: "Stremio",
  duration: "58 min",
  youtubeId: "uLtkt8BonwM", // Official 4K Trailer
};

const liveNowFeeds = [
  {
    id: "bbc-news",
    title: "BBC News Live",
    subtitle: "24/7 International Breaking News",
    network: "BBC",
    badge: "NEWS",
    image: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=70",
    url: "https://live.sky.com/hls/live/2007281/skynews_slot1/index.m3u8",
  },
  {
    id: "redbull-live",
    title: "Red Bull TV",
    subtitle: "Extreme Sports, F1 & Action",
    network: "RED BULL",
    badge: "SPORTS",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&auto=format&fit=crop&q=70",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "sky-f1",
    title: "Sky News HD",
    subtitle: "Live Global News & Investigations",
    network: "SKY",
    badge: "GLOBAL",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=70",
    url: "https://stream.france24.com/hls/live/2037554/F24_EN_LO_HLS/master.m3u8",
  },
  {
    id: "nasa-hd",
    title: "NASA TV HD",
    subtitle: "Live Space Exploration & Orbit Feed",
    network: "NASA",
    badge: "TECH",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=70",
    url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
  },
  {
    id: "bloomberg-hd",
    title: "Bloomberg Originals",
    subtitle: "Market Innovation & Finance",
    network: "BLOOMBERG",
    badge: "FINANCE",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&auto=format&fit=crop&q=70",
    url: "https://liveproduseast.akamaized.net/us/Channel-HD-AWS-virginia-1/master.m3u8",
  },
];

const recommendedCards = [
  {
    id: "rec-fallout",
    title: "Fallout",
    genre: "Action · Drama · Sci-Fi",
    year: "2024",
    platform: "PRIME",
    platformColor: "#00A8E1",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=70",
    youtubeId: "V-mugKDQDlg",
  },
  {
    id: "rec-bear",
    title: "The Bear",
    genre: "Drama · Comedy",
    year: "2024",
    platform: "HULU",
    platformColor: "#1CE783",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=70",
    youtubeId: "gBmkI4jlaIo",
  },
  {
    id: "rec-hotd",
    title: "House of the Dragon",
    genre: "Action · Adventure · Fantasy",
    year: "2024",
    platform: "MAX",
    platformColor: "#002BE7",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=70",
    youtubeId: "DotnJ7tTA34",
  },
  {
    id: "rec-topgear",
    title: "Top Gear Specials",
    genre: "Automotive · Adventure",
    year: "Classic",
    platform: "BBC",
    platformColor: "#FF4444",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&auto=format&fit=crop&q=70",
    youtubeId: "7X8II6J-6mU",
  },
  {
    id: "rec-shogun",
    title: "Shōgun",
    genre: "Historical Drama",
    year: "2024",
    platform: "HULU",
    platformColor: "#1CE783",
    image: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=600&auto=format&fit=crop&q=70",
    youtubeId: "yMf6CEWNpy8",
  },
  {
    id: "rec-dune",
    title: "Dune: Part Two",
    genre: "Sci-Fi · Adventure",
    year: "2024",
    platform: "MAX",
    platformColor: "#002BE7",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=70",
    youtubeId: "Way9Dexny3w",
  },
  {
    id: "rec-bbb",
    title: "Big Buck Bunny 4K",
    genre: "Open Cinema · 60fps",
    year: "Classic",
    platform: "4K CINEMA",
    platformColor: "#A855F7",
    image: "/art/forest.jpg",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "rec-afterglow",
    title: "Afterglow 4K",
    genre: "Volta Original Escape",
    year: "2026",
    platform: "VOLTA",
    platformColor: "#38BDF8",
    image: "/art/afterglow.jpg",
    url: "/media/afterglow.mp4",
  },
];

export default function CabinLauncher({
  name,
  vehicle,
  display,
  onNavigate,
  onPlay,
  onPlayMedia,
  onAccount,
  onSave,
  hasHistory,
}: {
  name: string;
  vehicle: Vehicle;
  display: Display;
  onNavigate: (page: string) => void;
  onPlay: () => void;
  onPlayMedia?: (media: Media) => void;
  onAccount: () => void;
  onSave: (name: string, vehicle: Vehicle, display: Display) => void;
  hasHistory: boolean;
}) {
  const [paint, setPaint] = useState(0);
  const [studioOpen, setStudioOpen] = useState(false);
  const [externalModal, setExternalModal] = useState<string | null>(null);

  useEffect(() => {
    setPaint(readLocal("volta.paint", 0));
  }, []);

  function handlePlayHero() {
    if (onPlayMedia) {
      onPlayMedia(heroFeature);
    } else {
      onPlay();
    }
  }

  function handlePlayItem(item: {
    id: string;
    title: string;
    subtitle?: string;
    image: string;
    url?: string;
    youtubeId?: string;
  }) {
    if (onPlayMedia) {
      onPlayMedia({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle || "Featured Selection",
        image: item.image,
        source: item.url ? "Live TV" : "YouTube",
        url: item.url,
        youtubeId: item.youtubeId,
      });
    } else {
      onPlay();
    }
  }

  return (
    <div className="tesla-watch-dashboard">
      {/* Massive Cinematic Hero Showcase */}
      <section className="tesla-hero-billboard">
        <div
          className="hero-backdrop-image"
          style={{ backgroundImage: `url(${heroFeature.image})` }}
        />
        <div className="hero-gradient-overlay" />

        <div className="hero-content-container">
          <div className="hero-meta-pill-row">
            <span className="hero-platform-badge">HBO ORIGINAL</span>
            <span className="hero-rating-badge">
              <Star size={12} fill="currentColor" /> 9.1
            </span>
            <span className="hero-quality-badge">4K ULTRA HD</span>
            <span className="hero-hdr-badge">DOLBY VISION</span>
          </div>

          <h1 className="hero-headline">{heroFeature.title}</h1>
          <p className="hero-synopsis">
            When you&apos;re lost in the darkness, look for the light. Joel and Ellie
            must survive a brutal post-pandemic journey across the United States.
          </p>

          <div className="hero-action-buttons">
            <button className="hero-primary-btn" onClick={handlePlayHero}>
              <Play size={18} fill="currentColor" />
              <span>Watch Trailer & Preview</span>
            </button>

            <button
              className="hero-secondary-btn"
              onClick={() => onNavigate("Stremio")}
            >
              <Film size={17} />
              <span>Open in Streaming Hub</span>
            </button>

            <button
              className="hero-ghost-btn"
              onClick={() => setStudioOpen(!studioOpen)}
              title="Personalize 3D Vehicle"
            >
              <Car size={16} />
              <span>{vehicle.replace("Tesla ", "")} Studio</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3D Vehicle Studio Drawer (Toggled from Hero) */}
      {studioOpen && (
        <section className="tesla-embedded-studio-card">
          <div className="studio-card-header">
            <div>
              <span className="eyebrow">YOUR TESLA COCKPIT STUDIO</span>
              <h3>{vehicle}</h3>
            </div>
            <button
              className="close-studio-btn"
              onClick={() => setStudioOpen(false)}
            >
              Done
            </button>
          </div>
          <div className="studio-viewport-wrap">
            <VehicleStudio vehicle={vehicle} paint={paint} />
          </div>
        </section>
      )}

      {/* App Hub Row */}
      <section className="tesla-app-hub-section">
        <div className="section-title-row">
          <div className="title-group">
            <h2>App Hub</h2>
            <p>All your favourite content in one place.</p>
          </div>
        </div>

        <div className="app-hub-tiles-scroller">
          {/* YouTube Tile */}
          <button
            className="app-hub-tile tile-youtube"
            onClick={() => onNavigate("YouTube")}
          >
            <div className="tile-logo-box">
              <YouTubeLogo />
            </div>
            <span className="tile-label">YouTube</span>
          </button>

          {/* Netflix Tile */}
          <button
            className="app-hub-tile tile-netflix"
            onClick={() => setExternalModal("Netflix")}
          >
            <div className="tile-logo-box">
              <NetflixLogo />
            </div>
            <span className="tile-label">Netflix</span>
          </button>

          {/* Prime Video Tile */}
          <button
            className="app-hub-tile tile-prime"
            onClick={() => setExternalModal("Prime Video")}
          >
            <div className="tile-logo-box">
              <PrimeVideoLogo />
            </div>
            <span className="tile-label">Prime Video</span>
          </button>

          {/* Disney+ Tile */}
          <button
            className="app-hub-tile tile-disney"
            onClick={() => setExternalModal("Disney+")}
          >
            <div className="tile-logo-box">
              <DisneyPlusLogo />
            </div>
            <span className="tile-label">Disney+</span>
          </button>

          {/* Max Tile */}
          <button
            className="app-hub-tile tile-max"
            onClick={() => setExternalModal("Max")}
          >
            <div className="tile-logo-box">
              <MaxLogo />
            </div>
            <span className="tile-label">Max</span>
          </button>

          {/* Stremio Streaming Tile */}
          <button
            className="app-hub-tile tile-stremio"
            onClick={() => onNavigate("Stremio")}
          >
            <div className="tile-logo-box">
              <Film size={26} color="#A855F7" />
            </div>
            <span className="tile-label">Stremio</span>
          </button>

          {/* Live TV Tile */}
          <button
            className="app-hub-tile tile-livetv"
            onClick={() => onNavigate("Live TV")}
          >
            <div className="tile-logo-box">
              <Tv size={26} color="#10B981" />
            </div>
            <span className="tile-label">Live TV</span>
          </button>
        </div>
      </section>

      {/* Live Now IPTV Row */}
      <section className="tesla-content-carousel-section">
        <div className="section-title-row">
          <div className="title-group">
            <div className="live-header-indicator">
              <span className="pulsing-red-dot" />
              <h2>Live Now</h2>
            </div>
            <p>Live television & sports feeds ready for passenger viewing.</p>
          </div>
          <button
            className="view-all-link-btn"
            onClick={() => onNavigate("Live TV")}
          >
            <span>View All Channels</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="content-cards-scroller">
          {liveNowFeeds.map((feed) => (
            <div
              key={feed.id}
              className="tesla-broadcast-card"
              onClick={() => handlePlayItem(feed)}
            >
              <div className="broadcast-thumb-box">
                <img src={feed.image} alt={feed.title} loading="lazy" />
                <span className="live-pill-tag">LIVE</span>
                <span className="channel-network-pill">{feed.network}</span>
                <div className="play-overlay-hover">
                  <Play size={26} fill="currentColor" />
                </div>
              </div>
              <div className="broadcast-meta-box">
                <h4>{feed.title}</h4>
                <p>{feed.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended for You Row */}
      <section className="tesla-content-carousel-section">
        <div className="section-title-row">
          <div className="title-group">
            <h2>Recommended for You</h2>
            <p>Top trending cinema, documentaries, and passenger escapes.</p>
          </div>
          <button
            className="view-all-link-btn"
            onClick={() => onNavigate("Stremio")}
          >
            <span>Browse Library</span>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="content-cards-scroller">
          {recommendedCards.map((rec) => (
            <div
              key={rec.id}
              className="tesla-poster-card"
              onClick={() => handlePlayItem(rec)}
            >
              <div className="poster-thumb-box">
                <img src={rec.image} alt={rec.title} loading="lazy" />
                <div className="play-overlay-hover">
                  <Play size={24} fill="currentColor" />
                </div>
                {/* Platform Badge on Poster */}
                <span
                  className="platform-badge-pill"
                  style={{ backgroundColor: `${rec.platformColor}26`, color: rec.platformColor, borderColor: `${rec.platformColor}40` }}
                >
                  {rec.platform}
                </span>
              </div>
              <div className="poster-meta-box">
                <h4>{rec.title}</h4>
                <p>{rec.genre}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* External Streaming Launcher Modal */}
      {externalModal && (
        <div className="detail-modal-overlay" onClick={() => setExternalModal(null)}>
          <div className="detail-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="app-launch-dialog-header">
              <h3>{externalModal} on Tesla</h3>
              <p>
                To stream {externalModal} while stationary, launch Tesla Theater or connect authorized accounts via Stremio.
              </p>
            </div>
            <div className="app-launch-dialog-body">
              <div className="launch-benefit-item">
                <Sparkles size={20} className="launch-icon" />
                <div>
                  <strong>In-Motion Passenger Playback</strong>
                  <p>For driving video in the front seat, use Volta&apos;s Live TV, YouTube, or Stremio.</p>
                </div>
              </div>
              <div className="launch-benefit-item">
                <Film size={20} className="launch-icon" />
                <div>
                  <strong>Synchronized Stremio Addons</strong>
                  <p>Link your Stremio library to aggregate catalogs from all major networks.</p>
                </div>
              </div>
            </div>
            <div className="app-launch-dialog-actions">
              <button
                className="primary"
                onClick={() => {
                  setExternalModal(null);
                  onNavigate("Stremio");
                }}
              >
                Open Streaming Hub
              </button>
              <button
                className="secondary"
                onClick={() => setExternalModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
