"use client";

import { useState } from "react";
import { vehicles, displays, Vehicle, Display } from "@/lib/vehicle";
import { X, ArrowRight, ShieldCheck, KeyRound, Crown } from "lucide-react";
import {
  MASTER_ADMIN_EMAIL,
  isMasterAdmin,
  registerAccount,
  authenticateAccount,
  UserAccount,
} from "@/lib/accounts";

export default function Auth({
  close,
  onSignedIn,
}: {
  close: () => void;
  onSignedIn: (account: UserAccount) => void;
}) {
  const [vehicle, setVehicle] = useState<Vehicle>("Tesla Model 3");
  const [display, setDisplay] = useState<Display>("Center display (parked)");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdminEmail = isMasterAdmin(email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setSuccessMsg("");

    try {
      if (mode === "signup") {
        const res = registerAccount({
          email,
          password,
          name: name.trim() || (isAdminEmail ? "Owner" : "Passenger"),
          vehicle,
          display,
          inviteCode: isAdminEmail ? undefined : inviteCode,
        });

        if (!res.success) {
          setMessage(res.error || "Failed to create account.");
          setBusy(false);
          return;
        }

        setSuccessMsg(
          isAdminEmail
            ? "Welcome, Owner! Secret Menu and all vehicle features unlocked."
            : "Account created successfully! Welcome aboard Volta.",
        );

        setTimeout(() => {
          if (res.account) onSignedIn(res.account);
          close();
        }, 1200);
      } else {
        const res = authenticateAccount(email, password);
        if (!res.success) {
          setMessage(res.error || "Invalid email or password.");
          setBusy(false);
          return;
        }

        setSuccessMsg(`Welcome back, ${res.account?.name || email}!`);
        setTimeout(() => {
          if (res.account) onSignedIn(res.account);
          close();
        }, 1000);
      }
    } catch {
      setMessage("Authentication error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="detail-modal-overlay" onClick={close}>
      <section
        className="auth-modal-box"
        role="dialog"
        aria-modal="true"
        aria-label="Account Authentication"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="close-modal-btn"
          onClick={close}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="auth-symbol">
          {isAdminEmail ? (
            <div className="owner-crown-icon">
              <Crown size={32} />
            </div>
          ) : (
            <ShieldCheck size={32} />
          )}
        </div>

        <span className="eyebrow">
          {isAdminEmail ? "OWNER ACCESS" : "VOLTA PASSENGER ACCESS · INVITE ONLY"}
        </span>
        <h2>
          {mode === "signup"
            ? isAdminEmail
              ? "Claim Owner Account"
              : "Passenger Registration"
            : "Sign In to Volta"}
        </h2>
        <p>
          {isAdminEmail
            ? `Welcome ${MASTER_ADMIN_EMAIL}. You have full access and invite generation privileges.`
            : mode === "signup"
              ? "Access requires an active passenger invite code issued by the vehicle owner."
              : "Enter your registered credentials to access your synced library."}
        </p>

        {message && <div className="login-error-alert">{message}</div>}
        {successMsg && <div className="login-success-alert">{successMsg}</div>}

        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && (
            <div className="form-group">
              <label>Your Name</label>
              <input
                required
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="given-name"
                placeholder={isAdminEmail ? "Tesla Owner" : "First name"}
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="At least 6 characters"
            />
          </div>

          {mode === "signup" && (
            <>
              {isAdminEmail ? (
                <div className="owner-bypass-pill">
                  <Crown size={14} />
                  <span>Owner Account Recognized — No Invite Code Required</span>
                </div>
              ) : (
                <div className="form-group">
                  <label className="invite-label">
                    <KeyRound size={14} />
                    <span>Invite Code (Required)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="e.g. VOLTA-VIP-2026"
                    className="invite-code-input"
                  />
                  <small className="field-hint">
                    Need a code? Ask the vehicle owner ({MASTER_ADMIN_EMAIL}) for a passenger pass.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label>Your Vehicle</label>
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value as Vehicle)}
                >
                  {vehicles.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Viewing Screen</label>
                <select
                  value={display}
                  onChange={(e) => setDisplay(e.target.value as Display)}
                >
                  {displays.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <button disabled={busy} className="submit-login-btn full-width">
            {busy ? (
              "Authenticating…"
            ) : mode === "signup" ? (
              isAdminEmail ? "Activate Owner Account" : "Register with Invite Code"
            ) : (
              "Sign In"
            )}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-links-row">
          <button
            type="button"
            className="text-toggle-btn"
            onClick={() => {
              setMode(mode === "signup" ? "signin" : "signup");
              setMessage("");
              setSuccessMsg("");
            }}
          >
            {mode === "signup"
              ? "Already have an account? Sign In"
              : "Got an invite code? Create Account"}
          </button>
        </div>
      </section>
    </div>
  );
}
