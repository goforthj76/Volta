// Sites hosts the fully interactive guest client; Vercel runs the complete Next backend.
import { rename, mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const paths = ["app/api", "app/auth"];
await mkdir(".preview-routes", { recursive: true });
try {
  for (const p of paths) await rename(p, `.preview-routes/${p.split("/")[1]}`);
  const r = spawnSync("npm", ["run", "build"], {
    stdio: "inherit",
    env: { ...process.env, VOLTA_STATIC: "1", NEXT_PUBLIC_STATIC_PREVIEW: "1" },
  });
  if (r.status) process.exitCode = r.status;
} finally {
  for (const p of paths) await rename(`.preview-routes/${p.split("/")[1]}`, p);
  await rm(".preview-routes", { recursive: true, force: true });
}
