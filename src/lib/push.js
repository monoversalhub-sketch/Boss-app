import webpush from "web-push";

let _vapidSet = false;
function ensureVapid() {
  if (_vapidSet) return;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:admin@boss-africa.vercel.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  _vapidSet = true;
}

export async function sendPush(subscription, title, body, url = "/") {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    console.warn("[push] invalid subscription", subscription?.endpoint);
    return;
  }
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } },
      JSON.stringify({ title, body, url }),
    );
  } catch (e) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      console.warn("[push] subscription expired/gone:", subscription.endpoint);
    } else {
      console.error("[push] send failed:", e.message);
    }
  }
}

export async function sendPushToTailor(supabase, tailorId, title, body, url = "/") {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("tailor_id", tailorId);

  if (!subs?.length) return;

  await Promise.allSettled(
    subs.map(sub =>
      sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        title,
        body,
        url,
      )
    )
  );
}

export async function sendPushToAllTailors(supabase, title, body, url = "/") {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key");

  if (!subs?.length) return;

  await Promise.allSettled(
    subs.map(sub =>
      sendPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        title,
        body,
        url,
      )
    )
  );
}
