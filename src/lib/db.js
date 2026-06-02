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

// ── Sync status callback (registered by BOSSApp.jsx) ───────────────
let _syncCallback = null;

// ── Pending-sync queue (offline resilience) ────────────────────────
function _getPendingOps() {
  return ls("boss_pending_sync", []);
}
function _setPendingOps(ops) {
  lsSet("boss_pending_sync", ops);
}
function _enqueuePending(op) {
  const ops = _getPendingOps();
  ops.push({ ...op, timestamp: new Date().toISOString() });
  _setPendingOps(ops);
  console.log("[db] enqueued pending op:", op.type, op.orderId || op.customerId);
}

export { getBrowserClient, ls, lsSet };

// ── Auth via API routes (server proxies to Supabase) ─────────────
async function authFetch(path, body = null, extraHeaders = {}) {
  const res = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Recompute and persist BOSS Trust Score ────────────────────────
async function updateBosScore(tailorId) {
    try {
      const client = await getBrowserClient();
      const { data: orders } = await client
        .from("orders")
        .select("id, price, deposit, paid, status, delivery_date, customer_id")
        .eq("tailor_id", tailorId);

      if (!orders?.length) {
        await client.from("tailors")
          .update({ bos_score: 0, bos_score_updated_at: new Date().toISOString() })
          .eq("id", tailorId);
        return;
      }

      const total          = orders.length;
      const delivered      = orders.filter(o => o.status === "Delivered").length;
      const completionRate = total > 0 ? delivered / total : 0;

      const ordersByCustomer = {};
      orders.forEach(o => {
        ordersByCustomer[o.customer_id] = (ordersByCustomer[o.customer_id] || 0) + 1;
      });
      const uniqueCustomers = Object.keys(ordersByCustomer).length;
      const repeatCustomers = Object.values(ordersByCustomer).filter(c => c > 1).length;
      const repeatRate      = uniqueCustomers > 0 ? repeatCustomers / uniqueCustomers : 0;

      const fullyPaid      = orders.filter(o =>
        o.status === "Delivered" &&
        ((parseFloat(o.price) || 0) - (parseFloat(o.deposit) || 0) - (parseFloat(o.paid) || 0)) <= 0
      ).length;
      const paymentRate    = delivered > 0 ? fullyPaid / delivered : 0;

      const revenue        = orders.reduce((s, o) => s + (parseFloat(o.deposit) || 0) + (parseFloat(o.paid) || 0), 0);
      const revenueScore   = Math.min(1, (total > 0 ? revenue / total : 0) / 50000);

      const now            = new Date();
      const overdue        = orders.filter(o =>
        o.status !== "Delivered" && o.delivery_date && new Date(o.delivery_date) < now
      ).length;
      const penalty        = Math.min(0.3, overdue * 0.05);

      const raw   = (completionRate * 30) + (repeatRate * 25) + (paymentRate * 25) + (revenueScore * 20) - (penalty * 100);
      const score = Math.max(0, Math.min(100, Math.round(raw)));

      await client.from("tailors")
        .update({ bos_score: score, bos_score_updated_at: new Date().toISOString() })
        .eq("id", tailorId);

      client.from("bos_score_history").insert({
        tailor_id:       tailorId,
        score,
        computed_at:     new Date().toISOString(),
        order_count:     total,
        completion_rate: Math.round(completionRate * 100),
        repeat_rate:     Math.round(repeatRate * 100),
        payment_rate:    Math.round(paymentRate * 100),
        overdue_count:   overdue,
      }).then(({ error: histErr }) => {
        if (histErr) console.warn("[db.updateBosScore] bos_score_history insert (non-fatal):", histErr.message);
      }).catch(() => {});

      console.log("[db.updateBosScore] BOSS Score:", score, "for tailor", tailorId);
    } catch (err) {
      console.error("[db.updateBosScore] error:", err);
      throw err; // propagate to caller's catch block so _syncCallback("error") fires
    }
  }

  // ── Public API ────────────────────────────────────────────────────
  export const db = {

    setSyncCallback(fn) { _syncCallback = fn; },

  // ── Auth ─────────────────────────────────────────────────────────
    async signInWithGoogle() {
      const client = await getBrowserClient();
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) return { error: { message: error.message } };
      return { data, error: null };
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
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("boss_")) keysToRemove.push(key);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem("boss_order_draft");
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
        .select("id,shop,phone,city,bank_name,bank_code,account_number,account_name,bos_score,bos_score_updated_at,google_drive_refresh_token,notif_delivery,notif_payments,notif_briefing")
        .eq("user_id", authData.user.id)
        .single();
      if (data) lsSet("boss_tailor", data);
      return data || null;
    } catch (e) {
      console.error("[db.getTailor]", e);
      return null; // never serve stale cache from another user
    }
  },

  async setTailor(profile) {
    lsSet("boss_tailor", profile);
    try {
      const client = await getBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData?.user) return;
      const user = authData.user;
      const payload = { user_id: user.id };
      if (profile.shop  !== undefined) payload.shop  = profile.shop  || "";
      if (profile.phone !== undefined) payload.phone = profile.phone || "";
      if (profile.city  !== undefined) payload.city  = profile.city  || "";
      if (profile.bank_name            !== undefined) payload.bank_name            = profile.bank_name            || null;
      if (profile.bank_code            !== undefined) payload.bank_code            = profile.bank_code            || null;
      if (profile.account_number       !== undefined) payload.account_number       = profile.account_number       || null;
      if (profile.account_name         !== undefined) payload.account_name         = profile.account_name         || null;
      if (profile.notif_delivery       !== undefined) payload.notif_delivery       = profile.notif_delivery;
      if (profile.notif_payments       !== undefined) payload.notif_payments       = profile.notif_payments;
      if (profile.notif_briefing       !== undefined) payload.notif_briefing       = profile.notif_briefing;
      if (profile.self_declared_score  !== undefined) payload.self_declared_score  = profile.self_declared_score || 0;
      if (profile.self_declared_years  !== undefined) payload.self_declared_years  = profile.self_declared_years || null;
      if (profile.self_declared_score  !== undefined && profile.self_declared_score > 0)
        payload.self_declared_at = new Date().toISOString();

      _syncCallback?.("syncing");
      await client.from("tailors").upsert(payload, { onConflict: "user_id" });
      _syncCallback?.("saved");
    } catch (e) {
      console.error("[db.setTailor]", e);
      _syncCallback?.("error");
    }
  },

  // ── Customers & Orders ───────────────────────────────────────────
  async getCustomers() {
    try {
      const client = await getBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData?.user) return [];
      const { data: tailor } = await client
        .from("tailors")
        .select("id")
        .eq("user_id", authData.user.id)
        .single();
      if (!tailor) return [];
      const { data } = await client
        .from("customers")
        .select("*, orders(*)")
        .eq("tailor_id", tailor.id)
        .order("name");
      if (!data) return [];
      const mapped = data.map(c => ({
        id: c.id, name: c.name, phone: c.phone || "",
        measurements: c.measurements || {}, notes: c.notes || "",
        orders: (c.orders || []).map(o => ({
          id: o.id, type: o.type || "", price: o.price || 0,
          deposit: o.deposit || 0, paid: o.paid || 0,
          date: o.delivery_date || "", status: o.status || "In Progress",
          notes: o.notes || "", createdAt: o.created_at,
          installmentHistory: o.installment_history || [],
          imageUrls: o.image_urls || [],
        })),
      }));
      lsSet("boss_customers", mapped);
      return mapped;
    } catch (e) {
      console.error("[db.getCustomers]", e);
      return []; // never serve stale cache from another user
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
          image_urls: o.imageUrls || [],
        }))
      );
      _syncCallback?.("syncing");
      if (customerPayloads.length > 0) {
        const { error: custErr } = await client.from("customers").upsert(customerPayloads, { onConflict: "id" });
        if (custErr) throw custErr;
      }
      if (orderPayloads.length > 0) {
        const { error: ordErr } = await client.from("orders").upsert(orderPayloads, { onConflict: "id" });
        if (ordErr) throw ordErr;
      }
      _syncCallback?.("saved");
      return { ok: true };
    } catch (e) {
      console.error("[db.setCustomers]", e);
      _syncCallback?.("error");
      return { ok: false, error: e };
    }
  },

  // ── Targeted single-row writes (replaces N+1 pattern) ───────────
  // Use these for status changes, payment recording, measurements.
  // Only writes the fields that actually changed.
  async updateOrder(orderId, patch) {
    // Update localStorage cache optimistically
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
      if (patch.imageUrls !== undefined) dbPatch.image_urls = patch.imageUrls;
      if (Object.keys(dbPatch).length > 0) {
        _syncCallback?.("syncing");
        const { error } = await client.from("orders").update(dbPatch).eq("id", orderId);
        if (error) throw error;
        _syncCallback?.("saved");
      }
    } catch (e) {
      console.error("[db.updateOrder]", e);
      // Rollback localStorage to pre-mutation state
      lsSet("boss_customers", cached);
      _syncCallback?.("error");
    }
  },

  async updateCustomer(customerId, patch) {
    // Update localStorage cache optimistically
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
        _syncCallback?.("syncing");
        const { error } = await client.from("customers").update(dbPatch).eq("id", customerId);
        if (error) throw error;
        _syncCallback?.("saved");
      }
    } catch (e) {
      console.error("[db.updateCustomer]", e);
      // Rollback localStorage to pre-mutation state
      lsSet("boss_customers", cached);
      _syncCallback?.("error");
    }
  },

  async recordPayment({ orderId, amount, method, paystackRef, senderName }) {
    let client;
    let insertedId = null;
    try {
      client = await getBrowserClient();
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;
      const { data: tailor } = await client.from("tailors").select("id").eq("user_id", authData.user.id).single();
      if (!tailor) return;
      _syncCallback?.("syncing");
      const { data, error } = await client.from("payments").insert({
        order_id:     orderId     || null,
        tailor_id:    tailor.id,
        amount,
        method:       method      || "cash",
        paystack_ref: paystackRef || null,
        sender_name:  senderName  || null,
      }).select("id").single();
      if (error) throw error;
      insertedId = data.id;
      await updateBosScore(tailor.id);
      _syncCallback?.("saved");
    } catch (e) {
      console.error("[db.recordPayment]", e);
      _syncCallback?.("error");
      // Compensation: best-effort delete of orphan payment row
      if (insertedId && client) {
        client.from("payments").delete().eq("id", insertedId)
          .then(({ error: compErr }) => {
            if (compErr) console.warn("[db.recordPayment] compensation delete failed — orphan row:", insertedId, compErr);
          })
          .catch(compErr => console.warn("[db.recordPayment] compensation delete network error — orphan row:", insertedId, compErr));
      }
      throw e; // rethrow so caller's catch fires for snapshot rollback
    }
  },

  async deleteOrder(orderId) {
    try {
      const client = await getBrowserClient();
      _syncCallback?.("syncing");
      const { error } = await client.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      _syncCallback?.("saved");
    } catch (e) {
      console.error("[db.deleteOrder]", e);
      _syncCallback?.("error");
    }
  },

  async deleteCustomer(customerId) {
    try {
      const client = await getBrowserClient();
      _syncCallback?.("syncing");
      const { error: ordersErr } = await client.from("orders").delete().eq("customer_id", customerId);
      if (ordersErr) console.warn("[db.deleteCustomer] orders delete (non-fatal):", ordersErr.message);
      const { error } = await client.from("customers").delete().eq("id", customerId);
      if (error) throw error;
      _syncCallback?.("saved");
    } catch (e) {
      console.error("[db.deleteCustomer]", e);
      _syncCallback?.("error");
    }
  },

  // ── Order Style Images (Supabase Storage) ──────────────────────────
  async uploadOrderImages(tailorId, orderId, files) {
    const client = await getBrowserClient();
    const urls = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop();
      const path = `${tailorId}/${orderId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
      const { error } = await client.storage.from("order-images").upload(path, file, { contentType: file.type });
      if (error) { console.error("[db.uploadOrderImages] upload failed:", path, error); continue; }
      const { data } = client.storage.from("order-images").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  },

  async removeOrderImage(publicUrl) {
    const client = await getBrowserClient();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const prefix = `${supabaseUrl}/storage/v1/object/public/order-images/`;
    const path = publicUrl.replace(prefix, "");
    if (!path || path === publicUrl) return;
    const { error } = await client.storage.from("order-images").remove([path]);
    if (error) console.error("[db.removeOrderImage]", error);
  },

  // Get the internal tailor UUID (needed for addCustomer/addOrder targeted writes)
  // Auto-creates the tailors row if missing (defensive guard for existing users
  // who signed up before the auto-profile trigger was added).
  async getTailorId() {
    try {
      const client = await getBrowserClient();
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return null;

      const { data: tailor } = await client
        .from("tailors")
        .select("id")
        .eq("user_id", authData.user.id)
        .single();

      if (tailor?.id) return tailor.id;

      // Row missing — auto-create on the fly
      const { data: created, error: insertError } = await client
        .from("tailors")
        .insert({ user_id: authData.user.id, shop: "" })
        .select("id")
        .single();

      if (insertError) {
        console.error("[db.getTailorId] auto-create failed:", insertError);
        return null;
      }

      console.log("[db.getTailorId] auto-created tailors row for", authData.user.id);
      return created.id;
    } catch (e) {
      console.error("[db.getTailorId]", e);
      return null;
    }
  },

  async addCustomer(customer, tailorId) {
    try {
      const client = await getBrowserClient();
      _syncCallback?.("syncing");
      const { error } = await client.from("customers").insert({
        id: customer.id, tailor_id: tailorId, name: customer.name,
        phone: customer.phone || "", gender: customer.gender || "female",
        measurements: customer.measurements || {}, notes: customer.notes || "",
      });
      if (error) throw error;
      _syncCallback?.("saved");
      return { ok: true };
    } catch (e) {
      console.error("[db.addCustomer]", e);
      _syncCallback?.("error");
      _enqueuePending({ type: "addCustomer", customer, tailorId });
      return { ok: false, error: e };
    }
  },

  async addOrder(order, customerId, tailorId) {
    try {
      const client = await getBrowserClient();
      _syncCallback?.("syncing");
      const { error } = await client.from("orders").insert({
        id: order.id, customer_id: customerId, tailor_id: tailorId,
        type: order.type || "", price: order.price || 0, deposit: order.deposit || 0,
        paid: order.paid || 0, delivery_date: order.date || null,
        status: order.status || "In Progress", notes: order.notes || "",
        installment_history: order.installmentHistory || [],
        image_urls: order.imageUrls || [],
      });
      if (error) throw error;
      _syncCallback?.("saved");
      return { ok: true };
    } catch (e) {
      console.error("[db.addOrder]", e);
      _syncCallback?.("error");
      _enqueuePending({ type: "addOrder", order, customerId, tailorId });
      return { ok: false, error: e };
    }
  },

  async updateLastSeen() {
    try {
      const client = await getBrowserClient();
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;
      await client.from("tailors").update({ last_seen_at: new Date().toISOString() }).eq("user_id", authData.user.id);
    } catch {}
  },

  async setNotificationPrefs(prefs) {
    try {
      const client = await getBrowserClient();
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;
      await client.from("tailors").update(prefs).eq("user_id", authData.user.id);
    } catch (e) {
      console.error("[db.setNotificationPrefs]", e);
    }
  },

  async processPendingQueue() {
    const ops = _getPendingOps();
    if (!ops.length) return { processed: 0 };
    const stale = ops.filter(o => Date.now() - new Date(o.timestamp).getTime() > 7 * 86400000);
    const fresh = ops.filter(o => Date.now() - new Date(o.timestamp).getTime() <= 7 * 86400000);
    let processed = 0;
    for (const op of fresh) {
      try {
        if (op.type === "addOrder") {
          const r = await db.addOrder(op.order, op.customerId, op.tailorId);
          if (r.ok) processed++;
        } else if (op.type === "addCustomer") {
          const r = await db.addCustomer(op.customer, op.tailorId);
          if (r.ok) processed++;
        }
      } catch (e) {
        console.warn("[db.processPendingQueue] retry failed for", op.type, e);
      }
    }
    _setPendingOps(stale);
    if (stale.length > 0) {
      console.warn("[db.processPendingQueue] stale ops discarded:", stale.length);
    }
    return { processed, stale: stale.length };
  },
};

export default db;
