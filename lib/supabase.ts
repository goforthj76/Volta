import { createBrowserClient } from "@supabase/ssr";
export const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
export function supabase() {
  if (!configured)
    throw new Error(
      "Account sync is not configured. Set the Supabase environment variables.",
    );
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
