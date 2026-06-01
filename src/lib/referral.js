import { getBrowserClient } from "./db";

export const referral = {
  async getMyCode() {
    const client = await getBrowserClient();
    const { data: authData } = await client.auth.getUser();
    if (!authData?.user) return null;
    const { data: tailor } = await client
      .from("tailors")
      .select("id, referral_code, shop")
      .eq("user_id", authData.user.id)
      .single();
    return tailor?.referral_code || null;
  },

  buildLink(code) {
    const base = process.env.NEXT_PUBLIC_APP_URL
                 || window.location.origin;
    return `${base}?ref=${code}`;
  },

  buildWhatsAppMessage(code, shopName) {
    const link = this.buildLink(code);
    return encodeURIComponent(
`I've been using BOSS to manage my tailoring business — it helps me track every order, record payments, and send receipts to my customers on WhatsApp. It's free and very easy to use.

Use my link to sign up: ${link}

Your BOSS account will be set up in 2 minutes. 🎉`
    );
  },

  shareOnWhatsApp(code, shopName) {
    const msg = this.buildWhatsAppMessage(code, shopName);
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  },

  async getStats() {
    const client = await getBrowserClient();
    const { data: authData } = await client.auth.getUser();
    if (!authData?.user) return { total: 0, activated: 0, rewarded: 0 };
    const { data: tailor } = await client
      .from("tailors").select("id").eq("user_id", authData.user.id).single();
    if (!tailor) return { total: 0, activated: 0, rewarded: 0 };
    const { data } = await client
      .from("referrals")
      .select("status")
      .eq("referrer_id", tailor.id);
    if (!data) return { total: 0, activated: 0, rewarded: 0 };
    return {
      total:     data.length,
      activated: data.filter(r => r.status === "activated"
                               || r.status === "rewarded").length,
      rewarded:  data.filter(r => r.status === "rewarded").length,
    };
  },

  captureReferralCode() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      sessionStorage.setItem("boss_pending_ref", ref);
    }
  },

  async attachReferral(newTailorId) {
    const code = sessionStorage.getItem("boss_pending_ref");
    if (!code) return;
    sessionStorage.removeItem("boss_pending_ref");

    const client = await getBrowserClient();
    const { data: referrer } = await client
      .from("tailors")
      .select("id")
      .eq("referral_code", code)
      .single();

    if (!referrer || referrer.id === newTailorId) return;

    await client.from("referrals").insert({
      referrer_id:      referrer.id,
      referred_user_id: newTailorId,
      referral_code:    code,
      status:           "signed_up",
      referred_at:      new Date().toISOString(),
    });

    await client.from("tailors")
      .update({ referred_by: referrer.id })
      .eq("id", newTailorId);
  },

  async checkActivation(tailorId, orderCount) {
    if (orderCount !== 3) return;
    const client = await getBrowserClient();
    const { data: ref, error: refErr } = await client
      .from("referrals")
      .select("id, status")
      .eq("referred_user_id", tailorId)
      .eq("status", "signed_up")
      .single();

    if (refErr || !ref) return;

    await client.from("referrals")
      .update({ status: "activated", activated_at: new Date().toISOString() })
      .eq("id", ref.id);
  },
};
