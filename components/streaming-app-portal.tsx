"use client";

import { useState } from "react";
import {
  ExternalLink,
  Car,
  Play,
  CheckCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { Media } from "@/lib/media";
import { fuboPresetChannels, slingPresetChannels } from "@/lib/channels";

export default function StreamingAppPortal({
  provider,
  onPlay,
  onOpenLiveTv,
}: {
  provider: "fubo" | "sling";
  onPlay: (media: Media) => void;
  onOpenLiveTv: () => void;
}) {
  const [activeMode, setActiveMode] = useState<"driving" | "official">("driving");

  const isFubo = provider === "fubo";
  const brandName = isFubo ? "Fubo TV" : "Sling TV";
  const brandColor = isFubo ? "#ff5900" : "#00a3e0";
  const brandBg = isFubo
    ? "radial-gradient(ellipse at 50% 0%, rgba(255, 89, 0, 0.2), transparent 70%), #131418"
    : "radial-gradient(ellipse at 50% 0%, rgba(0, 163, 224, 0.2), transparent 70%), #10131a";
  const officialUrl = isFubo ? "https://www.fubo.tv" : "https://watch.sling.com";
  const channels = isFubo ? fuboPresetChannels : slingPresetChannels;

  return (
    <div className="streaming-portal-container" style={{ background: brandBg }}>
      {/* Portal Header */}
      <header className="portal-header">
        <div className="portal-brand-block">
          <div
            className="portal-badge"
            style={{
              borderColor: brandColor,
              color: brandColor,
              background: isFubo ? "rgba(255, 89, 0, 0.12)" : "rgba(0, 163, 224, 0.12)",
            }}
          >
            {isFubo ? (
              <svg viewBox="0 0 100 28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: "20px", width: "auto" }} aria-hidden="true">
                <path d="M4 2h14v5H9v4h8v5H9v10H4V2z" fill="currentColor"/>
                <path d="M22 2h5v15c0 3.3 2.2 5 5 5s5-1.7 5-5V2h5v15c0 6.6-4.4 10-10 10s-10-3.4-10-10V2z" fill="currentColor"/>
                <path d="M41 2h10c4.5 0 8 3 8 7.5 0 2.5-1.2 4.6-3 5.8 2.6 1.1 4.5 3.5 4.5 6.7 0 5-4 8-9.5 8H41V2zm5 5v5h4.5c1.8 0 3.2-1.1 3.2-2.5S52.3 7 50.5 7H46zm0 9v7h5c2.1 0 3.8-1.4 3.8-3.5S53.1 16 51 16H46z" fill="currentColor"/>
                <path d="M74 2c7.2 0 13 5.8 13 13s-5.8 13-13 13-13-5.8-13-13 5.8-13 13-13zm0 5c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8z" fill="currentColor"/>
              </svg>
            ) : (
              <svg viewBox="0 0 105 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: "20px", width: "auto" }} aria-hidden="true">
                <circle cx="10" cy="9" r="6" fill="#ffaa00"/>
                <circle cx="10" cy="23" r="6" fill="#00a3e0"/>
                <path d="M28 7c-4 0-7 2-7 5.5 0 6 12 3.5 12 9.5 0 3.5-3 5-7 5-4.5 0-8-2-8-5.5h-4c0 6 5.5 9.5 12 9.5 6.5 0 11-3.5 11-9 0-6.5-12-4-12-10 0-3 2.5-4.5 6.5-4.5 3.5 0 7 1.5 7 4.5h4C45 8.5 40 7 28 7z" fill="#ffffff"/>
                <path d="M50 2h4v27h-4V2z" fill="#ffffff"/>
                <path d="M59 2h4v5h-4V2zm0 8h4v19h-4V10z" fill="#ffffff"/>
                <path d="M68 10h4v3c1.2-2.2 3.5-3.5 6.5-3.5 5 0 8.5 3.8 8.5 9.5V29h-4V19c0-3.5-2-5.5-5.5-5.5-3.5 0-5.5 2-5.5 5.5v10h-4V10z" fill="#ffffff"/>
                <path d="M91 10h4v2.5c1.2-2 3.5-3 6-3 6.5 0 10.5 4.5 10.5 10s-4 10-10.5 10c-2.5 0-4.8-1-6-3V34h-4V10zm4 9.5c0 3.5 2.5 6 6 6s6-2.5 6-6-2.5-6-6-6-6 2.5-6 6z" fill="#ffffff"/>
              </svg>
            )}
          </div>
          <div>
            <h2>{brandName.toUpperCase()}</h2>
            <p className="portal-sub">
              {isFubo
                ? "Live Sports, ESPN, FS1, NFL Network & Regional Networks"
                : "Live Entertainment, CNN, TNT Sports & Cable Hits"}
            </p>
          </div>
        </div>

        {/* Dual Mode Switcher */}
        <div className="portal-mode-toggle">
          <button
            className={`portal-mode-btn ${activeMode === "driving" ? "active" : ""}`}
            onClick={() => setActiveMode("driving")}
            style={{
              borderColor: activeMode === "driving" ? brandColor : undefined,
              background: activeMode === "driving" ? (isFubo ? "rgba(255, 89, 0, 0.2)" : "rgba(0, 163, 224, 0.2)") : undefined,
            }}
          >
            <Car size={16} />
            <span>Passenger Driving Mode (Canvas)</span>
          </button>
          <button
            className={`portal-mode-btn ${activeMode === "official" ? "active" : ""}`}
            onClick={() => setActiveMode("official")}
            style={{
              borderColor: activeMode === "official" ? brandColor : undefined,
              background: activeMode === "official" ? (isFubo ? "rgba(255, 89, 0, 0.2)" : "rgba(0, 163, 224, 0.2)") : undefined,
            }}
          >
            <ExternalLink size={16} />
            <span>Official Web App (Parked / Login)</span>
          </button>
        </div>
      </header>

      {/* Mode 1: Passenger In-Motion Driving Experience */}
      {activeMode === "driving" ? (
        <div className="portal-driving-view">
          <div className="driving-status-banner">
            <div className="status-indicator">
              <span className="live-dot-pulse" />
              <strong>TESLA PASSENGER IN-MOTION CANVAS ACTIVE</strong>
            </div>
            <p>
              These channels stream directly through Volta&apos;s GPU Canvas pipeline. They will continue playing seamlessly with <strong>full sound</strong> while the car is in <strong>Drive</strong>.
            </p>
          </div>

          <div className="portal-channels-section">
            <div className="section-title-row">
              <h3>Featured {brandName} Live Feeds</h3>
              <button className="view-guide-btn" onClick={onOpenLiveTv}>
                <span>Open Full Multi-Provider Guide</span>
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="portal-grid">
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  className="portal-card"
                  onClick={() => onPlay(channel)}
                >
                  <div className="portal-card-thumb">
                    <img
                      src={channel.image || "/art/hero.jpg"}
                      alt={channel.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/art/hero.jpg";
                      }}
                    />
                    <div className="channel-live-indicator">
                      <span className="live-pulse" />
                      <span>LIVE</span>
                    </div>
                    <div className="portal-card-play">
                      <Play size={28} fill="currentColor" />
                    </div>
                  </div>

                  <div className="portal-card-body">
                    <span className="portal-group-tag" style={{ color: brandColor }}>
                      {channel.group || "Live TV"}
                    </span>
                    <h4>{channel.title}</h4>
                    <p>{channel.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Mode 2: Official Web App Login & Parked Fullscreen Launcher */
        <div className="portal-official-view">
          <div className="official-card">
            <div className="official-card-header">
              <ShieldCheck size={32} style={{ color: brandColor }} />
              <div>
                <h3>Official {brandName} Web Portal</h3>
                <p>Log in with your active {brandName} account credentials</p>
              </div>
            </div>

            <div className="official-info-box">
              <div className="info-item">
                <CheckCircle size={18} style={{ color: "#34d399" }} />
                <span>Access your full personalized subscription, cloud DVR, and local affiliates.</span>
              </div>
              <div className="info-item">
                <CheckCircle size={18} style={{ color: "#34d399" }} />
                <span>Works smoothly in the car while Parked (Supercharging or waiting).</span>
              </div>
              <div className="info-item alert">
                <HelpCircle size={18} style={{ color: "#f59e0b" }} />
                <span>
                  <strong>Note:</strong> Commercial DRM protects {brandName}&apos;s web app, so Tesla will freeze official web video when in Drive. Switch to <strong>&ldquo;Passenger Driving Mode&rdquo;</strong> above when you hit the road!
                </span>
              </div>
            </div>

            <div className="official-actions">
              <a
                href={officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="launch-official-btn"
                style={{ background: brandColor }}
              >
                <ExternalLink size={20} />
                <span>Launch {brandName} App in New Tab</span>
              </a>

              <button className="return-driving-btn" onClick={() => setActiveMode("driving")}>
                <Car size={18} />
                <span>Switch to Passenger Driving Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
