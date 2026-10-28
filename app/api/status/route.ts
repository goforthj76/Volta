export async function GET() {
  return Response.json(
    {
      youtube: { configured: Boolean(process.env.YOUTUBE_API_KEY) },
      runtime: "server",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
