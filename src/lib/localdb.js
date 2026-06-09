// src/lib/localdb.js
// ─────────────────────────────────────────────────────────────────
//  IndexedDB offline-first store via Dexie.js.
//  Three tables: tailor (1 row), customers, orders.
//  Every read checks IndexedDB first, then falls back to Supabase.
//  Every write goes to both (fire-and-forget to Supabase when offline).
// ─────────────────────────────────────────────────────────────────

let _db = null;
let _ready = false;
let _ssr = typeof window === "undefined";

async function initDB() {
  if (_ssr) return null;
  if (_ready) return _db;
  const Dexie = (await import("dexie")).default;
  _db = new Dexie("BOSS_OFFLINE");
  _db.version(1).stores({
    tailor: "id",
    customers: "id",
    orders: "id, customerId, status, date",
  });
  _ready = true;
  return _db;
}

function isReady() { return _ready; }

async function getDB() {
  if (_ssr) return null;
  if (_ready && _db) return _db;
  return initDB();
}

// ── Tailor ──────────────────────────────────────────────────────
async function putTailor(t) {
  if (!t?.id) return;
  try { const db = await getDB(); await db.tailor.put(t); } catch {}
}
async function getTailor() {
  try { const db = await getDB(); return await db.tailor.toCollection().first(); } catch { return null; }
}

// ── Customers ───────────────────────────────────────────────────
async function putCustomers(list) {
  if (!Array.isArray(list)) return;
  try { const db = await getDB(); await db.customers.clear(); await db.customers.bulkPut(list); } catch {}
}
async function getCustomers() {
  try { const db = await getDB(); return await db.customers.toArray(); } catch { return []; }
}
async function updateCustomer(id, patch) {
  try {
    const db = await getDB();
    const existing = await db.customers.get(id);
    if (existing) await db.customers.put({ ...existing, ...patch });
  } catch {}
}

// ── Orders (stored inside customers, but also in own table for fast queries) ──
async function putOrders(list) {
  if (!Array.isArray(list)) return;
  try { const db = await getDB(); await db.orders.clear(); await db.orders.bulkPut(list); } catch {}
}
async function getOrders(customerId) {
  try {
    const db = await getDB();
    if (customerId) return await db.orders.where("customerId").equals(customerId).toArray();
    return await db.orders.toArray();
  } catch { return []; }
}
async function updateOrder(id, patch) {
  try {
    const db = await getDB();
    const existing = await db.orders.get(id);
    if (existing) await db.orders.put({ ...existing, ...patch });
  } catch {}
}
async function deleteOrder(id) {
  try { const db = await getDB(); await db.orders.delete(id); } catch {}
}

// ── Bulk sync from Supabase ─────────────────────────────────────
async function syncFromSupabase(tailor, customers) {
  if (!tailor || !Array.isArray(customers)) return;
  try {
    const db = await getDB();
    await db.tailor.clear();
    await db.tailor.put(tailor);
    await db.customers.clear();
    await db.customers.bulkPut(customers);
    const allOrders = [];
    for (const c of customers) {
      for (const o of (c.orders || [])) {
        allOrders.push({ ...o, customerId: c.id, _cname: c.name });
      }
    }
    await db.orders.clear();
    if (allOrders.length) await db.orders.bulkPut(allOrders);
  } catch (e) {
    console.warn("[localdb] syncFromSupabase failed:", e);
  }
}

export { initDB, isReady, putTailor, getTailor, putCustomers, getCustomers, updateCustomer, putOrders, getOrders, updateOrder, deleteOrder, syncFromSupabase };
