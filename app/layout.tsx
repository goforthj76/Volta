import type { Metadata } from "next";
import "./globals.css";
import "./cockpit.css";
import "./launcher.css";
export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  title: "VOLTa — A better way to pass the miles",
  description:
    "Your passenger entertainment, beautifully connected. YouTube, live television and your media library.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
