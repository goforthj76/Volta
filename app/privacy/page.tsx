import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — Volta Passenger Entertainment",
  description: "Privacy Policy and data practices for Volta in-cabin passenger entertainment.",
};

export default function PrivacyPage() {
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
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10b981",
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", margin: 0, color: "#ffffff" }}>
              Privacy Policy
            </h1>
            <span style={{ fontSize: "13px", color: "#9ca3af" }}>
              Last updated: November 2026
            </span>
          </div>
        </div>

        <p style={{ fontSize: "16px", lineHeight: "1.6", color: "#cbd5e1", marginTop: "20px" }}>
          Volta (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) is a passenger-focused in-vehicle web entertainment portal. We respect your privacy and are committed to maintaining transparent, secure, and minimal data practices.
        </p>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "28px 0" }} />

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
          1. Information We Access and Process
        </h2>
        <p style={{ lineHeight: "1.6", color: "#94a3b8", fontSize: "14px" }}>
          When you connect your Google/YouTube account using our phone pairing QR feature:
        </p>
        <ul style={{ lineHeight: "1.8", color: "#cbd5e1", fontSize: "14px", paddingLeft: "20px" }}>
          <li>
            <strong>Read-Only YouTube Scope (<code>.../auth/youtube.readonly</code>)</strong>: We request read-only access solely to display your subscribed channels, personal playlists, and saved videos on your car display.
          </li>
          <li>
            <strong>No Modification or Deletion</strong>: Volta cannot upload videos, delete playlists, like or comment on videos, or modify your Google account.
          </li>
          <li>
            <strong>No Credential Storage</strong>: Volta never sees, receives, or stores your Google account password. Authentication happens securely on Google&apos;s own servers.
          </li>
        </ul>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "28px 0" }} />

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
          2. Local Profile Storage &amp; Isolation
        </h2>
        <p style={{ lineHeight: "1.6", color: "#94a3b8", fontSize: "14px" }}>
          Access tokens received through authorization are stored locally within your individual Volta profile in your car or device browser. Each vehicle passenger profile remains completely separate. We do not sell, rent, or monetize your personal information or viewing habits to any third parties or advertisers.
        </p>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "28px 0" }} />

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
          3. How to Revoke Access &amp; Delete Data
        </h2>
        <p style={{ lineHeight: "1.6", color: "#94a3b8", fontSize: "14px" }}>
          You can disconnect your YouTube account at any time:
        </p>
        <ul style={{ lineHeight: "1.8", color: "#cbd5e1", fontSize: "14px", paddingLeft: "20px" }}>
          <li>
            <strong>Inside Volta</strong>: Click the &quot;Disconnect&quot; icon next to your name in the YouTube header to immediately wipe the local access token.
          </li>
          <li>
            <strong>In Google Account Settings</strong>: Visit <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8" }}>Google Third-Party Permissions</a> and revoke access for Volta with one click.
          </li>
        </ul>

        <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "28px 0" }} />

        <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "12px" }}>
          4. Contact Information
        </h2>
        <p style={{ lineHeight: "1.6", color: "#94a3b8", fontSize: "14px" }}>
          If you have any questions or data inquiries regarding this Privacy Policy, please contact the application administrator at: <code>mrgobeast@gmail.com</code>.
        </p>
      </div>
    </div>
  );
}
