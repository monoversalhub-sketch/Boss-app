import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const { data: tIds, error: tErr } = await admin.from("tailors").select("id");
    if (tErr) return NextResponse.json({ success: false, error: "Tailor list: " + tErr.message });

    // Test: query each tailor directly with admin client
    const diagnostics = [];
    for (const t of tIds || []) {
      const { data: direct, error: dErr } = await admin
        .from("tailors")
        .select("id, last_active_at")
        .eq("id", t.id)
        .maybeSingle();
      diagnostics.push({
        tailorId: t.id,
        directFound: !!direct,
        directError: dErr?.message || null,
        lastActive: direct?.last_active_at || null,
      });
    }

    return NextResponse.json({ success: true, total: tIds?.length || 0, diagnostics });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
