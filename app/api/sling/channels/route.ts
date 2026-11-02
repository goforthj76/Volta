import { sling } from "@/lib/sling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return sling.catalog();
}
