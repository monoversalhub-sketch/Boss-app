// src/lib/db.js
// ─────────────────────────────────────────────────────────────────
//  BOSS — Data Layer
//
//  Auth: calls our own Next.js API routes (/api/auth/*)
//        which call Supabase server-side — zero CORS issues.
//
//  Data: calls Supabase directly from browser using createBrowserClient
//        from @supabase/ssr (the correct production pattern).
//        Falls back to localStorage if Supabase is not configured.
// ─────────────────────────────────────────────────────────────────

// ── Check if Supabase is configured ──────────────────────────────
function hasSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    url.includes(".supabase.co") &&
    url !== "undefined"
  );
}

// ── localStorage helpers ──────────────────────────────────────────
function ls(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, value) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Get browser Supabase client (lazy, only when configured) ──────
let _browserClient = null;
async function getBrowserClient() {
  if (!hasSupabase()) return null;
  if (_browserClient) return _browserClient;
  // Dynamic import so the SDK is never loaded when Supabase isn't configured
  const { createClient } = await import("./supabase/client.js");
  _browserClient = createClient();
  return _browserClient;
}

// ── Auth via API routes (server proxies to Supabase) ─────────────
async function authFetch(path, body = null) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Public API ────────────────────────────────────────────────────
export const db = {

  // ── Auth ─────────────────────────────────────────────────────────
  async signUpWithPassword(email, password) {
    if (!hasSupabase()) {
      // Local fallback: store in localStorage
      const accounts = ls("boss_accounts", {});
      const key = email.toLowerCase().trim();
      if (accounts[key]) return { error: { message: "Account already exists. Please log in." } };
      accounts[key] = btoa(password + "boss_v1");
      lsSet("boss_accounts", accounts);
      lsSet("boss_session", { email: key });
      return { data: { session: true }, error: null };
    }
    const data = await authFetch("/api/auth/signup", { email, password });
    if (data.error) return { error: { message: data.error } };
    return { data: { session: data.session, needsConfirmation: data.needsConfirmation }, error: null };
  },

  async signInWithPassword(email, password) {
    if (!hasSupabase()) {
      const accounts = ls("boss_accounts", {});
      const key = email.toLowerCase().trim();
      if (!accounts[key]) return { error: { message: "No account found. Create one first." } };
      if (accounts[key] !== btoa(password + "boss_v1")) return { error: { message: "Incorrect password." } };
      lsSet("boss_session", { email: key });
      return { data: { session: true }, error: null };
    }
    const data = await authFetch("/api/auth/login", { email, password });
    if (data.error) return { error: { message: data.error } };
    return { data: { session: true }, error: null };
  },

  async getSession() {
    if (!hasSupabase()) return ls("boss_session", null);
    const data = await authFetch("/api/auth/session");
    return data.user || null;
  },

  async signOut() {
    lsSet("boss_session", null);
    if (!hasSupabase()) return;
    await authFetch("/api/auth/logout", {});
  },

  // ── Tailor Profile ───────────────────────────────────────────────
  async getTailor() {
    const client = await getBrowserClient();
    if (!client) return ls("boss_tailor", null);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return ls("boss_tailor", null);
    const { data } = await client.from("tailors").select("id,shop,phone,city,bank_name,bank_code,account_number,account_name,virtual_account_number,virtual_bank_name,virtual_account_name,virtual_account_status,paystack_customer_code,bos_score,bos_score_updated_at,wallet_balance").eq("user_id", user.id).single();
    return data || ls("boss_tailor", null);
  },

  async setTailor(profile) {
    lsSet("boss_tailor", profile); // always cache locally
    const client = await getBrowserClient();
    if (!client) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    // Build the upsert payload — only include defined fields so we never
    // accidentally null-out existing data with an undefined spread.
    const payload = {
      user_id: user.id,
      shop:    profile.shop  || "",
      phone:   profile.phone || "",
      city:    profile.city  || "",
    };
    // Real bank details (used for future withdrawal / transfer recipient)
    if (profile.bank_name    !== undefined) payload.bank_name    = profile.bank_name    || null;
    if (profile.bank_code    !== undefined) payload.bank_code    = profile.bank_code    || null;
    if (profile.account_number !== undefined) payload.account_number = profile.account_number || null;
    if (profile.account_name !== undefined) payload.account_name = profile.account_name || null;
    // Virtual account fields (Paystack Dedicated Virtual Account)
    if (profile.virtual_account_number  !== undefined) payload.virtual_account_number  = profile.virtual_account_number  || null;
    if (profile.virtual_bank_name       !== undefined) payload.virtual_bank_name       = profile.virtual_bank_name       || null;
    if (profile.virtual_account_name    !== undefined) payload.virtual_account_name    = profile.virtual_account_name    || null;
    if (profile.virtual_account_status  !== undefined) payload.virtual_account_status  = profile.virtual_account_status  || "inactive";
    if (profile.paystack_customer_code  !== undefined) payload.paystack_customer_code  = profile.paystack_customer_code  || null;
    // BOSS wallet balance (stored on tailors row, updated by webhook)
    if (profile.wallet_balance          !== undefined) payload.wallet_balance          = profile.wallet_balance          ?? 0;
    await client.from("tailors").upsert(payload, { onConflict: "user_id" });
  },

  // ── Customers & Orders ───────────────────────────────────────────
  async getCustomers() {
    const client = await getBrowserClient();
    if (!client) return ls("boss_customers", []);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return ls("boss_customers", []);
    // Get tailor id first
    const { data: tailor } = await client.from("tailors").select("id").eq("user_id", user.id).single();
    if (!tailor) return ls("boss_customers", []);
    const { data } = await client.from("customers").select("*, orders(*)").eq("tailor_id", tailor.id).order("name");
    if (!data) return ls("boss_customers", []);
    return data.map(c => ({
      id: c.id, name: c.name, phone: c.phone || "",
      measurements: c.measurements || {}, notes: c.notes || "",
      orders: (c.orders || []).map(o => ({
        id: o.id, type: o.type || "", price: o.price || 0,
        deposit: o.deposit || 0, paid: o.paid || 0,
        date: o.delivery_date || "", status: o.status || "In Progress",
        notes: o.notes || "", createdAt: o.created_at,
        installmentHistory: o.installment_history || [],
      })),
    }));
  },

  async setCustomers(customers) {
    lsSet("boss_customers", customers); // always cache locally
    const client = await getBrowserClient();
    if (!client) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    const { data: tailor } = await client.from("tailors").select("id").eq("user_id", user.id).single();
    if (!tailor) return;
    for (const c of customers) {
      await client.from("customers").upsert({
        id: c.id, tailor_id: tailor.id, name: c.name,
        phone: c.phone || "", gender: c.gender || "female", measurements: c.measurements || {}, notes: c.notes || "",
      }, { onConflict: "id" });
      for (const o of (c.orders || [])) {
        await client.from("orders").upsert({
          id: o.id, customer_id: c.id, tailor_id: tailor.id,
          type: o.type || "", price: o.price || 0, deposit: o.deposit || 0,
          paid: o.paid || 0, delivery_date: o.date || null,
          status: o.status || "In Progress", notes: o.notes || "", installment_history: o.installmentHistory || [],
        }, { onConflict: "id" });
      }
    }
  },

  async recordPayment({ orderId, amount, method, paystackRef, virtualAccountNumber, senderName, transferCode }) {
    const client = await getBrowserClient();
    if (!client) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    const { data: tailor } = await client.from("tailors").select("id").eq("user_id", user.id).single();
    if (!tailor) return;
    await client.from("payments").insert({
      order_id:               orderId               || null,
      tailor_id:              tailor.id,
      amount,
      method:                 method                || "cash",
      paystack_ref:           paystackRef           || null,
      virtual_account_number: virtualAccountNumber  || null,
      sender_name:            senderName            || null,
      transfer_code:          transferCode          || null,
    });
  },

  // ── Update wallet balance (called after webhook confirms payment) ─
  async updateWalletBalance(delta) {
    const client = await getBrowserClient();
    if (!client) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    const { data: tailor } = await client.from("tailors").select("id,wallet_balance").eq("user_id", user.id).single();
    if (!tailor) return;
    const newBalance = Math.max(0, (parseFloat(tailor.wallet_balance) || 0) + delta);
    await client.from("tailors").update({ wallet_balance: newBalance }).eq("id", tailor.id);
    // Update localStorage cache
    const cached = ls("boss_tailor", {});
    lsSet("boss_tailor", { ...cached, wallet_balance: newBalance });
    return newBalance;
  },

  // ── Delete a single order (used by OrderDetailFlow) ──────────────
  async deleteOrder(orderId) {
    const client = await getBrowserClient();
    if (!client) return;
    await client.from("orders").delete().eq("id", orderId);
  },
};

export default db;
