// src/lib/supabase/client.js
// Browser-side Supabase client using @supabase/ssr
// This is the correct way to use Supabase in "use client" components
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
