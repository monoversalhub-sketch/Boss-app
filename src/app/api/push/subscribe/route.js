import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tailor } = await supabase
      .from("tailors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!tailor) {
      return NextResponse.json({ error: "Tailor not found" }, { status: 404 });
    }

    const { endpoint, keys } = await request.json();
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: "Missing endpoint or keys" }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (delErr) console.warn("[push/subscribe] delete old sub:", delErr.message);

    const { error } = await supabase.from("push_subscriptions").insert(
      { tailor_id: tailor.id, endpoint, p256dh: keys.p256dh, auth_key: keys.auth },
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[push/subscribe]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
