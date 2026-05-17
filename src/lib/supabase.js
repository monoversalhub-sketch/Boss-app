// src/lib/supabase.js
// Legacy client — used by existing /api routes only.
// New code uses src/lib/supabase/client.js and src/lib/supabase/server.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (url && key && url.includes(".supabase.co"))
  ? createClient(url, key)
  : null;

export const USE_SUPABASE = !!supabase;
