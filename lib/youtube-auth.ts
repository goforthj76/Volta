// In-memory pairing session store for Volta Phone QR pairing
export interface YouTubeProfile {
  channelId: string;
  title: string;
  avatar: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface PairSession {
  code: string;
  createdAt: number;
  profile?: YouTubeProfile;
}

// Global store across hot reloads and serverless invocations
declare global {
    var __volta_yt_sessions: Map<string, PairSession> | undefined;
}

const sessions = globalThis.__volta_yt_sessions ?? new Map<string, PairSession>();
if (!globalThis.__volta_yt_sessions) {
  globalThis.__volta_yt_sessions = sessions;
}

// Cleanup expired sessions older than 15 minutes
function cleanOldSessions() {
  const now = Date.now();
  for (const [code, sess] of sessions.entries()) {
    if (now - sess.createdAt > 15 * 60 * 1000) {
      sessions.delete(code);
    }
  }
}

export function createPairSession(): string {
  cleanOldSessions();
  // Generate 6-digit uppercase pair code
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  sessions.set(code, { code, createdAt: Date.now() });
  return code;
}

export function getPairSession(code: string): PairSession | undefined {
  cleanOldSessions();
  return sessions.get(code.toUpperCase());
}

export function completePairSession(code: string, profile: YouTubeProfile): boolean {
  cleanOldSessions();
  const sess = sessions.get(code.toUpperCase());
  if (!sess) return false;
  sess.profile = profile;
  sessions.set(code.toUpperCase(), sess);
  return true;
}
