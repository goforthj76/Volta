import Link from "next/link";
import { AlertTriangle, ArrowLeft, ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Terms of Service — Volta Passenger Entertainment",
  description: "Terms of Service and Driver Safety Disclaimer for Volta.",
};

export default function TermsPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080a09",
        color: "#e2e8f0",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          background: "#121513",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "24px",
          padding: "40px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#38bdf8",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "24px",
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Volta</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#f59e0b",
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", margin: 0, color: "#ffffff" }}>
              Terms of Service &amp; Safety Policy
            </h1>
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>
              Last updated: November 2026
            </span>
          </div>
        </div>

        {/* Critical Safety Notice Box */}
        <div
          style={{
            margin: "24px 0",
            padding: "20px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "2px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "16px",
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          <AlertTriangle size={28} style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: "800", color: "#ef4444" }}>
              MANDATORY PASSENGER SAFETY NOTICE — NO DRIVER DISTRACTION
            </h3>
            <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.6", color: "#fca5a5" }}>
              Volta is designed and provided <strong>STRICTLY FOR PASSENGER USE ONLY</strong> or when the vehicle is safely parked. 
              The driver of the vehicle must <strong>NEVER</strong> view, interact with, or be distracted by video content while operating the vehicle. 
              The vehicle operator bears sole legal and physical responsibility for safe driving at all times.
            </p>
          </div>
        </div>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "28px 0" }} />

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
          1. Acceptance of Terms
        </h2>
        <p style={{ lineHeight: "1.6", color: "#94a3b8", fontSize: "14px" }}>
          By accessing or using the Volta passenger entertainment application (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use the application.
        </p>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "28px 0" }} />

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
          2. Safe Vehicle Operation &amp; Passenger Restriction
        </h2>
        <ul style={{ lineHeight: "1.8", color: "#cbd5e1", fontSize: "14px", paddingLeft: "20px" }}>
          <li>
            <strong>Passenger Entertainment Only</strong>: When the vehicle is in motion, all visual displays and controls must be directed toward and operated solely by front or rear passengers.
          </li>
          <li>
            <strong>Driver Inattention Prohibited</strong>: The driver must never look away from the road to watch media or adjust playback while driving. Drivers must obey all national, federal, and local traffic safety laws regarding distracted driving.
          </li>
          <li>
            <strong>Assumption of Risk</strong>: You acknowledge that operating a motor vehicle requires complete attention. The creators and hosts of Volta disclaim any and all liability for traffic citations, accidents, injuries, collisions, or damages arising from improper or distracted driver usage.
          </li>
        </ul>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "28px 0" }} />

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
          3. Third-Party Services (YouTube, HLS Streams)
        </h2>
        <p style={{ lineHeight: "1.6", color: "#94a3b8", fontSize: "14px" }}>
          Volta connects to third-party APIs and public media sources, including YouTube Data API and Free Ad-Supported Television (FAST) streams. By using these features, you agree to comply with third-party terms of service, including the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8" }}>YouTube Terms of Service</a>. Volta does not own third-party media content.
        </p>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "28px 0" }} />

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
          4. Disclaimer of Warranties
        </h2>
        <p style={{ lineHeight: "1.6", color: "#94a3b8", fontSize: "14px" }}>
          Volta is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express or implied. We do not guarantee uninterrupted stream playback, availability of specific third-party channels, or compatibility with future vehicle hardware revisions.
        </p>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "28px 0" }} />

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
          5. Contact &amp; Questions
        </h2>
        <p style={{ lineHeight: "1.6", color: "#94a3b8", fontSize: "14px" }}>
          For inquiries regarding these Terms of Service, please contact: <code>mrgobeast@gmail.com</code>.
        </p>
      </div>
    </div>
  );
}
