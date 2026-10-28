"use client";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Play,
  RotateCcw,
  MonitorPlay,
  MousePointer2,
} from "lucide-react";

export default function CockpitHero({
  vehicle,
  onPlay,
  onExplore,
}: {
  vehicle: string;
  onPlay: () => void;
  onExplore: () => void;
}) {
  const scene = useRef<HTMLDivElement>(null);
  const [paint, setPaint] = useState(0);
  const paints = [
    {
      name: "Pearl white",
      base: "#e8edf1",
      shade: "#65717e",
      shine: "#ffffff",
    },
    {
      name: "Stealth grey",
      base: "#78818e",
      shade: "#252e3c",
      shine: "#bfc7d2",
    },
    { name: "Ultra red", base: "#ce263d", shade: "#510d20", shine: "#ff7a83" },
  ];
  const p = paints[paint];
  function reset() {
    scene.current?.style.setProperty("--yaw", "0deg");
    scene.current?.style.setProperty("--pitch", "0deg");
  }
  return (
    <section className="cockpit-hero">
      <div className="cockpit-grid" aria-hidden="true" />
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      <div className="cockpit-copy">
        <span className="cockpit-eyebrow">
          <span />
          THE PASSENGER EXPERIENCE, REIMAGINED
        </span>
        <h1>
          Your Tesla.
          <br />
          Your <span>front row.</span>
        </h1>
        <p>
          A whole world of entertainment.
          <br />
          Designed for the best seat in the house.
        </p>
        <div className="hero-buttons">
          <button className="primary" onClick={onPlay}>
            <Play size={17} fill="currentColor" />
            Enter cinema
          </button>
          <button className="glass-button" onClick={onExplore}>
            Explore your apps
            <ArrowUpRight size={18} />
          </button>
        </div>
        <div className="cockpit-caption">
          <span className="caption-line" />
          <span>ONE CABIN. ENDLESS POSSIBILITIES.</span>
        </div>
      </div>
      <div
        className="vehicle-scene"
        ref={scene}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty(
            "--yaw",
            `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`,
          );
          e.currentTarget.style.setProperty(
            "--pitch",
            `${-((e.clientY - r.top) / r.height - 0.5) * 7}deg`,
          );
        }}
        onPointerLeave={reset}
      >
        <div className="scene-header">
          <span className="scene-label">YOUR CABIN</span>
          <span className="scene-model">{vehicle.replace("Tesla ", "")}</span>
          <span className="scene-profile">Display profile</span>
        </div>
        <div className="scene-stage">
          <div className="orbit orbit-a" />
          <div className="orbit orbit-b" />
          <div className="vehicle-shadow" />
          <div className="vehicle-model">
            <svg
              viewBox="0 0 800 440"
              role="img"
              aria-label={`${vehicle}, interactive vehicle illustration in ${p.name}`}
              className="vehicle-render"
            >
              <defs>
                <linearGradient id="body" x1="0" y1="0" x2="0.25" y2="1">
                  <stop stopColor={p.shine} />
                  <stop offset=".46" stopColor={p.base} />
                  <stop offset="1" stopColor={p.shade} />
                </linearGradient>
                <linearGradient id="hood" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor={p.shine} />
                  <stop offset=".6" stopColor={p.base} />
                  <stop offset="1" stopColor={p.shade} />
                </linearGradient>
                <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#394756" />
                  <stop offset=".45" stopColor="#111a24" />
                  <stop offset="1" stopColor="#03080d" />
                </linearGradient>
                <radialGradient id="wheel">
                  <stop stopColor="#72808e" />
                  <stop offset=".25" stopColor="#202833" />
                  <stop offset=".7" stopColor="#080b10" />
                  <stop offset=".85" stopColor="#252a31" />
                  <stop offset="1" stopColor="#080b0e" />
                </radialGradient>
                <linearGradient id="light">
                  <stop stopColor="#ffffff" />
                  <stop offset="1" stopColor="#bddfff" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" />
                </filter>
              </defs>
              <ellipse
                cx="412"
                cy="352"
                rx="285"
                ry="28"
                fill="#000"
                opacity=".55"
              />
              <g className="car-body">
                <path
                  d="M111 256 Q114 219 156 197 L228 174 Q291 102 388 95 Q466 93 534 155 L647 186 Q692 198 713 234 L716 285 Q704 319 646 335 L230 348 Q149 331 112 296Z"
                  fill="url(#body)"
                  stroke="#b9c5d2"
                  strokeOpacity=".32"
                  strokeWidth="1.5"
                />
                <path
                  d="M228 174 Q299 114 385 106 Q462 105 525 158 L434 206Z"
                  fill="url(#glass)"
                  stroke="#a2afbd"
                  strokeWidth="3"
                />
                <path d="M247 174 Q290 136 343 122 L334 192Z" fill="#111a24" />
                <path
                  d="M352 120 Q377 113 398 115 Q451 116 493 151 L427 193 344 192Z"
                  fill="url(#glass)"
                />
                <path d="M431 201 534 158 641 190 560 239Z" fill="url(#hood)" />
                <path
                  d="M116 251 215 247 428 219 561 239 703 225"
                  fill="none"
                  stroke={p.shine}
                  strokeOpacity=".6"
                  strokeWidth="2"
                />
                <path
                  d="M219 250 221 302 420 290 429 224 M342 234 338 292"
                  fill="none"
                  stroke="#15202a"
                  strokeOpacity=".5"
                  strokeWidth="1.3"
                />
                <path
                  d="M116 287 Q248 330 438 302 L550 282"
                  fill="none"
                  stroke="#23303b"
                  strokeOpacity=".5"
                  strokeWidth="2"
                />
                <path
                  d="M120 300 229 330 435 316 555 293"
                  fill="none"
                  stroke="#090e14"
                  strokeWidth="9"
                />
                <path
                  d="M555 240 644 222 704 231 705 273 655 299 564 294Z"
                  fill="url(#body)"
                />
                <path
                  d="M573 282 Q632 293 693 260 L691 280 Q629 313 574 303Z"
                  fill="#141b22"
                />
                <path
                  d="M565 241 618 236 633 245 575 257Z"
                  fill="url(#light)"
                />
                <path
                  d="M680 231 704 233 702 244 672 244Z"
                  fill="url(#light)"
                />
                <path
                  d="M567 247 617 243 M681 237 700 237"
                  stroke="white"
                  strokeWidth="5"
                  opacity=".6"
                  filter="url(#glow)"
                />
                <path d="M120 244 145 247 147 259 119 256Z" fill="#f53f53" />
                <path
                  d="M286 240 310 237 M369 229 392 226"
                  stroke="#38424c"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <path
                  d="M428 204 452 194 463 203 444 214Z"
                  fill={p.shade}
                  stroke="#74808d"
                />
                <path d="M543 201 557 205 553 210 544 208Z" fill="#737e88" />
                <g transform="translate(211 302) rotate(-10)">
                  <ellipse rx="43" ry="57" fill="#090b0f" />
                  <ellipse
                    rx="31"
                    ry="45"
                    fill="url(#wheel)"
                    stroke="#56616b"
                    strokeWidth="2"
                  />
                  {[0, 60, 120, 180, 240, 300].map((a) => (
                    <path
                      key={a}
                      d="M-4-8 -9-39 2-41 5-9Z"
                      fill="#7c8893"
                      transform={`rotate(${a})`}
                    />
                  ))}
                  <ellipse rx="9" ry="12" fill="#10151b" stroke="#a3aeb8" />
                </g>
                <g transform="translate(550 291) rotate(10)">
                  <ellipse rx="44" ry="59" fill="#080a0e" />
                  <ellipse
                    rx="32"
                    ry="46"
                    fill="url(#wheel)"
                    stroke="#56616b"
                    strokeWidth="2"
                  />
                  {[0, 60, 120, 180, 240, 300].map((a) => (
                    <path
                      key={a}
                      d="M-4-8 -9-40 2-42 5-9Z"
                      fill="#84909b"
                      transform={`rotate(${a})`}
                    />
                  ))}
                  <ellipse rx="9" ry="12" fill="#10151b" stroke="#a3aeb8" />
                </g>
                <path
                  d="M166 220 Q286 205 425 211"
                  fill="none"
                  stroke="white"
                  strokeOpacity=".2"
                  strokeWidth="2"
                />
              </g>
            </svg>
          </div>
          <div className="scene-cross cross-one" />
          <div className="scene-cross cross-two" />
          <div className="scene-coordinate">
            <span>VOLTA / DESIGN STUDY 01</span>
            <span>INTERACTIVE VISUALIZATION</span>
          </div>
        </div>
        <div className="scene-footer">
          <div
            className="paint-selector"
            aria-label="Vehicle illustration color"
          >
            {paints.map((c, i) => (
              <button
                key={c.name}
                aria-label={c.name}
                aria-pressed={paint === i}
                className={paint === i ? "selected" : ""}
                style={{ "--paint": c.base } as React.CSSProperties}
                onClick={() => setPaint(i)}
              />
            ))}
          </div>
          <span className="scene-hint">
            <MousePointer2 size={12} />
            Move to explore
          </span>
          <button
            className="reset-scene"
            aria-label="Reset vehicle view"
            onClick={() => {
              setPaint(0);
              reset();
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>
      <div className="cockpit-footnote">
        <MonitorPlay size={13} /> Built for your display. Ready for your
        downtime.
      </div>
    </section>
  );
}
