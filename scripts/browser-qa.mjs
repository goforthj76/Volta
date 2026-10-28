import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
const root = process.cwd();
const artifacts = process.env.QA_ARTIFACT_DIR || "/tmp/volta-qa";
await mkdir(artifacts, { recursive: true });
const server = spawn("npm", ["run", "dev", "--", "--port", "3000"], {
  cwd: root,
  stdio: "ignore",
  detached: true,
});
const chrome = spawn(
  process.env.CHROMIUM_BIN || "/usr/bin/chromium",
  [
    "--headless",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--remote-debugging-port=9222",
    "--user-data-dir=/tmp/volta-qa-chrome",
    "--no-first-run",
    "--autoplay-policy=document-user-activation-required",
    ...(process.env.HTTPS_PROXY
      ? ["--proxy-server=" + process.env.HTTPS_PROXY]
      : []),
    "about:blank",
  ],
  { stdio: "ignore", detached: true },
);
let socket;
let errors = [];
let counter = 0;
const pending = new Map();
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (let i = 0; i < 45; i++) {
    try {
      const r = await fetch("http://127.0.0.1:3000");
      if (r.ok) break;
    } catch {}
    await pause(500);
  }
  let target;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(
        "http://127.0.0.1:9222/json/new?http://127.0.0.1:3000",
        { method: "PUT" },
      );
      target = await r.json();
      break;
    } catch {}
    await pause(300);
  }
  if (!target) throw new Error("Chromium did not start");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    socket.onopen = r;
    socket.onerror = j;
  });
  socket.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id) {
      const p = pending.get(m.id);
      if (p) {
        pending.delete(m.id);
        if (m.error) p.reject(new Error(m.error.message));
        else p.resolve(m.result);
      }
    }
    if (m.method === "Runtime.exceptionThrown")
      errors.push(m.params.exceptionDetails.text);
  };
  function cdp(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++counter;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  const evaluate = async (expression) => {
    const r = await cdp("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (r.exceptionDetails)
      throw new Error(
        r.exceptionDetails.exception?.description || r.exceptionDetails.text,
      );
    return r.result.value;
  };
  await cdp("Runtime.enable");
  await cdp("Page.enable");
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp("Page.navigate", { url: "http://127.0.0.1:3000" });
  await pause(3500);
  const desktop = await cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(
    `${artifacts}/desktop.png`,
    Buffer.from(desktop.data, "base64"),
  );
  console.log(
    "Desktop:",
    await evaluate(
      '({width:innerWidth,body:document.body.scrollWidth,hero:!!document.querySelector(".cockpit-hero"),car:!!document.querySelector(".vehicle-render")})',
    ),
  );
  await cdp("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await cdp("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  await pause(600);
  const phone = await cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(`${artifacts}/phone.png`, Buffer.from(phone.data, "base64"));
  console.log(
    "Phone:",
    await evaluate(
      '({width:innerWidth,body:document.body.scrollWidth,touch:matchMedia("(pointer: coarse)").matches})',
    ),
  );
  await evaluate('document.querySelector(".cockpit-copy .primary").click()');
  await pause(800);
  const rect = await evaluate(
    '(()=>{const r=document.querySelector(".big-play").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()',
  );
  await cdp("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: rect.x, y: rect.y }],
  });
  await cdp("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await pause(2500);
  const video = await evaluate(
    '(()=>{const v=document.querySelector("video");return {src:v?.currentSrc,paused:v?.paused,time:v?.currentTime,duration:v?.duration,ready:v?.readyState,error:v?.error?.message,nativeControls:v?.controls}})()',
  );
  console.log("Phone playback:", JSON.stringify(video));
  if (video.paused || video.time < 0.1 || video.error)
    throw new Error("Phone playback verification failed");
  await evaluate('document.querySelector(".player-top button").click()');
  await pause(300);
  await evaluate(
    '[...document.querySelectorAll("nav button")].find(b=>b.textContent.includes("Stremio")).click()',
  );
  await pause(600);
  await evaluate(
    '[...document.querySelectorAll(".card-image")].find(b=>b.getAttribute("aria-label").includes("Sintel")).click()',
  );
  await pause(600);
  const trailer = await evaluate(
    '(()=>{const r=document.querySelector(".big-play").getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()',
  );
  await cdp("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [trailer],
  });
  await cdp("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await pause(1500);
  console.log(
    "Trailer playback:",
    await evaluate(
      '({paused:document.querySelector("video").paused,time:document.querySelector("video").currentTime,error:document.querySelector("video").error?.message})',
    ),
  );
  if (errors.length) throw new Error("Browser errors: " + errors.join(", "));
  console.log("Browser QA passed.");
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  socket?.close();
  for (const p of [chrome, server]) {
    try {
      process.kill(-p.pid, "SIGTERM");
    } catch {}
  }
}
