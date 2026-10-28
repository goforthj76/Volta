"use client";
import { useEffect, useState } from "react";
import {
  Youtube,
  Tv,
  Library,
  ArrowUpRight,
  Settings2,
  Play,
  History,
  ArrowRight,
  X,
  Check,
} from "lucide-react";
import dynamic from "next/dynamic";
const VehicleStudio = dynamic(() => import("./vehicle-studio"), { ssr: false });
import { vehicles, displays, Vehicle, Display } from "@/lib/vehicle";
import { readLocal, writeLocal } from "@/lib/storage";
export default function CabinLauncher({
  name,
  vehicle,
  display,
  onNavigate,
  onPlay,
  onAccount,
  onSave,
  hasHistory,
}: {
  name: string;
  vehicle: Vehicle;
  display: Display;
  onNavigate: (page: string) => void;
  onPlay: () => void;
  onAccount: () => void;
  onSave: (name: string, vehicle: Vehicle, display: Display) => void;
  hasHistory: boolean;
}) {
  const [paint, setPaint] = useState(0),
    [setup, setSetup] = useState(false),
    [step, setStep] = useState(0),
    [draftName, setDraftName] = useState(name),
    [draftVehicle, setDraftVehicle] = useState(vehicle),
    [draftDisplay, setDraftDisplay] = useState(display),
    [clock, setClock] = useState(""),
    [greeting, setGreeting] = useState("Welcome back");
  useEffect(() => {
    setPaint(readLocal("volta.paint", 0));
    setSetup(!readLocal("volta.cabinReady", false));
    const tick = () => {
      const d = new Date();
      setClock(
        d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      );
      setGreeting(
        d.getHours() < 12
          ? "Good morning"
          : d.getHours() < 18
            ? "Good afternoon"
            : "Good evening",
      );
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  function choosePaint(value: number) {
    setPaint(value);
    writeLocal("volta.paint", value);
  }
  function save() {
    onSave(draftName.trim() || name, draftVehicle, draftDisplay);
    writeLocal("volta.cabinReady", true);
    setSetup(false);
    setStep(0);
  }
  const apps = [
    {
      name: "YouTube",
      tag: "FOLLOW YOUR CURIOSITY",
      description: "Your next obsession starts here.",
      icon: Youtube,
      className: "youtube",
      image: "/art/city.jpg",
    },
    {
      name: "Live TV",
      tag: "STAY IN THE MOMENT",
      description: "Your channels. Your front-row seat.",
      icon: Tv,
      className: "live",
      image: "/art/ocean.jpg",
    },
    {
      name: "Stremio",
      tag: "ONE MORE GREAT STORY",
      description: "Your library, along for the ride.",
      icon: Library,
      className: "stremio",
      image: "/art/sintel.jpg",
    },
  ];
  return (
    <section className="cabin-launcher" aria-label="Your entertainment cabin">
      <div className="cabin-ambient" />
      <div className="cabin-intro">
        <div>
          <span className="cabin-kicker">THE ART OF DOING NOTHING.</span>
          <h1>
            {greeting}, <span>{name}.</span>
          </h1>
          <p>Your world. In your cabin.</p>
        </div>
        <div className="cabin-clock">
          <strong>{clock}</strong>
          <span>
            {vehicle.replace("Tesla ", "")} <i />{" "}
            {["Pearl white", "Stealth grey", "Ultra red"][paint]}
          </span>
        </div>
      </div>
      <div className="cabin-showroom">
        <VehicleStudio vehicle={vehicle} paint={paint} />
        <div className="cabin-showroom-copy">
          <span className="cabin-kicker">YOUR CABIN, REIMAGINED</span>
          <h2>
            Make yourself
            <br />
            <em>at home.</em>
          </h2>
          <p>
            Three worlds of entertainment.
            <br />
            One perfectly personal space.
          </p>
          <button
            className="cabin-personalize"
            onClick={() => {
              setDraftName(name);
              setDraftVehicle(vehicle);
              setDraftDisplay(display);
              setSetup(true);
              setStep(1);
            }}
          >
            <Settings2 size={15} />
            Personalize your cabin
          </button>
        </div>
        <span className="cabin-model-caption">
          {vehicle.toUpperCase()}{" "}
          <span>
            DESIGN STUDY / {["PEARL WHITE", "STEALTH GREY", "ULTRA RED"][paint]}
          </span>
        </span>
      </div>
      <div className="cabin-apps">
        {apps.map(
          ({
            name: appName,
            tag,
            description,
            icon: Icon,
            className,
            image,
          }) => (
            <button
              key={appName}
              className={`cabin-app ${className}`}
              onClick={() => onNavigate(appName)}
            >
              <img src={image} alt="" />
              <span className="cabin-app-scrim" />
              <span className="cabin-app-icon">
                <Icon size={27} />
              </span>
              <ArrowUpRight className="cabin-app-arrow" size={20} />
              <span className="cabin-app-content">
                <small>{tag}</small>
                <strong>
                  {appName === "Live TV" ? "Live television" : appName}
                </strong>
                <span>{description}</span>
              </span>
              <span className="cabin-app-launch">
                OPEN APP
                <ArrowRight size={13} />
              </span>
            </button>
          ),
        )}
      </div>
      <div className="cabin-bottom">
        <span>
          <i />
          PASSENGER ENTERTAINMENT
          <span className="cabin-bottom-detail">
            {" "}
            · DESIGNED FOR YOUR DOWNTIME
          </span>
        </span>
        <div>
          <button
            onClick={() => (hasHistory ? onNavigate("History") : onPlay())}
          >
            {hasHistory ? <History size={14} /> : <Play size={14} />}{" "}
            {hasHistory ? "Continue watching" : "Try cinema"}
          </button>
          <button onClick={() => onNavigate("Favorites")}>
            Your favorites
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
      {setup && (
        <div className="modal-backdrop cabin-onboarding">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Set up your cabin"
          >
            <button
              className="icon-button modal-close"
              aria-label="Explore without setup"
              onClick={() => {
                writeLocal("volta.cabinReady", true);
                setSetup(false);
              }}
            >
              <X />
            </button>
            <span className="eyebrow">VOLTA / YOUR PERSONAL CABIN</span>
            {step === 0 ? (
              <>
                <h2>
                  A space that feels
                  <br />
                  like yours.
                </h2>
                <p>
                  Your Tesla. Your color. Your entertainment.
                  <br />
                  Let’s make yourself at home.
                </p>
                <div className="onboarding-services">
                  <Youtube />
                  <Tv />
                  <Library />
                </div>
                <button
                  className="primary full-width"
                  onClick={() => setStep(1)}
                >
                  Set up my cabin
                  <ArrowRight size={17} />
                </button>
                <button
                  className="onboarding-account"
                  onClick={() => {
                    setSetup(false);
                    onAccount();
                  }}
                >
                  Sign in / Create account
                </button>
                <small className="onboarding-note">
                  Device setup works immediately. Account sync requires a
                  connected account service.
                </small>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  save();
                }}
              >
                <h2>Your cabin. Your way.</h2>
                <label>
                  What should we call you?
                  <input
                    autoFocus
                    required
                    maxLength={24}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    autoComplete="given-name"
                  />
                </label>
                <div className="onboarding-fields">
                  <label>
                    Your vehicle
                    <select
                      value={draftVehicle}
                      onChange={(e) =>
                        setDraftVehicle(e.target.value as Vehicle)
                      }
                    >
                      {vehicles.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Display location
                    <select
                      value={draftDisplay}
                      onChange={(e) =>
                        setDraftDisplay(e.target.value as Display)
                      }
                    >
                      {displays.map((d) => (
                        <option key={d}>{d}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="paint-label">Choose your finish</label>
                <div className="onboarding-paints">
                  {["Pearl white", "Stealth grey", "Ultra red"].map((p, i) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={paint === i}
                      className={paint === i ? "selected" : ""}
                      onClick={() => choosePaint(i)}
                    >
                      <span
                        style={{
                          background: ["#e8edf1", "#78818e", "#ce263d"][i],
                        }}
                      />
                      {p}
                      {paint === i && <Check size={13} />}
                    </button>
                  ))}
                </div>
                <button className="primary full-width" type="submit">
                  Enter my cabin
                  <ArrowRight size={17} />
                </button>
                <p className="onboarding-note">
                  Saved on this device. You can connect an account for
                  cross-device features from your profile.
                </p>
              </form>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
