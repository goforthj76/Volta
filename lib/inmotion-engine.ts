"use client";

import * as MP4Box from "mp4box";

export interface InMotionPlaybackOptions {
  canvas: HTMLCanvasElement;
  audio: HTMLAudioElement;
  videoUrl: string;
  audioUrl?: string;
  isLive?: boolean;
  onReady?: () => void;
  onError?: (err: string) => void;
  onProgress?: (currentTime: number, duration: number) => void;
}

export interface IInMotionPlayer {
  start(): Promise<void>;
  seek(seconds: number): void;
  destroy(): void;
}

type MP4FileInstance = ReturnType<typeof MP4Box.createFile>;

export class InMotionMP4Player implements IInMotionPlayer {
  private canvas: HTMLCanvasElement;
  private audio: HTMLAudioElement;
  private videoUrl: string;
  private audioUrl: string;
  private ctx: CanvasRenderingContext2D | null = null;
  private decoder: VideoDecoder | null = null;
  private mp4boxfile: MP4FileInstance | null = null;
  private abortController: AbortController | null = null;
  private frameQueue: Array<{ frame: VideoFrame; pts: number }> = [];
  private animId: number | null = null;
  private isDestroyed = false;
  private isConfigured = false;
  private onReadyCb?: () => void;
  private onErrorCb?: (err: string) => void;
  private onProgressCb?: (cur: number, dur: number) => void;

  constructor(options: InMotionPlaybackOptions) {
    this.canvas = options.canvas;
    this.audio = options.audio;
    this.videoUrl = options.videoUrl;
    this.audioUrl = options.audioUrl || options.videoUrl;
    this.onReadyCb = options.onReady;
    this.onErrorCb = options.onError;
    this.onProgressCb = options.onProgress;
    this.ctx = this.canvas.getContext("2d", { alpha: false, desynchronized: true });
  }

  public async start(): Promise<void> {
    if (typeof VideoDecoder === "undefined") {
      this.onErrorCb?.("WebCodecs VideoDecoder is not supported in this browser version.");
      return;
    }

    try {
      this.abortController = new AbortController();
      this.mp4boxfile = MP4Box.createFile();

      this.mp4boxfile.onError = (_module: string, message: string) => {
        console.warn("[InMotionMP4] mp4box error:", message);
        if (!this.isConfigured) {
          this.onErrorCb?.("Could not demux MP4 stream: " + message);
        }
      };

      this.mp4boxfile.onReady = (info) => {
        if (this.isDestroyed || !this.mp4boxfile) return;
        const videoTrack = info.videoTracks?.[0];
        if (!videoTrack) {
          this.onErrorCb?.("No video track found in stream.");
          return;
        }

        const trak = (this.mp4boxfile as unknown as { getTrackById: (id: number) => { mdia?: { minf?: { stbl?: { stsd?: { entries?: Array<{ avcC?: { write: (s: unknown) => void; size: number } }> } } } } } }).getTrackById(videoTrack.id);
        let avcCDesc: Uint8Array | null = null;
        if (trak?.mdia?.minf?.stbl?.stsd?.entries) {
          for (const entry of trak.mdia.minf.stbl.stsd.entries) {
            if (entry.avcC) {
              const DSClass = MP4Box.DataStream as unknown as {
                BIG_ENDIAN: boolean;
                new (buf?: ArrayBuffer, byteOffset?: number, endianness?: boolean): { buffer: ArrayBuffer };
              };
              const stream = new DSClass(undefined, 0, DSClass.BIG_ENDIAN);
              entry.avcC.write(stream);
              avcCDesc = new Uint8Array(stream.buffer, 8);
              break;
            }
          }
        }

        try {
          this.decoder = new VideoDecoder({
            output: (frame: VideoFrame) => {
              if (this.isDestroyed) {
                frame.close();
                return;
              }
              const ptsSeconds = frame.timestamp / 1e6;
              this.frameQueue.push({ frame, pts: ptsSeconds });
              while (this.frameQueue.length > 60) {
                const dropped = this.frameQueue.shift();
                dropped?.frame.close();
              }
            },
            error: (err: unknown) => {
              console.warn("[InMotionMP4] Decoder error:", err);
            },
          });

          const config: VideoDecoderConfig = {
            codec: videoTrack.codec,
            codedWidth: videoTrack.video?.width || 1280,
            codedHeight: videoTrack.video?.height || 720,
            optimizeForLatency: true,
          };
          if (avcCDesc) {
            config.description = avcCDesc;
          }

          this.decoder.configure(config);
          this.isConfigured = true;
          this.onReadyCb?.();

          this.mp4boxfile.setExtractionOptions(videoTrack.id, null, { nbSamples: 100 });
          this.mp4boxfile.start();

          this.startRenderLoop();
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[InMotionMP4] VideoDecoder configuration failed:", err);
          this.onErrorCb?.(msg || "Failed to configure video decoder.");
        }
      };

      this.mp4boxfile.onSamples = (track_id: number, ref: unknown, samples) => {
        if (this.isDestroyed || !this.decoder || this.decoder.state !== "configured") return;
        for (const sample of samples) {
          if (!sample.data) continue;
          try {
            this.decoder.decode(
              new EncodedVideoChunk({
                type: sample.is_sync ? "key" : "delta",
                timestamp: (1e6 * sample.cts) / sample.timescale,
                duration: (1e6 * sample.duration) / sample.timescale,
                data: sample.data,
              }),
            );
          } catch (e: unknown) {
            console.warn("[InMotionMP4] Sample decode error:", e);
          }
        }
      };

      this.audio.src = this.audioUrl;
      this.audio.preload = "auto";
      void this.streamVideoBytes();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.onErrorCb?.(msg || "Failed to initialize playback");
    }
  }

  private async streamVideoBytes(): Promise<void> {
    try {
      const res = await fetch(this.videoUrl, {
        signal: this.abortController?.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} streaming video`);
      }
      const reader = res.body?.getReader();
      if (!reader) return;

      let fileOffset = 0;
      while (!this.isDestroyed) {
        const { value, done } = await reader.read();
        if (done) {
          this.mp4boxfile?.flush();
          break;
        }
        if (value && value.buffer) {
          const ab = value.buffer.slice(
            value.byteOffset,
            value.byteOffset + value.byteLength,
          ) as ArrayBuffer & { fileStart: number };
          ab.fileStart = fileOffset;
          fileOffset += ab.byteLength;
          this.mp4boxfile?.appendBuffer(ab);
        }
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (!isAbort && !this.isDestroyed) {
        console.warn("[InMotionMP4] Video stream fetch error:", err);
      }
    }
  }

  private startRenderLoop(): void {
    const render = () => {
      if (this.isDestroyed) return;

      const currentAudioTime = this.audio.currentTime;
      const duration = this.audio.duration || 0;
      this.onProgressCb?.(currentAudioTime, duration);

      if (this.ctx && this.frameQueue.length > 0) {
        while (this.frameQueue.length > 1 && this.frameQueue[0].pts < currentAudioTime - 0.08) {
          const old = this.frameQueue.shift();
          old?.frame.close();
        }

        const next = this.frameQueue[0];
        if (next && next.pts <= currentAudioTime + 0.05) {
          const item = this.frameQueue.shift();
          if (item) {
            const frame = item.frame;
            const targetW = this.canvas.width;
            const targetH = this.canvas.height;
            const fw = frame.displayWidth || frame.codedWidth || targetW;
            const fh = frame.displayHeight || frame.codedHeight || targetH;

            const fAspect = fw / fh;
            const cAspect = targetW / targetH;
            let dw = targetW;
            let dh = targetH;
            let dx = 0;
            let dy = 0;
            if (fAspect > cAspect) {
              dh = Math.round(targetW / fAspect);
              dy = Math.round((targetH - dh) / 2);
            } else {
              dw = Math.round(targetH * fAspect);
              dx = Math.round((targetW - dw) / 2);
            }

            this.ctx.fillStyle = "#000000";
            this.ctx.fillRect(0, 0, targetW, targetH);
            try {
              this.ctx.drawImage(frame, dx, dy, dw, dh);
            } catch {
              // Frame draw catch
            }
            frame.close();
          }
        }
      }

      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  }

  public seek(seconds: number): void {
    this.audio.currentTime = seconds;
    while (this.frameQueue.length > 0) {
      const f = this.frameQueue.shift();
      f?.frame.close();
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    while (this.frameQueue.length > 0) {
      const f = this.frameQueue.shift();
      f?.frame.close();
    }
    try {
      this.decoder?.close();
    } catch {}
    this.decoder = null;
    this.mp4boxfile = null;
  }
}

export class InMotionTSPlayer implements IInMotionPlayer {
  private canvas: HTMLCanvasElement;
  private audio: HTMLAudioElement;
  private streamUrl: string;
  private worker: Worker | null = null;
  private isDestroyed = false;
  private onReadyCb?: () => void;
  private onErrorCb?: (err: string) => void;
  private onProgressCb?: (cur: number, dur: number) => void;

  constructor(options: InMotionPlaybackOptions) {
    this.canvas = options.canvas;
    this.audio = options.audio;
    this.streamUrl = options.videoUrl;
    this.onReadyCb = options.onReady;
    this.onErrorCb = options.onError;
    this.onProgressCb = options.onProgress;
  }

  public async start(): Promise<void> {
    if (typeof Worker === "undefined") {
      this.onErrorCb?.("Workers are not supported in this browser.");
      return;
    }

    try {
      this.audio.src = this.streamUrl;
      this.audio.preload = "auto";

      this.worker = new Worker("/workers/volta-ts-worker.js");
      this.worker.onmessage = (e) => {
        const data = e.data || {};
        switch (data.t) {
          case "ready":
            this.onReadyCb?.();
            break;
          case "error":
            this.onErrorCb?.(data.msg || "Playback error");
            break;
          case "progress":
            this.onProgressCb?.(data.pts / 1e3, 0);
            break;
          default:
            break;
        }
      };

      if ("transferControlToOffscreen" in this.canvas) {
        const offscreen = this.canvas.transferControlToOffscreen();
        this.worker.postMessage({ t: "init", canvas: offscreen }, [offscreen]);
      } else {
        this.worker.postMessage({ t: "init", canvas: this.canvas });
      }

      this.worker.postMessage({ t: "play", url: this.streamUrl });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.onErrorCb?.(msg || "Failed to initialize TS worker");
    }
  }

  public seek(seconds: number): void {
    this.audio.currentTime = seconds;
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.worker) {
      this.worker.postMessage({ t: "stop" });
      this.worker.terminate();
      this.worker = null;
    }
  }
}
