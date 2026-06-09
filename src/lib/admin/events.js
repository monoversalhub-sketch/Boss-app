"use client";
import { getBrowserClient, ls } from "../db";

const SESSION_ID = typeof crypto !== "undefined" ? crypto.randomUUID() : Date.now().toString(36);

let _queue = [];
let _flushing = false;

async function flush() {
  if (_flushing || !_queue.length) return;
  _flushing = true;
  const batch = _queue.splice(0);
  try {
    const client = await getBrowserClient();
    await client.from("feature_events").insert(batch);
  } catch {
    _queue.unshift(...batch);
  }
  _flushing = false;
}

function track(feature, action, opts = {}) {
  const tailorId = ls("boss_tailor_id") || opts.tailorId || null;
  _queue.push({
    tailor_id: tailorId,
    feature,
    action,
    screen: opts.screen || null,
    metadata: opts.metadata || {},
    duration_ms: opts.durationMs || null,
    created_at: new Date().toISOString(),
  });
  if (_queue.length >= 10) flush();
  setTimeout(flush, 2000);
}

export function trackJourney(journey, step, status, opts = {}) {
  const tailorId = ls("boss_tailor_id") || opts.tailorId || null;
  const payload = {
    tailor_id: tailorId,
    journey,
    step,
    status,
    duration_ms: opts.durationMs || null,
    metadata: opts.metadata || {},
    created_at: new Date().toISOString(),
  };
  getBrowserClient().then(c =>
    c.from("journey_analytics").insert(payload).catch(() => {})
  );
}

export const Events = {
  // Feature tracking shortcuts
  featureView(feature) { track(feature, "view"); },
  featureUse(feature, meta) { track(feature, "use", { metadata: meta }); },
  featureComplete(feature, meta) { track(feature, "complete", { metadata: meta }); },
  featureAbandon(feature, meta) { track(feature, "abandon", { metadata: meta }); },
  featureShare(feature, meta) { track(feature, "share", { metadata: meta }); },

  // Screen tracking
  screenView(screen) { track("navigation", "screen_view", { screen, metadata: { screen } }); },

  // Specific actions
  search(query) { track("search", "query", { metadata: { query } }); },
  exportData(type) { track("export", type); },
  error(feature, error) { track(feature, "error", { metadata: { error: error?.message || error } }); },

  // Journey tracking
  startJourney: (journey) => trackJourney(journey, "start", "started"),
  completeJourney: (journey, durationMs) => trackJourney(journey, "complete", "completed", { durationMs }),
  abandonJourney: (journey, step) => trackJourney(journey, step, "abandoned"),
  journeyStep: (journey, step) => trackJourney(journey, step, "started"),
};
