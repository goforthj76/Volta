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
              <img src="/fubo-logo.svg" alt="Fubo" style={{ height: "26px", width: "auto", filter: "invert(42%) sepia(98%) saturate(1450%) hue-rotate(360deg) brightness(102%) contrast(105%)" }} />
            ) : (
              <img src="/sling-logo.svg" alt="Sling" style={{ height: "26px", width: "auto" }} />
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
                  <div className="portal-card-thumb" style={{ background: "#0c1018", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
                    {channel.image ? (
                      <img
                        src={channel.image}
                        alt={channel.title}
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const fallback = target.parentElement?.querySelector(".portal-card-fallback") as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="portal-card-fallback"
                      style={{
                        display: channel.image ? "none" : "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <span style={{ fontSize: "18px", fontWeight: "800", color: brandColor, letterSpacing: "1px" }}>
                        {channel.title}
                      </span>
                    </div>
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
