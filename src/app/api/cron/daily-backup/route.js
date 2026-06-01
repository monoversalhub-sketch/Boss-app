import { createClient } from "@/lib/supabase/server";
import { uploadBackup } from "@/lib/drive";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function GET(request) {
  if (request.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];

  try {
    const supabase = await createClient();

    const { data: tailors } = await supabase
      .from("tailors")
      .select("id, user_id, google_drive_refresh_token")
      .not("google_drive_refresh_token", "is", null);

    if (!tailors?.length) {
      return NextResponse.json({ ok: true, message: "No tailors with Drive connected", count: 0 });
    }

    for (const tailor of tailors) {
      try {
        const { data: customers } = await supabase
          .from("customers")
          .select("*, orders(*)")
          .eq("tailor_id", tailor.id);

        const mapped = (customers || []).map(c => ({
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

        const { data: profile } = await supabase
          .from("tailors")
          .select("id,shop,phone,city,bank_name,bank_code,account_number,account_name")
          .eq("id", tailor.id)
          .single();

        const backupData = {
          tailor: profile || {},
          customers: mapped,
          exportedAt: new Date().toISOString(),
          version: "boss-v7",
        };

        const file = await uploadBackup(tailor.google_drive_refresh_token, backupData);

        results.push({ tailorId: tailor.id, fileName: file.name, ok: true });
      } catch (e) {
        console.error(`[cron/daily-backup] Failed for tailor ${tailor.id}:`, e);
        results.push({ tailorId: tailor.id, ok: false, error: e.message });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    console.error("[cron/daily-backup]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
