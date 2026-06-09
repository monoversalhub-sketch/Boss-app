import { NextResponse } from "next/server";
import { getBrowserClient } from "@/lib/db";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const { data: tailors } = await admin.from("tailors").select("id");
    const results = [];

    for (const t of tailors || []) {
      try {
        await admin.rpc("compute_bos_score", { tailor_id: t.id });
        results.push(t.id);
      } catch {
        // Fallback: compute via db.updateBosScore if RPC doesn't exist
        const { db } = await import("@/lib/db");
        try { await db.updateBosScore(t.id); results.push(t.id); } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      computed: results.length,
      total: tailors?.length || 0,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
