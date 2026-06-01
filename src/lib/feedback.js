import { getBrowserClient } from "./db";

const KEYS = {
  nps_last_shown:      "boss_feedback_nps_last",
  micro_5th_order:     "boss_feedback_micro_5order",
  micro_first_payment: "boss_feedback_micro_payment",
  micro_first_receipt: "boss_feedback_micro_receipt",
  bug_last_shown:      "boss_feedback_bug_last",
};

export const feedback = {
  async submit({ type, trigger, score, message, screen }) {
    try {
      const client = await getBrowserClient();
      const { data: authData } = await client.auth.getUser();
      if (!authData?.user) return;
      const { data: tailor } = await client
        .from("tailors").select("id").eq("user_id", authData.user.id).single();
      if (!tailor) return;

      await client.from("feedback").insert({
        tailor_id:   tailor.id,
        type,
        trigger:     trigger || null,
        score:       score   || null,
        message:     message || null,
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
        screen:      screen  || null,
      });
    } catch (e) {
      console.error("[feedback.submit]", e);
    }
  },

  shouldShowNPS() {
    const last = localStorage.getItem(KEYS.nps_last_shown);
    if (!last) return true;
    const daysSince = (Date.now() - new Date(last).getTime())
                      / (1000 * 60 * 60 * 24);
    return daysSince >= 90;
  },

  markNPSShown() {
    localStorage.setItem(KEYS.nps_last_shown, new Date().toISOString());
  },

  shouldShowMicro(key) {
    return !localStorage.getItem(KEYS[key]);
  },

  markMicroShown(key) {
    localStorage.setItem(KEYS[key], "1");
  },
};
