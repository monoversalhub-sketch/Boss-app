import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const body = await request.json();
    const { queries } = body;
    if (!Array.isArray(queries) || !queries.length) {
      return NextResponse.json({ error: "Missing queries array" }, { status: 400 });
    }

    const client = getAdminClient();
    const results = [];

    for (const q of queries) {
      const { key, table, select, filters, order, single, count } = q;
      let query = client.from(table).select(select || "*", count ? { count: "exact", head: !!count } : undefined);

      if (filters) {
        for (const f of filters) {
          const { method, column, value } = f;
          if (method === "eq") query = query.eq(column, value);
          else if (method === "in") query = query.in(column, value);
          else if (method === "gte") query = query.gte(column, value);
          else if (method === "lte") query = query.lte(column, value);
          else if (method === "neq") query = query.neq(column, value);
          else if (method === "lt") query = query.lt(column, value);
          else if (method === "gt") query = query.gt(column, value);
        }
      }

      if (order) {
        const [col, dir] = order.split(" ");
        query = query.order(col, { ascending: dir === "asc" });
      }

      try {
        const result = single
          ? await query.maybeSingle()
          : await query;
        results.push({ key, data: result.data, error: result.error?.message || null, count: result.count ?? null });
      } catch (err) {
        results.push({ key, data: null, error: err.message });
      }
    }

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
