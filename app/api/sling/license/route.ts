import { sling } from "@/lib/sling";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return sling.license(request);
}
