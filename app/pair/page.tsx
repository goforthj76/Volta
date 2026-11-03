"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Youtube, ArrowRight, ShieldCheck } from "lucide-react";

function PairContent() {
  const searchParams = useSearchParams();
  const codeParam = searchParams.get("code") || "";
  const [code, setCode] = useState(codeParam.toUpperCase());

  const authUrl = `/api/auth/youtube/login?code=${encodeURIComponent(code)}&redirect=true`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#090a09",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          background: "#141715",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "24px",
          maxWidth: "420px",
          width: "100%",
          padding: "36px 24px",
          textAlign: "center",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "rgba(255, 0, 51, 0.15)",
            border: "1px solid rgba(255, 0, 51, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            color: "#ff0033",
          }}
        >
          <Youtube size={32} />
        </div>

        <h1 style={{ fontSize: "22px", fontWeight: "800", margin: "0 0 8px" }}>
          Link YouTube to Tesla
        </h1>
        <p style={{ color: "#9ca3af", fontSize: "14px", margin: "0 0 24px" }}>
          Sign in securely on your phone to beam your personal subscriptions &amp; playlists to the car.
        </p>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <span
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: "700",
              color: "#6b7280",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            PAIRING CODE
          </span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={8}
            style={{
              background: "transparent",
              border: "none",
              color: "#38bdf8",
              fontFamily: "ui-monospace, monospace",
              fontSize: "26px",
              fontWeight: "800",
              letterSpacing: "4px",
              textAlign: "center",
              width: "100%",
              outline: "none",
            }}
          />
        </div>

        <a
          href={authUrl}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            background: "#ffffff",
            color: "#000000",
            textDecoration: "none",
            fontWeight: "700",
            fontSize: "15px",
            padding: "14px 20px",
            borderRadius: "12px",
            transition: "all 0.2s",
            marginBottom: "20px",
          }}
        >
          <span>Continue with Google</span>
          <ArrowRight size={18} />
        </a>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "#6b7280",
            fontSize: "12px",
          }}
        >
          <ShieldCheck size={16} />
          <span>Read-only access • Safe for passenger use</span>
        </div>
      </div>
    </div>
  );
}

export default function PairPage() {
  return (
    <Suspense fallback={<div style={{ color: "#fff", padding: 40, textAlign: "center" }}>Loading...</div>}>
      <PairContent />
    </Suspense>
  );
}
