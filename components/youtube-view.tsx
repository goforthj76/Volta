"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Youtube,
  Play,
  CheckCircle2,
  X,
  LoaderCircle,
  Link as LinkIcon,
} from "lucide-react";
import { Media } from "@/lib/media";

type YouTubeVideo = {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  channelAvatar?: string;
  thumbnail: string;
  views: string;
  uploadedAt: string;
  duration: string;
  category: string;
};

const curatedVideos: YouTubeVideo[] = [
  {
    id: "yt-1",
    youtubeId: "aqz-KE-bpKQ",
    title: "Big Buck Bunny 4K (Full Open Film) — Cinematic Animation",
    channel: "Blender Studio",
    channelAvatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/forest.jpg",
    views: "18M views",
    uploadedAt: "Featured Open Cinema",
    duration: "09:56",
    category: "Car Cinema",
  },
  {
    id: "yt-2",
    youtubeId: "jfKfPfyJRdk",
    title: "Lofi Hip Hop Radio 📚 - Beats to Relax/Study to [Live 24/7]",
    channel: "Lofi Girl",
    channelAvatar: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/city.jpg",
    views: "65K watching",
    uploadedAt: "LIVE",
    duration: "LIVE",
    category: "Lofi Chill Beats",
  },
  {
    id: "yt-3",
    youtubeId: "4Z8gJd6K1bA",
    title: "Tesla FSD Supervised 13: Full Coast to Coast Road Trip Showcase",
    channel: "Tesla Daily",
    channelAvatar: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/road.jpg",
    views: "840K views",
    uploadedAt: "2 days ago",
    duration: "24:15",
    category: "Tesla & Electric Vehicles",
  },
  {
    id: "yt-4",
    youtubeId: "EngW7tLk6R8",
    title: "SpaceX Starship Flight 6 Cinematic Recaps & Orbital Views",
    channel: "SpaceX Community",
    channelAvatar: "https://images.unsplash.com/photo-1517976487502-5f79e8be0f9b?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/space.jpg",
    views: "1.2M views",
    uploadedAt: "1 week ago",
    duration: "18:42",
    category: "Tech & Space",
  },
  {
    id: "yt-5",
    youtubeId: "LXb3EKWsInQ",
    title: "4K Scenic Drive Through Snowy Mountain Passes & Alpine Valleys",
    channel: "Scenic Relax",
    channelAvatar: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/mountain.jpg",
    views: "420K views",
    uploadedAt: "3 weeks ago",
    duration: "45:00",
    category: "Car Cinema",
  },
  {
    id: "yt-6",
    youtubeId: "7X8II6J-6mU",
    title: "Synthwave Radio 🌌 - Chill Synth / Retro Beats for Night Drives",
    channel: "NightDrive FM",
    channelAvatar: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=100&auto=format&fit=crop&q=60",
    thumbnail: "/art/hero.jpg",
    views: "12K watching",
    uploadedAt: "LIVE",
    duration: "LIVE",
    category: "Lofi Chill Beats",
  },
];

const categories = [
  "All",
  "Tesla & Electric Vehicles",
  "Car Cinema",
  "Lofi Chill Beats",
  "Tech & Space",
  "Music",
];

type ApiYouTubeItem = {
  youtubeId?: string;
  title: string;
  subtitle?: string;
  image?: string;
  duration?: string;
};

export default function YouTubeView({
  onPlay,
}: {
  onPlay: (media: Media) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [directError, setDirectError] = useState("");
  const [videos, setVideos] = useState<YouTubeVideo[]>(curatedVideos);
  const [searching, setSearching] = useState(false);

  // Search effect via server API if query exists
  useEffect(() => {
    if (!searchQuery.trim()) {
      if (selectedCategory === "All") {
        setVideos(curatedVideos);
      } else {
        setVideos(curatedVideos.filter((v) => v.category === selectedCategory));
      }
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/youtube?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = (await res.json()) as { items?: ApiYouTubeItem[] };
          if (Array.isArray(data.items) && data.items.length > 0) {
            const apiVideos: YouTubeVideo[] = data.items.map((item, idx) => ({
              id: `api-yt-${item.youtubeId || idx}`,
              youtubeId: item.youtubeId || "",
              title: item.title,
              channel: item.subtitle || "YouTube",
              thumbnail: item.image || "/art/city.jpg",
              views: "YouTube stream",
              uploadedAt: "Live search",
              duration: item.duration || "HD",
              category: "Search Results",
            }));
            setVideos(apiVideos);
          } else {
            // Filter local fallback
            setVideos(
              curatedVideos.filter((v) =>
                v.title.toLowerCase().includes(searchQuery.toLowerCase()),
              ),
            );
          }
        } else {
          setVideos(
            curatedVideos.filter((v) =>
              v.title.toLowerCase().includes(searchQuery.toLowerCase()),
            ),
          );
        }
      } catch {
        setVideos(
          curatedVideos.filter((v) =>
            v.title.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
        );
      } finally {
        setSearching(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  function playVideo(video: YouTubeVideo) {
    const media: Media = {
      id: video.id,
      title: video.title,
      subtitle: video.channel,
      image: video.thumbnail,
      source: "YouTube",
      youtubeId: video.youtubeId,
      duration: video.duration,
    };
    onPlay(media);
  }

  function handleDirectPlay() {
    setDirectError("");
    const url = directUrl.trim();
    if (!url) return;

    // Extract YouTube ID
    const match = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    );
    if (match && match[1]) {
      const ytId = match[1];
      const media: Media = {
        id: `yt-direct-${ytId}`,
        title: "YouTube Video",
        subtitle: `ID: ${ytId}`,
        image: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
        source: "YouTube",
        youtubeId: ytId,
      };
      setDirectUrl("");
      onPlay(media);
    } else {
      setDirectError("Please enter a valid YouTube video URL or 11-character video ID.");
    }
  }

  return (
    <div className="youtube-container">
      {/* YouTube Top Bar */}
      <header className="youtube-header">
        <div className="youtube-brand">
          <div className="youtube-icon-box">
            <Youtube size={26} className="yt-red-icon" />
          </div>
          <h2>YouTube</h2>
          <span className="yt-region">TESLA</span>
        </div>

        {/* Central Search Bar */}
        <div className="youtube-search-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search YouTube videos and live channels…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
                <X size={16} />
              </button>
            )}
          </div>
          <button className="search-submit-btn" aria-label="Search">
            <Search size={18} />
          </button>
        </div>
      </header>

      {/* Direct URL Input Bar */}
      <div className="direct-url-bar">
        <div className="direct-input-group">
          <LinkIcon size={16} className="link-icon" />
          <input
            type="text"
            placeholder="Paste any YouTube video link to watch (e.g. https://youtu.be/aqz-KE-bpKQ)..."
            value={directUrl}
            onChange={(e) => {
              setDirectUrl(e.target.value);
              setDirectError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleDirectPlay();
            }}
          />
          <button className="direct-play-btn" onClick={handleDirectPlay}>
            <Play size={15} fill="currentColor" />
            <span>Watch Now</span>
          </button>
        </div>
        {directError && <span className="direct-error-text">{directError}</span>}
      </div>

      {/* Category Pills */}
      <div className="youtube-categories">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-pill ${selectedCategory === cat && !searchQuery ? "active" : ""}`}
            onClick={() => {
              setSelectedCategory(cat);
              setSearchQuery("");
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video Grid Section */}
      <section className="youtube-grid-section">
        <div className="section-title-row">
          <h3>
            {searchQuery
              ? `Results for "${searchQuery}"`
              : selectedCategory === "All"
                ? "Recommended for Tesla Passenger"
                : selectedCategory}
          </h3>
          {searching && <LoaderCircle className="spin" size={20} />}
        </div>

        <div className="youtube-video-grid">
          {videos.map((vid) => (
            <div key={vid.id} className="youtube-card" onClick={() => playVideo(vid)}>
              <div className="yt-thumb-wrapper">
                <img
                  src={vid.thumbnail}
                  alt={vid.title}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/art/city.jpg";
                  }}
                />
                <span className={`yt-duration-badge ${vid.duration === "LIVE" ? "live-badge" : ""}`}>
                  {vid.duration}
                </span>
                <div className="yt-hover-overlay">
                  <Play size={36} fill="currentColor" />
                </div>
              </div>

              <div className="yt-meta-row">
                <img
                  src={vid.channelAvatar || "/art/city.jpg"}
                  alt={vid.channel}
                  className="yt-channel-avatar"
                />
                <div className="yt-text-box">
                  <h4 title={vid.title}>{vid.title}</h4>
                  <div className="yt-channel-name">
                    <span>{vid.channel}</span>
                    <CheckCircle2 size={12} className="verified-icon" />
                  </div>
                  <div className="yt-stats">
                    <span>{vid.views}</span>
                    <span>•</span>
                    <span>{vid.uploadedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
