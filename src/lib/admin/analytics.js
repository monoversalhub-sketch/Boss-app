export async function getJourneyAnalytics(daysBack = 30) {
  const client = await (await import("../db")).getEffectiveClient();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  const { data: journeys } = await client
    .from("journey_analytics")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (!journeys?.length) return [];

  const byJourney = {};
  journeys.forEach(j => {
    if (!byJourney[j.journey]) byJourney[j.journey] = { started: 0, completed: 0, abandoned: 0, totalDuration: 0, completions: 0 };
    byJourney[j.journey][j.status]++;
    if (j.status === "completed" && j.duration_ms) {
      byJourney[j.journey].totalDuration += j.duration_ms;
      byJourney[j.journey].completions++;
    }
  });

  return Object.entries(byJourney).map(([journey, data]) => ({
    journey,
    started: data.started,
    completed: data.completed,
    abandoned: data.abandoned,
    completionRate: data.started > 0 ? Math.round((data.completed / data.started) * 100) : 0,
    abandonmentRate: data.started > 0 ? Math.round((data.abandoned / data.started) * 100) : 0,
    avgCompletionTimeMs: data.completions > 0 ? Math.round(data.totalDuration / data.completions) : 0,
  }));
}

export async function getFeatureIntelligence(daysBack = 30) {
  const client = await (await import("../db")).getEffectiveClient();
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  const { data: events } = await client
    .from("feature_events")
    .select("feature, action, tailor_id")
    .gte("created_at", since);

  if (!events?.length) return [];

  const byFeature = {};
  const uniqueUsers = new Set();

  events.forEach(e => {
    if (!byFeature[e.feature]) {
      byFeature[e.feature] = { views: 0, uses: 0, completes: 0, users: new Set() };
    }
    if (e.action === "view") byFeature[e.feature].views++;
    else if (e.action === "use") byFeature[e.feature].uses++;
    else if (e.action === "complete") byFeature[e.feature].completes++;
    if (e.tailor_id) byFeature[e.feature].users.add(e.tailor_id);
    if (e.tailor_id) uniqueUsers.add(e.tailor_id);
  });

  return Object.entries(byFeature).map(([feature, data]) => ({
    feature,
    views: data.views,
    uses: data.uses,
    completes: data.completes,
    usersReached: data.users.size,
    usersActivated: data.uses > 0 ? data.users.size : 0,
    activationRate: data.users.size > 0 ? Math.round((data.uses > 0 ? data.users.size : 0) / Math.max(1, data.users.size) * 100) : 0,
    repeatUsage: data.uses > data.users.size ? data.uses - data.users.size : 0,
  }));
}

export async function getProductMetrics(daysBack = 30) {
  const [journeys, features] = await Promise.all([
    getJourneyAnalytics(daysBack),
    getFeatureIntelligence(daysBack),
  ]);

  return { journeys, features };
}
