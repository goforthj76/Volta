"use client";

import { useState } from "react";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  Wind,
  Phone,
  Music,
  LayoutGrid,
  Camera,
  Volume2,
  VolumeX,
  Flame,
} from "lucide-react";

export default function TeslaDock({
  onOpenSettings,
  onOpenAppHub,
  inMotion = true,
}: {
  onOpenSettings?: () => void;
  onOpenAppHub?: () => void;
  inMotion?: boolean;
}) {
  const [driverTemp, setDriverTemp] = useState(68);
  const [passTemp, setPassTemp] = useState(68);
  const [seatWarmer, setSeatWarmer] = useState(0); // 0 = off, 1 = low, 2 = med, 3 = high
  const [fanActive, setFanActive] = useState(true);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);

  function cycleSeatWarmer() {
    setSeatWarmer((s) => (s + 1) % 4);
  }

  return (
    <footer className="tesla-bottom-dock" aria-label="Tesla vehicle controls">
      {/* Left Vehicle Controls */}
      <div className="dock-section dock-left">
        <button
          className="dock-icon-btn car-status-btn"
          onClick={onOpenSettings}
          title="Vehicle Settings & Studio"
          aria-label="Vehicle settings"
        >
          <Car size={22} />
        </button>

        {/* Driver Climate Temp Control */}
        <div className="dock-climate-control">
          <button
            className="dock-temp-arrow"
            onClick={() => setDriverTemp((t) => Math.max(60, t - 1))}
            aria-label="Decrease driver temp"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="dock-temp-value">{driverTemp}°</span>
          <button
            className="dock-temp-arrow"
            onClick={() => setDriverTemp((t) => Math.min(85, t + 1))}
            aria-label="Increase driver temp"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Seat Warmer */}
        <button
          className={`dock-icon-btn seat-heat-btn ${seatWarmer > 0 ? "heat-active" : ""}`}
          onClick={cycleSeatWarmer}
          title={`Seat Heater Level ${seatWarmer}`}
          aria-label="Seat heater"
        >
          <Flame size={18} />
          {seatWarmer > 0 && <span className="heat-dots">{"•".repeat(seatWarmer)}</span>}
        </button>

        {/* Fan / Defrost */}
        <button
          className={`dock-icon-btn ${fanActive ? "active" : ""}`}
          onClick={() => setFanActive(!fanActive)}
          title="HVAC Airflow"
          aria-label="HVAC Airflow"
        >
          <Wind size={18} />
        </button>
      </div>

      {/* Center Tesla Apps Launcher */}
      <div className="dock-section dock-center">
        <button
          className="dock-icon-btn"
          title="Phone / Bluetooth"
          aria-label="Phone"
        >
          <Phone size={18} />
        </button>

        <button
          className="dock-icon-btn"
          title="Tesla Audio"
          aria-label="Tesla Audio"
        >
          <Music size={19} />
        </button>

        {/* 9-Dot App Grid Launcher */}
        <button
          className="dock-icon-btn app-grid-btn highlight"
          onClick={onOpenAppHub}
          title="Tesla App Hub"
          aria-label="Tesla App Hub"
        >
          <LayoutGrid size={22} />
        </button>

        <button
          className="dock-icon-btn"
          title="Rear View Camera"
          aria-label="Camera"
        >
          <Camera size={19} />
        </button>

        {inMotion && (
          <div className="dock-drive-pill" title="In-Motion Canvas Engine Engaged">
            <span className="dock-live-dot" />
            <span>DRIVE ACTIVE</span>
          </div>
        )}
      </div>

      {/* Right Passenger Climate & Audio Volume */}
      <div className="dock-section dock-right">
        {/* Passenger Climate Temp Control */}
        <div className="dock-climate-control">
          <button
            className="dock-temp-arrow"
            onClick={() => setPassTemp((t) => Math.max(60, t - 1))}
            aria-label="Decrease passenger temp"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="dock-temp-value">{passTemp}°</span>
          <button
            className="dock-temp-arrow"
            onClick={() => setPassTemp((t) => Math.min(85, t + 1))}
            aria-label="Increase passenger temp"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Volume & Speaker Control */}
        <div className="dock-volume-wrap">
          <button
            className={`dock-icon-btn ${muted ? "muted" : ""}`}
            onClick={() => setMuted(!muted)}
            onMouseEnter={() => setVolumeOpen(true)}
            title={`Volume: ${muted ? "Muted" : `${volume}%`}`}
            aria-label="Volume"
          >
            {muted || volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>

          {volumeOpen && (
            <div
              className="dock-volume-slider-popup"
              onMouseLeave={() => setVolumeOpen(false)}
            >
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseInt(e.target.value));
                  if (muted) setMuted(false);
                }}
                className="volume-range-slider"
              />
              <span>{muted ? "Mute" : `${volume}%`}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
