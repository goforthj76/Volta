"use strict";

let canvas = null;
let ctx = null;
let isPlaying = false;
let abortCtrl = null;
let tsBuffer = new Uint8Array(0);
let patPid = -1;
let videoPid = -1;
let audioPid = -1;
let sps = null;
let pps = null;
let decoder = null;
let isConfigured = false;
let hasKeyframe = false;
let frameQueue = [];
let animTimer = null;
let ptsBase = null;
let ptsOffset = 0;
let clockStart = 0;
let hasClock = false;

function post(msg) {
  self.postMessage(msg);
}

function log(msg, level = "info") {
  post({ t: "log", msg, level });
}

function resetState() {
  try {
    decoder?.close();
  } catch {}
  decoder = null;
  sps = null;
  pps = null;
  isConfigured = false;
  hasKeyframe = false;
  for (const item of frameQueue) {
    try {
      item.frame.close();
    } catch {}
  }
  frameQueue = [];
  tsBuffer = new Uint8Array(0);
  patPid = -1;
  videoPid = -1;
  audioPid = -1;
  ptsBase = null;
  hasClock = false;
}

function stopPresent() {
  if (animTimer) {
    clearTimeout(animTimer);
    animTimer = null;
  }
}

function schedulePresent() {
  if (!animTimer && isPlaying) {
    animTimer = setTimeout(presentLoop, 16);
  }
}

async function presentLoop() {
  animTimer = null;
  if (!isPlaying || !ctx || !canvas) return;

  const now = performance.now();
  let clockMs = 0;
  if (hasClock) {
    clockMs = ptsOffset + (now - clockStart);
  }

  while (frameQueue.length && frameQueue[0].ptsMs <= clockMs) {
    const item = frameQueue.shift();
    if (item) {
      try {
        ctx.drawImage(item.frame, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        log("Draw frame error: " + (err.message || err), "warn");
      } finally {
        try {
          item.frame.close();
        } catch {}
      }
    }
  }

  // Cap backlog to keep memory low
  while (isPlaying && frameQueue.length > 40) {
    const item = frameQueue.shift();
    try {
      item.frame.close();
    } catch {}
  }

  if (isPlaying) {
    schedulePresent();
  }
}

function pushTs(bytes) {
  const merged = new Uint8Array(tsBuffer.length + bytes.length);
  merged.set(tsBuffer);
  merged.set(bytes, tsBuffer.length);
  tsBuffer = merged;

  let pos = 0;
  while (pos < tsBuffer.length && tsBuffer[pos] !== 0x47) {
    pos++;
  }

  while (pos + 188 <= tsBuffer.length) {
    if (tsBuffer[pos] !== 0x47) {
      pos++;
      continue;
    }
    parsePacket(tsBuffer.subarray(pos, pos + 188));
    pos += 188;
  }
  tsBuffer = tsBuffer.subarray(pos);
}

function parsePacket(pkt) {
  const pid = ((pkt[1] & 0x1f) << 8) | pkt[2];
  const payloadUnitStart = !!(pkt[1] & 0x40);
  const adaptation = (pkt[3] >> 4) & 3;

  let offset = 4;
  if (adaptation === 2 || (adaptation === 3 && (offset = 5 + pkt[4]), offset >= 188)) {
    return;
  }

  const payload = pkt.subarray(offset);
  if (!payload.length) return;

  if (pid === 0 && payloadUnitStart) {
    parsePat(payload);
  } else if (patPid >= 0 && pid === patPid && payloadUnitStart) {
    parsePmt(payload);
  } else if (payloadUnitStart && payload[0] === 0 && payload[1] === 0 && payload[2] === 1) {
    const streamId = payload[3];
    if (streamId >= 0xe0 && streamId <= 0xef && videoPid < 0) {
      videoPid = pid;
    } else if (streamId >= 0xc0 && streamId <= 0xdf && audioPid < 0) {
      audioPid = pid;
    }
  }

  if (pid !== videoPid && pid !== audioPid) return;

  let pesHeaderLen = 0;
  let pts = null;
  if (payloadUnitStart && payload[0] === 0 && payload[1] === 0 && payload[2] === 1) {
    const flags = payload[7];
    const headerDataLen = payload[8];
    pesHeaderLen = 9 + headerDataLen;
    if (flags & 0x80) {
      pts = readPts(payload, 9);
    }
  }

  if (pesHeaderLen >= payload.length) return;
  const esData = payload.subarray(pesHeaderLen);

  if (esData.length) {
    if (pid === videoPid) {
      ingestVideo(esData, pts);
    } else if (pid === audioPid) {
      ingestAudio(esData, pts);
    }
  }
}

function parsePat(payload) {
  const pointer = payload[0] + 1;
  const data = payload.subarray(pointer);
  if (data[0] !== 0) return;
  const sectionLen = ((data[1] & 0x0f) << 8) | data[2];
  let pos = 8;
  const end = 3 + sectionLen - 4;
  while (pos + 4 <= end && pos + 4 <= data.length) {
    const programNum = (data[pos] << 8) | data[pos + 1];
    const pmt = ((data[pos + 2] & 0x1f) << 8) | data[pos + 3];
    if (programNum !== 0) {
      patPid = pmt;
    }
    pos += 4;
  }
}

function parsePmt(payload) {
  const pointer = payload[0] + 1;
  const data = payload.subarray(pointer);
  if (data[0] !== 2) return;
  const sectionLen = ((data[1] & 0x0f) << 8) | data[2];
  let pos = 12 + (((data[10] & 0x0f) << 8) | data[11]);
  const end = 3 + sectionLen - 4;
  while (pos + 5 <= end && pos + 5 <= data.length) {
    const streamType = data[pos];
    const elemPid = ((data[pos + 1] & 0x1f) << 8) | data[pos + 2];
    const esInfoLen = ((data[pos + 3] & 0x0f) << 8) | data[pos + 4];

    if (streamType === 0x1b) {
      // H.264
      videoPid = elemPid;
    } else if (streamType === 0x0f || streamType === 0x03 || streamType === 0x04) {
      // AAC / MP3
      audioPid = elemPid;
    }
    pos += 5 + esInfoLen;
  }
}

function readPts(data, idx) {
  return (
    ((data[idx] & 0x0e) << 29) |
    (data[idx + 1] << 22) |
    ((data[idx + 2] & 0xfe) << 14) |
    (data[idx + 3] << 7) |
    ((data[idx + 4] & 0xfe) >> 1)
  );
}

function ingestAudio(data, pts) {
  if (!pts) return;
  const ptsMs = pts / 90;
  const copy = new Uint8Array(data.length);
  copy.set(data);
  post({ t: "audio", data: copy.buffer, ptsMs }, [copy.buffer]);
}

function ingestVideo(data, pts) {
  const nals = splitAnnexB(data);
  if (!nals.length) return;

  for (const nal of nals) {
    const nalType = nal[0] & 0x1f;
    if (nalType === 7) sps = nal;
    if (nalType === 8) pps = nal;
  }

  if (!isConfigured && sps && pps) {
    try {
      configureDecoder(sps, pps);
    } catch (err) {
      post({ t: "error", msg: "Decoder configuration: " + err.message });
      return;
    }
  }

  if (!decoder || !isConfigured) return;

  const isKey = nals.some((nal) => (nal[0] & 0x1f) === 5);
  if (!hasKeyframe && !isKey) return;
  if (isKey) hasKeyframe = true;

  const avcc = annexToAvcc(nals);
  if (!avcc) return;

  const ptsMs = pts != null ? pts / 90 : 0;
  if (ptsBase === null && pts != null) {
    ptsBase = pts;
    ptsOffset = 0;
    clockStart = performance.now();
    hasClock = true;
  }

  try {
    decoder.decode(
      new EncodedVideoChunk({
        type: isKey ? "key" : "delta",
        timestamp: Math.round(ptsMs * 1e3),
        data: avcc,
      }),
    );
  } catch (err) {
    log("Decode error: " + (err.message || err), "warn");
  }
}

function splitAnnexB(buf) {
  const nals = [];
  let pos = 0;
  const len = buf.length;

  const startCode = (i) => {
    if (buf[i] === 0 && buf[i + 1] === 0) {
      if (buf[i + 2] === 1) return i + 3;
      if (buf[i + 2] === 0 && buf[i + 3] === 1) return i + 4;
    }
    return -1;
  };

  while (pos < len - 4) {
    const start = startCode(pos);
    if (start < 0) {
      pos++;
      continue;
    }
    let end = start;
    while (end < len - 4 && startCode(end) < 0) {
      end++;
    }
    if (end > start) {
      nals.push(buf.subarray(start, end));
    }
    pos = end;
  }
  return nals;
}

function annexToAvcc(nals) {
  let total = 0;
  for (const n of nals) {
    total += 4 + n.length;
  }
  const avcc = new Uint8Array(total);
  let p = 0;
  for (const n of nals) {
    avcc[p++] = (n.length >>> 24) & 0xff;
    avcc[p++] = (n.length >>> 16) & 0xff;
    avcc[p++] = (n.length >>> 8) & 0xff;
    avcc[p++] = n.length & 0xff;
    avcc.set(n, p);
    p += n.length;
  }
  return avcc;
}

function buildAvcC(spsBuf, ppsBuf) {
  const desc = new Uint8Array(11 + spsBuf.length + ppsBuf.length);
  desc[0] = 1;
  desc[1] = spsBuf[1];
  desc[2] = spsBuf[2];
  desc[3] = spsBuf[3];
  desc[4] = 0xff;
  desc[5] = 0xe1;
  desc[6] = (spsBuf.length >> 8) & 0xff;
  desc[7] = spsBuf.length & 0xff;
  desc.set(spsBuf, 8);
  let p = 8 + spsBuf.length;
  desc[p++] = 1;
  desc[p++] = (ppsBuf.length >> 8) & 0xff;
  desc[p++] = ppsBuf.length & 0xff;
  desc.set(ppsBuf, p);
  return desc;
}

function configureDecoder(spsBuf, ppsBuf) {
  const desc = buildAvcC(spsBuf, ppsBuf);
  const hex = (b) => b.toString(16).padStart(2, "0");
  const codec = "avc1." + hex(spsBuf[1]) + hex(spsBuf[2]) + hex(spsBuf[3]);

  decoder = new VideoDecoder({
    output: (frame) => {
      const ptsMs = frame.timestamp / 1e3;
      frameQueue.push({ frame, ptsMs });
      frameQueue.sort((a, b) => a.ptsMs - b.ptsMs);
    },
    error: (err) => {
      post({ t: "error", msg: err.message || "VideoDecoder error" });
    },
  });

  decoder.configure({
    codec,
    description: desc,
    optimizeForLatency: true,
  });
  isConfigured = true;
  log("In-Motion VideoDecoder configured: " + codec, "success");
}

async function playStream(url) {
  stop();
  resetState();
  isPlaying = true;
  abortCtrl = new AbortController();
  schedulePresent();

  try {
    const res = await fetch(url, {
      signal: abortCtrl.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      post({ t: "error", msg: `HTTP ${res.status}` });
      return;
    }
    post({ t: "ready" });
    const reader = res.body?.getReader();
    if (!reader) return;

    while (isPlaying) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value?.length) {
        pushTs(value);
      }
      while (isPlaying && frameQueue.length > 30) {
        await new Promise((r) => setTimeout(r, 10));
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      post({ t: "error", msg: err.message || "Stream read error" });
    }
  }
}

function stop() {
  isPlaying = false;
  stopPresent();
  if (abortCtrl) {
    try {
      abortCtrl.abort();
    } catch {}
    abortCtrl = null;
  }
  resetState();
}

self.onmessage = (e) => {
  const data = e.data || {};
  switch (data.t) {
    case "init":
      canvas = data.canvas;
      ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      break;
    case "play":
      playStream(data.url);
      break;
    case "stop":
      stop();
      break;
    default:
      break;
  }
};
