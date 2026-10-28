import { createConnections } from "@/lib/connections.mjs";
const handle = createConnections();
export async function GET(request: Request) {
  return handle(request, process.env);
}
export async function POST(request: Request) {
  return handle(request, process.env);
}
