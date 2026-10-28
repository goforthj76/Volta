"use client";
import { useState } from "react";
import { vehicles, displays, Vehicle, Display } from "@/lib/vehicle";
import { writeLocal } from "@/lib/storage";
import { X, ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { configured, supabase } from "@/lib/supabase";
export default function Auth({
  close,
  onSignedIn,
}: {
  close: () => void;
  onSignedIn: () => void;
}) {
  const [vehicle, setVehicle] = useState<Vehicle>("Tesla Model 3"),
    [display, setDisplay] = useState<Display>("Center display (parked)"),
    [mode, setMode] = useState<"signin" | "signup" | "reset" | "update">(
      "signin",
    ),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const client = supabase();
      if (mode === "reset") {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback`,
        });
        if (error) throw error;
        setMessage("If this email has an account, a reset link is on its way.");
      } else if (mode === "update") {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated.");
      } else if (mode === "signup") {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { vehicle, display },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        writeLocal("volta.vehicle", { vehicle, display });
        setMessage("Check your inbox to confirm your account.");
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSignedIn();
        close();
      }
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to connect. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Account"
      >
        <button
          className="icon-button modal-close"
          onClick={close}
          aria-label="Close"
        >
          <X />
        </button>
        <div className="auth-symbol">
          <ShieldCheck size={32} />
        </div>
        <span className="eyebrow">YOUR WORLD, CONNECTED</span>
        <h2>
          {mode === "signup"
            ? "Make yourself at home."
            : mode === "reset"
              ? "A fresh start."
              : mode === "update"
                ? "Choose a new password."
                : "Welcome back."}
        </h2>
        <p>Keep your favorites, profiles and next episodes together.</p>
        {!configured && (
          <div className="notice">
            You’re in guest mode. Account sync needs Supabase configuration;
            everything you save stays on this device.
          </div>
        )}
        <form onSubmit={submit}>
          {mode !== "update" && (
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Password
              <input
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                placeholder="At least 8 characters"
              />
            </label>
          )}
          {mode === "signup" && (
            <>
              <label>
                Your vehicle
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value as Vehicle)}
                >
                  {vehicles.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Where will you watch?
                <select
                  value={display}
                  onChange={(e) => setDisplay(e.target.value as Display)}
                >
                  {displays.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </label>
              <p className="muted">
                We adapt to your screen automatically. Your vehicle preference
                helps us tailor controls; playback follows your vehicle’s
                display restrictions.
              </p>
            </>
          )}
          <button disabled={busy || !configured} className="primary">
            {busy
              ? "Connecting…"
              : mode === "reset"
                ? "Send reset link"
                : mode === "signup"
                  ? "Create account"
                  : mode === "update"
                    ? "Update password"
                    : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <div className="auth-links">
          <button
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          >
            {mode === "signup"
              ? "Already have an account?"
              : "Create an account"}
          </button>
          <button onClick={() => setMode("reset")}>Forgot password?</button>
          <button onClick={() => setMode("update")}>Update password</button>
        </div>
        <button
          className="secondary full-width"
          disabled={!configured}
          onClick={async () => {
            try {
              const { error } = await supabase().auth.signInWithOAuth({
                provider: "google",
                options: { redirectTo: `${location.origin}/auth/callback` },
              });
              if (error) setMessage(error.message);
            } catch (e) {
              setMessage(String(e));
            }
          }}
        >
          <Mail size={18} />
          Continue with Google
        </button>
        <small>Secure authentication powered by Supabase.</small>
      </section>
    </div>
  );
}
