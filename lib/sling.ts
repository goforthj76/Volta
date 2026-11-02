import { randomUUID } from "node:crypto";
import { z } from "zod";

const CMS = "https://cbd46b77.cdn.cms.movetv.com";
const LICENSE = "https://p-drmwv.movetv.com/widevine/proxy";
const GUID = /^[a-f0-9]{32}$/i;
const MAX_CHALLENGE = 64 * 1024;
const channelSchema = z.object({
  channel_guid: z.string().optional(),
  external_id: z.string().optional(),
  title: z.string().optional(),
  network_affiliate_name: z.string().optional(),
  qvt_url: z.string().optional(),
  qvt: z.string().optional(),
  cmw_hide_channel: z.boolean().optional(),
  visibility: z.object({ visible: z.boolean().optional() }).optional(),
  metadata: z
    .object({
      is_free: z.boolean().optional(),
      is_linear_channel: z.boolean().optional(),
      channel_name: z.string().optional(),
      call_sign: z.string().optional(),
      genre: z.array(z.string()).optional(),
    })
    .optional(),
  thumbnail: z.object({ url: z.string().optional() }).optional(),
});

export type SlingChannel = {
  id: string;
  name: string;
  logo?: string;
  group: string;
};

function httpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.includes("{")) return;
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return;
    if (url.port && !["80", "443"].includes(url.port)) return;
    url.protocol = "https:";
    url.port = "";
    return url.href;
  } catch {
    return;
  }
}

function responseError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** Anonymous Freestream only. No credentials or caller-supplied upstream URLs. */
export function createSlingService(fetcher: typeof fetch = fetch) {
  let cached: { channels: SlingChannel[]; expires: number } | undefined;
  let pending: Promise<SlingChannel[]> | undefined;

  async function channels(): Promise<SlingChannel[]> {
    if (cached && cached.expires > Date.now()) return cached.channels;
    if (pending) return pending;
    pending = (async () => {
      const response = await fetcher(
        `${CMS}/cms/publish3/domain/summary/ums/1.json`,
        {
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
          redirect: "error",
        },
      );
      if (!response.ok) throw new Error("Sling catalog unavailable");
      const payload = z
        .object({ channels: z.array(z.unknown()) })
        .parse(await response.json());
      const found = new Map<string, SlingChannel>();
      for (const entry of payload.channels) {
        const parsed = channelSchema.safeParse(entry);
        if (!parsed.success) continue;
        const item = parsed.data;
        const metadata = item.metadata;
        const id = item.channel_guid || item.external_id || "";
        const name =
          metadata?.channel_name ||
          item.network_affiliate_name ||
          item.title ||
          metadata?.call_sign;
        if (
          !GUID.test(id) ||
          !name ||
          !metadata?.is_free ||
          !metadata.is_linear_channel ||
          item.visibility?.visible === false ||
          item.cmw_hide_channel ||
          !(item.qvt_url || item.qvt)
        )
          continue;
        if (
          /^SLATEPO\d|^HYBRID-SIGNALTEST-/i.test(metadata.call_sign || "") ||
          /^SLATEPO\d|^HYBRID-SIGNALTEST-/i.test(item.title || "") ||
          metadata.genre?.some((genre) => genre.toLowerCase() === "test")
        )
          continue;
        found.set(id, {
          id,
          name,
          logo: httpsUrl(item.thumbnail?.url),
          group: metadata.genre?.[0] || "Live TV",
        });
      }
      const result = [...found.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      cached = { channels: result, expires: Date.now() + 5 * 60 * 1000 };
      return result;
    })();
    try {
      return await pending;
    } finally {
      pending = undefined;
    }
  }

  async function selected(request: Request) {
    const id = new URL(request.url).searchParams.get("channel") || "";
    if (!GUID.test(id)) return undefined;
    return (await channels()).find((channel) => channel.id === id);
  }

  return {
    async catalog() {
      try {
        return Response.json(
          { channels: await channels() },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch {
        return responseError(
          "Sling's free-channel list is unavailable. Please retry.",
          502,
        );
      }
    },
    async stream(request: Request) {
      try {
        const channel = await selected(request);
        if (!channel) return responseError("Free channel not found.", 404);
        const response = await fetcher(
          `${CMS}/playermetadata/sling/v1/api/channels/${channel.id}/current/schedule.qvt`,
          {
            signal: AbortSignal.timeout(15000),
            cache: "no-store",
            redirect: "error",
          },
        );
        if (!response.ok)
          return responseError(
            "This Sling channel is currently unavailable.",
            502,
          );
        const payload = await response.json();
        const playback = payload?.playback_info;
        const manifest = [
          playback?.dash_manifest_url,
          playback?.live_m3u8_url_template,
          playback?.m3u8_url_template,
        ]
          .map(httpsUrl)
          .find(Boolean);
        if (!manifest)
          return responseError(
            "Sling did not supply a compatible stream for this channel.",
            502,
          );
        return Response.json(
          { manifest },
          { headers: { "Cache-Control": "no-store" } },
        );
      } catch {
        return responseError(
          "Unable to load this Sling channel. Please retry.",
          502,
        );
      }
    },
    async license(request: Request) {
      // The native CDM sends the challenge; only this site's player can forward it.
      const url = new URL(request.url);
      const protocol =
        request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
        url.protocol.slice(0, -1);
      const expectedOrigin = `${protocol}://${request.headers.get("host") || url.host}`;
      if (request.headers.get("origin") !== expectedOrigin)
        return responseError("Request not allowed.", 403);
      if (
        request.headers.get("content-type")?.split(";")[0].trim() !==
        "application/octet-stream"
      ) {
        return responseError("Invalid license request.", 415);
      }
      if (Number(request.headers.get("content-length")) > MAX_CHALLENGE)
        return responseError("License request too large.", 413);
      try {
        const channel = await selected(request);
        if (!channel) return responseError("Free channel not found.", 404);
        const challenge = new Uint8Array(await request.arrayBuffer());
        if (!challenge.length || challenge.length > MAX_CHALLENGE)
          return responseError("Invalid license request size.", 413);
        const response = await fetcher(LICENSE, {
          method: "POST",
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(15000),
          headers: {
            "Content-Type": "text/plain;charset=UTF-8",
            Origin: "https://watch.sling.com",
            Referer: "https://watch.sling.com/",
          },
          body: JSON.stringify({
            env: "production",
            user_id: randomUUID(),
            channel_id: channel.id,
            message: [...challenge],
          }),
        });
        if (!response.ok)
          return responseError(
            "Sling could not authorize this free stream.",
            502,
          );
        return new Response(await response.arrayBuffer(), {
          headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      } catch {
        return responseError(
          "Sling playback authorization is unavailable. Please retry.",
          502,
        );
      }
    },
  };
}

export const sling = createSlingService();
