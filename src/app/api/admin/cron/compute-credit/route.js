import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { computeCreditReadiness } from "@/lib/admin/credit";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = getAdminClient();
    const { data: tailors } = await client.from("tailors").select("id");
    const results = [];
    for (const t of tailors || []) {
      try {
        const r = await computeCreditReadiness(t.id);
        if (r) results.push({ tailorId: t.id, creditReady: r.creditReady });
      } catch { /* skip */ }
    }
    return NextResponse.json({
      success: true,
      computed: results.length,
      creditReady: results.filter(r => r.creditReady).length,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
