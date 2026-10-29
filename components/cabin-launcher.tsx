"use client";

import { useEffect, useState } from "react";
import {
  Play,
  Film,
  Car,
  ChevronRight,
} from "lucide-react";
import dynamic from "next/dynamic";
const VehicleStudio = dynamic(() => import("./vehicle-studio"), { ssr: false });
import { Vehicle, Display } from "@/lib/vehicle";
import { readLocal } from "@/lib/storage";
import { Media } from "@/lib/media";

// Official Real Logos
function YouTubeLogo() {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFFFFF"/>
    </svg>
  );
}

function StremioLogo() {
  return (
    <svg viewBox="0 0 48 48" width="38" height="38" fill="none">
      <circle cx="24" cy="24" r="22" fill="#7C3AED" />
      <path d="M19 14.5L33.5 24L19 33.5V14.5Z" fill="#FFFFFF" />
      <path d="M28 18L33.5 24L28 30" stroke="#38BDF8" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LiveTvLogo() {
  return (
    <svg viewBox="0 0 48 48" width="38" height="38" fill="none">
      <rect x="6" y="10" width="36" height="26" rx="6" stroke="#10B981" strokeWidth="2.8" fill="rgba(16, 185, 129, 0.18)" />
      <path d="M20 36L16 42M28 36L32 42M14 42H34" stroke="#10B981" strokeWidth="2.8" strokeLinecap="round" />
      <polygon points="21,18 29,23 21,28" fill="#10B981" />
    </svg>
  );
}

function HboBadge() {
  return (
    <span style={{
      fontSize: "10px",
      fontWeight: 900,
      letterSpacing: "1px",
      color: "#FFFFFF",
      background: "rgba(0,0,0,0.65)",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: "4px",
      padding: "2px 6px",
      textTransform: "uppercase",
    }}>
      HBO
    </span>
  );
}

// Curated Showcase Content Matching the Reference Image
const heroFeature: Media = {
  id: "hero-tlou",
  title: "The Last of Us",
  subtitle: "HBO Original · 4K UHD · Dolby Atmos",
  image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
  source: "Stremio",
  duration: "58 min",
  youtubeId: "uLtkt8BonwM", // 4K Official Trailer
};

// 1:1 Match: BBC News, NBA, F1
const liveNowCards = [
  {
    id: "live-bbc",
    title: "BBC News",
    subtitle: "Live News",
    network: "BBC",
    image: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop&q=80",
    url: "https://live.sky.com/hls/live/2007281/skynews_slot1/index.m3u8",
  },
  {
    id: "live-nba",
    title: "NBA",
    subtitle: "Lakers vs Celtics",
    network: "ESPN",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
  {
    id: "live-f1",
    title: "F1",
    subtitle: "Saudi Arabian Grand Prix",
    network: "F1 TV",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80",
    url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
  },
];

// 1:1 Match: Fallout, Top Gear, The Bear, House of the Dragon
const recommendedCards = [
  {
    id: "rec-fallout",
    title: "Fallout",
    genre: "Action · Sci-Fi",
    platform: "PRIME",
    platformColor: "#00A8E1",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80",
    youtubeId: "V-mugKDQDlg",
  },
  {
    id: "rec-topgear",
    title: "Top Gear",
    genre: "Automotive · Adventure",
    platform: "BBC",
    platformColor: "#FF4444",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&auto=format&fit=crop&q=80",
    youtubeId: "7X8II6J-6mU",
  },
  {
    id: "rec-bear",
    title: "The Bear",
    genre: "Drama · Culinary",
    platform: "HULU",
    platformColor: "#1CE783",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    youtubeId: "gBmkI4jlaIo",
  },
  {
    id: "rec-hotd",
    title: "House of the Dragon",
    genre: "Fantasy · Drama",
    platform: "MAX",
    platformColor: "#002BE7",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    youtubeId: "DotnJ7tTA34",
  },
];

// 1:1 Match from Tesla Screen: Continue Watching
const continueWatchingCards = [
  {
    id: "cw-tlou",
    title: "The Last of Us",
    platform: "HBO Max",
    platformColor: "#A855F7",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
    youtubeId: "uLtkt8BonwM",
  },
  {
    id: "cw-opp",
    title: "Oppenheimer",
    platform: "Prime Video",
    platformColor: "#00A8E1",
    image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
    youtubeId: "uYPbbksJxIg",
  },
  {
    id: "cw-f1",
    title: "F1: Drive to Survive",
    platform: "Netflix",
    platformColor: "#E50914",
    image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&auto=format&fit=crop&q=80",
    youtubeId: "wtJPe1ksS6E",
  },
  {
    id: "cw-smith",
    title: "Mr. & Mrs. Smith",
    platform: "Prime Video",
    platformColor: "#00A8E1",
    image: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?w=800&auto=format&fit=crop&q=80",
    youtubeId: "AsA_a1rZkWw",
  },
  {
    id: "cw-bear",
    title: "The Bear",
    platform: "Hulu",
    platformColor: "#1CE783",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80",
    youtubeId: "gBmkI4jlaIo",
  },
];

export default function CabinLauncher({
  vehicle,
  onNavigate,
  onPlay,
  onPlayMedia,
}: {
  name?: string;
  vehicle: Vehicle;
  display?: Display;
  onNavigate: (page: string) => void;
  onPlay: () => void;
  onPlayMedia?: (media: Media) => void;
  onAccount?: () => void;
  onSave?: (name: string, vehicle: Vehicle, display: Display) => void;
  hasHistory?: boolean;
}) {
  const [paint, setPaint] = useState(0);
  const [studioOpen, setStudioOpen] = useState(false);

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

  function handlePlayItem(title: string, subtitle: string, url?: string, youtubeId?: string, image?: string) {
    const item: Media = {
      id: `stream-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      title,
      subtitle,
      url,
      youtubeId,
      image: image || "/art/space.jpg",
      source: url ? "Live TV" : "Stremio",
    };
    if (onPlayMedia) {
      onPlayMedia(item);
    } else {
      onPlay();
    }
  }

  return (
    <div className="tesla-simplistic-cockpit">
      {/* 1. Cinematic Hero Billboard ("The Last of Us") */}
      <section className="tesla-hero-billboard">
        <div className="hero-backdrop-container">
          <img
            src={heroFeature.image}
            alt={heroFeature.title}
            className="hero-backdrop-image"
          />
          <div className="hero-vignette-overlay" />
        </div>

        <div className="hero-content-panel">
          <div className="hero-badges-row">
            <span className="hero-brand-pill">HBO ORIGINAL</span>
            <span className="hero-quality-badge">4K ULTRA HD</span>
            <span className="hero-hdr-badge">DOLBY ATMOS</span>
          </div>

          <h1 className="hero-headline">{heroFeature.title}</h1>
          <p className="hero-synopsis">
            When you&apos;re lost in the darkness, look for the light. Joel and Ellie
            must survive a brutal post-pandemic journey across the ruins.
          </p>

          <div className="hero-action-buttons">
            <button className="hero-primary-btn" onClick={handlePlayHero}>
              <Play size={18} fill="currentColor" />
              <span>Play Stream</span>
            </button>

            <button
              className="hero-secondary-btn"
              onClick={() => onNavigate("Stremio")}
            >
              <Film size={17} />
              <span>Browse Catalog</span>
            </button>

            <button
              className={`hero-studio-toggle-btn ${studioOpen ? "active" : ""}`}
              onClick={() => setStudioOpen(!studioOpen)}
              title="Toggle 3D Vehicle Studio"
            >
              <Car size={17} />
              <span>{studioOpen ? "Hide 3D Studio" : "3D Model 3 Studio"}</span>
            </button>
          </div>
        </div>

        <div className="hero-corner-hbo">
          <HboBadge />
        </div>
      </section>

      {/* Embedded 3D Vehicle Studio Drawer */}
      {studioOpen && (
        <section className="tesla-embedded-studio-card">
          <div className="studio-card-header">
            <div>
              <span className="eyebrow">TESLA VEHICLE STUDIO</span>
              <h3>Interactive Model 3 Showroom</h3>
            </div>
            <button
              className="close-studio-btn"
              onClick={() => setStudioOpen(false)}
            >
              Close Studio
            </button>
          </div>
          <div className="studio-viewport-wrap">
            <VehicleStudio paint={paint} vehicle={vehicle} />
          </div>
        </section>
      )}

      {/* 2. App Hub — Simplistic: ONLY YouTube, Stremio, and Live TV */}
      <section className="tesla-app-hub-section">
        <div className="hub-section-header">
          <div>
            <h2 className="hub-section-title">App Hub</h2>
            <p className="hub-section-subtitle">All your favourite content in one place.</p>
          </div>
        </div>

        <div className="tesla-trio-app-grid">
          {/* YouTube Tile */}
          <button
            className="tesla-app-tile tile-youtube"
            onClick={() => onNavigate("YouTube")}
            title="Open YouTube"
          >
            <div className="app-tile-icon-wrap">
              <YouTubeLogo />
            </div>
            <span className="app-tile-label">YouTube</span>
          </button>

          {/* Stremio Tile */}
          <button
            className="tesla-app-tile tile-stremio"
            onClick={() => onNavigate("Stremio")}
            title="Open Stremio"
          >
            <div className="app-tile-icon-wrap">
              <StremioLogo />
            </div>
            <span className="app-tile-label">Stremio</span>
          </button>

          {/* Live TV Tile */}
          <button
            className="tesla-app-tile tile-livetv"
            onClick={() => onNavigate("Live TV")}
            title="Open Live TV"
          >
            <div className="app-tile-icon-wrap">
              <LiveTvLogo />
            </div>
            <span className="app-tile-label">Live TV</span>
          </button>
        </div>
      </section>

      {/* 3. Live Now Row (BBC News, NBA, F1) */}
      <section className="tesla-content-carousel-section">
        <div className="carousel-header-row" onClick={() => onNavigate("Live TV")}>
          <div className="carousel-title-group">
            <h3 className="carousel-title">Live Now</h3>
            <ChevronRight size={18} className="chevron-link" />
          </div>
        </div>

        <div className="tesla-widescreen-scroller">
          {liveNowCards.map((card) => (
            <div
              key={card.id}
              className="tesla-broadcast-card"
              onClick={() => handlePlayItem(card.title, card.subtitle, card.url, undefined, card.image)}
            >
              <div className="broadcast-thumb-box">
                <img src={card.image} alt={card.title} loading="lazy" />
                <span className="live-pill-tag">
                  <span className="live-dot-pulse" /> LIVE
                </span>
                <span className="channel-network-pill">{card.network}</span>
                <div className="play-overlay-hover">
                  <Play size={32} fill="currentColor" />
                </div>
              </div>
              <div className="broadcast-meta-box">
                <h4>{card.title}</h4>
                <p>{card.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Recommended for You Row (Fallout, Top Gear, The Bear, House of the Dragon) */}
      <section className="tesla-content-carousel-section">
        <div className="carousel-header-row" onClick={() => onNavigate("Stremio")}>
          <div className="carousel-title-group">
            <h3 className="carousel-title">Recommended for You</h3>
            <ChevronRight size={18} className="chevron-link" />
          </div>
        </div>

        <div className="tesla-widescreen-scroller">
          {recommendedCards.map((card) => (
            <div
              key={card.id}
              className="tesla-poster-card"
              onClick={() => handlePlayItem(card.title, card.genre, undefined, card.youtubeId, card.image)}
            >
              <div className="poster-thumb-box">
                <img src={card.image} alt={card.title} loading="lazy" />
                <span
                  className="platform-badge-pill"
                  style={{
                    color: card.platformColor,
                    borderColor: `${card.platformColor}55`,
                    background: `${card.platformColor}18`,
                  }}
                >
                  {card.platform}
                </span>
                <div className="play-overlay-hover">
                  <Play size={32} fill="currentColor" />
                </div>
              </div>
              <div className="poster-meta-box">
                <h4>{card.title}</h4>
                <p>{card.genre}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Continue Watching Row (from the Model 3 touchscreen in reference) */}
      <section className="tesla-content-carousel-section continue-watching-section">
        <div className="carousel-header-row" onClick={() => onNavigate("Favorites")}>
          <div className="carousel-title-group">
            <h3 className="carousel-title">Continue Watching</h3>
            <ChevronRight size={18} className="chevron-link" />
          </div>
        </div>

        <div className="tesla-widescreen-scroller">
          {continueWatchingCards.map((card) => (
            <div
              key={card.id}
              className="tesla-poster-card"
              onClick={() => handlePlayItem(card.title, card.platform, undefined, card.youtubeId, card.image)}
            >
              <div className="poster-thumb-box">
                <img src={card.image} alt={card.title} loading="lazy" />
                <span
                  className="platform-badge-pill"
                  style={{
                    color: card.platformColor,
                    borderColor: `${card.platformColor}55`,
                    background: `${card.platformColor}20`,
                  }}
                >
                  {card.platform}
                </span>
                <div className="play-overlay-hover">
                  <Play size={32} fill="currentColor" />
                </div>
              </div>
              <div className="poster-meta-box">
                <h4>{card.title}</h4>
                <p>{card.platform}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
