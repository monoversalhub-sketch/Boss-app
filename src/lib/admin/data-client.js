const API = "/api/admin/data";

export async function adminQuery(queries) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ queries: Array.isArray(queries) ? queries : [queries] }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Admin data fetch failed");
  const results = json.results || [];
  if (Array.isArray(queries)) return results;
  return results[0] || null;
}

export function q(key, table, select = "*", opts = {}) {
  const query = { key, table, select, ...opts };
  if (opts.filters) query.filters = opts.filters;
  if (opts.order) query.order = opts.order;
  if (opts.single) query.single = true;
  return query;
}
