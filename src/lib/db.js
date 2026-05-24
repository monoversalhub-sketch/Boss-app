// src/lib/db.js
// ─────────────────────────────────────────────────────────────────
//  BOSS — Data Layer (Supabase only — offline mode removed)
//
//  Auth: calls our own Next.js API routes (/api/auth/*)
//        which call Supabase server-side — zero CORS issues.
//
//  Data: calls Supabase directly from browser using createBrowserClient
//        from @supabase/ssr (the correct production pattern).
//
//  localStorage is used ONLY as a read-through cache for speed.
//  All writes go to Supabase. No localStorage-only auth path exists.
// ─────────────────────────────────────────────────────────────────

// ── localStorage helpers (cache only — not the source of truth) ──
function ls(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, value) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Get browser Supabase client (lazy singleton) ──────────────────
let _browserClient = null;
async function getBrowserClient() {
  if (_browserClient) return _browserClient;
  const { createClient } = await import("./supabase/client.js");
  _browserClient = createClient();
  return _browserClient;
}

// ── Auth via API routes (server proxies to Supabase) ─────────────
async function authFetch(path, body = null, extraHeaders = {}) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Public API ────────────────────────────────────────────────────
export const db = {

  // ── Auth ─────────────────────────────────────────────────────────
  async signUpWithPassword(email, password) {
    const data = await authFetch("/api/auth/signup", { email, password });
    if (data.error) return { error: { message: data.error } };
    return { data: { session: data.session, needsConfirmation: data.needsConfirmation }, error: null };
  },

  async signInWithPassword(email, password) {
    const data = await authFetch("/api/auth/login", { email, password });
    if (data.error) return { error: { message: data.error } };
    lsSet("boss_session", { email: email.toLowerCase().trim() });
    return { data: { session: true }, error: null };
  },

  async getSession() {
    try {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return null;
      const data = await res.json();
      return data.user || null;
    } catch {
      return null;
    }
  },

  async signOut() {
    lsSet("boss_session", null);
    lsSet("boss_tailor", null);
    lsSet("boss_customers", null);
    // MISSING-10: x-boss-request header for CSRF protection on logout
    await authFetch("/api/auth/logout", {}, { "x-boss-request": "1" });
  },

  // ── Tailor Profile ───────────────────────────────────────────────
  async getTailor() {
    try {
      const client = await getBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData?.user) return null;
      const { data } = await client
        .from("tailors")
        .select("id,shop,phone,city,bank_name,bank_code,account_number,account_name,virtual_account_number,virtual_bank_name,virtual_account_name,virtual_account_status,paystack_customer_code,bos_score,bos_score_updated_at,wallet_balance")
        .eq("user_id", authData.user.id)
        .single();
      if (data) lsSet("boss_tailor", data);
      return data || null;
    } catch (e) {
      console.error("[db.getTailor]", e);
      return ls("boss_tailor", null); // serve cache on error
    }
  },

  async setTailor(profile) {
    lsSet("boss_tailor", profile);
    try {
      const client = await getBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData?.user) return;
      const user = authData.user;
      const payload = {
        user_id: user.id,
        shop:    profile.shop  || "",
        phone:   profile.phone || "",
        city:    profile.city  || "",
      };
      if (profile.bank_name            !== undefined) payload.bank_name            = profile.bank_name            || null;
      if (profile.bank_code            !== undefined) payload.bank_code            = profile.bank_code            || null;
      if (profile.account_number       !== undefined) payload.account_number       = profile.account_number       || null;
      if (profile.account_name         !== undefined) payload.account_name         = profile.account_name         || null;
      if (profile.virtual_account_number  !== undefined) payload.virtual_account_number  = profile.virtual_account_number  || null;
      if (profile.virtual_bank_name       !== undefined) payload.virtual_bank_name       = profile.virtual_bank_name       || null;
      if (profile.virtual_account_name    !== undefined) payload.virtual_account_name    = profile.virtual_account_name    || null;
      if (profile.virtual_account_status  !== undefined) payload.virtual_account_status  = profile.virtual_account_status  || "inactive";
      if (profile.paystack_customer_code  !== undefined) payload.paystack_customer_code  = profile.paystack_customer_code  || null;
      if (profile.wallet_balance          !== undefined) payload.wallet_balance          = profile.wallet_balance          ?? 0;
      await client.from("tailors").upsert(payload, { onConflict: "user_id" });
    } catch (e) {
      console.error("[db.setTailor]", e);
    }
  },

  // ── Customers & Orders ───────────────────────────────────────────
  async getCustomers() {
    try {
      const client = await getBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData?.user) return ls("boss_customers", []);
      const { data: tailor } = await client
        .from("tailors")
        .select("id")
        .eq("user_id", authData.user.id)
        .single();
      if (!tailor) return ls("boss_customers", []);
      const { data } = await client
        .from("customers")
        .select("*, orders(*)")
        .eq("tailor_id", tailor.id)
        .order("name");
      if (!data) return ls("boss_customers", []);
      const mapped = data.map(c => ({
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
      lsSet("boss_customers", mapped);
      return mapped;
    } catch (e) {
      console.error("[db.getCustomers]", e);
      return ls("boss_customers", []);
    }
  },

  // setCustomers: used ONLY for new customer+order creation and full sync.
  // All single-field mutations use updateOrder() / updateCustomer() instead.
  // PARTIAL-01: Bulk upsert — single round trip per table, no N+1 loop.
  async setCustomers(customers) {
    lsSet("boss_customers", customers);
    try {
      const client = await getBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData?.user) return { ok: false };
      const { data: tailor } = await client.from("tailors").select("id").eq("user_id", authData.user.id).single();
      if (!tailor) return { ok: false };

      const customerPayloads = customers.map(c => ({
        id: c.id, tailor_id: tailor.id, name: c.name,
        phone: c.phone || "", gender: c.gender || "female",
        measurements: c.measurements || {}, notes: c.notes || "",
      }));
      const orderPayloads = customers.flatMap(c =>
        (c.orders || []).map(o => ({
          id: o.id, customer_id: c.id, tailor_id: tailor.id,
          type: o.type || "", price: o.price || 0, deposit: o.deposit || 0,
          paid: o.paid || 0, delivery_date: o.date || null,
          status: o.status || "In Progress", notes: o.notes || "",
          installment_history: o.installmentHistory || [],
        }))
      );
      if (customerPayloads.length > 0) {
        const { error: custErr } = await client.from("customers").upsert(customerPayloads, { onConflict: "id" });
        if (custErr) throw custErr;
      }
      if (orderPayloads.length > 0) {
        const { error: ordErr } = await client.from("orders").upsert(orderPayloads, { onConflict: "id" });
        if (ordErr) throw ordErr;
      }
      return { ok: true };
    } catch (e) {
      console.error("[db.setCustomers]", e);
      return { ok: false, error: e };
    }
  },

  // ── Targeted single-row writes (replaces N+1 pattern) ───────────
  // Use these for status changes, payment recording, measurements.
  // Only writes the fields that actually changed.
  async updateOrder(orderId, patch) {
    // Update localStorage cache
    const cached = ls("boss_customers", []);
    const updated = cached.map(c => ({
      ...c,
      orders: (c.orders || []).map(o =>
        o.id === orderId ? { ...o, ...patch } : o
      ),
    }));
    lsSet("boss_customers", updated);

    try {
      const client = await getBrowserClient();
      const dbPatch = {};
      if (patch.status             !== undefined) dbPatch.status             = patch.status;
      if (patch.paid               !== undefined) dbPatch.paid               = patch.paid;
      if (patch.paystackRef        !== undefined) dbPatch.paystack_ref       = patch.paystackRef;
      if (patch.installmentHistory !== undefined) dbPatch.installment_history = patch.installmentHistory;
      if (patch.notes              !== undefined) dbPatch.notes              = patch.notes;
      if (patch.date               !== undefined) dbPatch.delivery_date      = patch.date;
      if (Object.keys(dbPatch).length > 0) {
        await client.from("orders").update(dbPatch).eq("id", orderId);
      }
    } catch (e) {
      console.error("[db.updateOrder]", e);
    }
  },

  async updateCustomer(customerId, patch) {
    // Update localStorage cache
    const cached = ls("boss_customers", []);
    const updated = cached.map(c =>
      c.id === customerId ? { ...c, ...patch } : c
    );
    lsSet("boss_customers", updated);

    try {
      const client = await getBrowserClient();
      const dbPatch = {};
      if (patch.phone        !== undefined) dbPatch.phone        = patch.phone;
      if (patch.measurements !== undefined) dbPatch.measurements = patch.measurements;
      if (patch.notes        !== undefined) dbPatch.notes        = patch.notes;
      if (Object.keys(dbPatch).length > 0) {
        await client.from("customers").update(dbPatch).eq("id", customerId);
      }
    } catch (e) {
      console.error("[db.updateCustomer]", e);
    }
  },

  async recordPayment({ orderId, amount, method, paystackRef, virtualAccountNumber, senderName, transferCode }) {
    try {
      const client = await getBrowserClient();
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;
      const { data: tailor } = await client.from("tailors").select("id").eq("user_id", authData.user.id).single();
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
    } catch (e) {
      console.error("[db.recordPayment]", e);
    }
  },

  async deleteOrder(orderId) {
    try {
      const client = await getBrowserClient();
      await client.from("orders").delete().eq("id", orderId);
    } catch (e) {
      console.error("[db.deleteOrder]", e);
    }
  },

  async updateWalletBalance(delta) {
    try {
      const client = await getBrowserClient();
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;
      const { data: tailor } = await client.from("tailors").select("id,wallet_balance").eq("user_id", authData.user.id).single();
      if (!tailor) return;
      const newBalance = Math.max(0, (parseFloat(tailor.wallet_balance) || 0) + delta);
      await client.from("tailors").update({ wallet_balance: newBalance }).eq("id", tailor.id);
      const cached = ls("boss_tailor", {});
      lsSet("boss_tailor", { ...cached, wallet_balance: newBalance });
      return newBalance;
    } catch (e) {
      console.error("[db.updateWalletBalance]", e);
    }
  },
  // MISSING-02: Unmatched payments — transfers received but not auto-matched to an order
  async getUnmatchedPayments() {
    try {
      const client = await getBrowserClient();
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return [];
      const { data: tailor } = await client.from("tailors").select("id").eq("user_id", authData.user.id).single();
      if (!tailor) return [];
      const { data } = await client
        .from("payments")
        .select("id, amount, sender_name, recorded_at, method, virtual_account_number")
        .eq("tailor_id", tailor.id)
        .is("order_id", null)
        .neq("method", "withdrawal")
        .order("recorded_at", { ascending: false });
      return data || [];
    } catch (e) {
      console.error("[db.getUnmatchedPayments]", e);
      return [];
    }
  },

  async matchPaymentToOrder(paymentId, orderId, amount) {
    try {
      const client = await getBrowserClient();
      const { error: pErr } = await client.from("payments").update({ order_id: orderId }).eq("id", paymentId);
      if (pErr) throw pErr;
      const { data: order } = await client.from("orders").select("paid").eq("id", orderId).single();
      const newPaid = (parseFloat(order?.paid) || 0) + amount;
      const { error: oErr } = await client.from("orders").update({ paid: newPaid }).eq("id", orderId);
      if (oErr) throw oErr;
      return { ok: true };
    } catch (e) {
      console.error("[db.matchPaymentToOrder]", e);
      return { ok: false, error: e };
    }
  },

  // Get the internal tailor UUID (needed for addCustomer/addOrder targeted writes)
  async getTailorId() {
    try {
      const client = await getBrowserClient();
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return null;
      const { data: tailor } = await client.from("tailors").select("id").eq("user_id", authData.user.id).single();
      return tailor?.id || null;
    } catch { return null; }
  },

  async addCustomer(customer, tailorId) {
    try {
      const client = await getBrowserClient();
      const { error } = await client.from("customers").insert({
        id: customer.id, tailor_id: tailorId, name: customer.name,
        phone: customer.phone || "", gender: customer.gender || "female",
        measurements: customer.measurements || {}, notes: customer.notes || "",
      });
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.error("[db.addCustomer]", e);
      return { ok: false, error: e };
    }
  },

  async addOrder(order, customerId, tailorId) {
    try {
      const client = await getBrowserClient();
      const { error } = await client.from("orders").insert({
        id: order.id, customer_id: customerId, tailor_id: tailorId,
        type: order.type || "", price: order.price || 0, deposit: order.deposit || 0,
        paid: order.paid || 0, delivery_date: order.date || null,
        status: order.status || "In Progress", notes: order.notes || "",
        installment_history: order.installmentHistory || [],
      });
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.error("[db.addOrder]", e);
      return { ok: false, error: e };
    }
  },


};

export default db;
