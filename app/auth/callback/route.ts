import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (
    code &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const jar = await cookies();
    const client = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => jar.getAll(),
          setAll: (
            items: { name: string; value: string; options: CookieOptions }[],
          ) =>
            items.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            ),
        },
      },
    );
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.redirect(new URL("/?auth=failed", req.url));
}
