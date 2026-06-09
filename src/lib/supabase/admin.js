// src/lib/supabase/admin.js
// Server-side Supabase ADMIN client using SERVICE_ROLE_KEY — bypasses RLS.
// Only for use in cron jobs and server-side operations that need to
// read/write data without an authenticated user session.
// NEVER expose this on the client, NEVER use in route handlers that
// accept user input directly.
import { createClient } from "@supabase/supabase-js";

let _adminClient = null;

export function getAdminClient() {
  if (_adminClient) return _adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("placeholder") || url === "undefined") return null;
  _adminClient = createClient(url, key);
  return _adminClient;
}
