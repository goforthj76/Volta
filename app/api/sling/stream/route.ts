import { sling } from "@/lib/sling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return sling.stream(request);
}
