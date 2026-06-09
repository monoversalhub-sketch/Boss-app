export async function getTrustScoreIntelligence() {
  const client = await (await import("../db")).getBrowserClient();

  const [{ data: tailors }, { data: history }] = await Promise.all([
    client.from("tailors")
      .select("id, name, email, phone, bos_score, bos_score_updated_at, created_at")
      .order("bos_score", { ascending: false }),
    client.from("trust_score_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const scores = tailors?.map(t => ({
    id: t.id, name: t.name, email: t.email, phone: t.phone,
    score: t.bos_score || 0,
    lastUpdated: t.bos_score_updated_at,
    joined: t.created_at,
    history: history?.filter(h => h.tailor_id === t.id).slice(0, 10) || [],
  })) || [];

  const top10 = scores.filter(s => s.score >= 70).slice(0, 10);
  const bottom10 = scores.filter(s => s.score < 40).slice(-10);
  const distribution = {
    "0-20": scores.filter(s => s.score <= 20).length,
    "21-40": scores.filter(s => s.score > 20 && s.score <= 40).length,
    "41-60": scores.filter(s => s.score > 40 && s.score <= 60).length,
    "61-80": scores.filter(s => s.score > 60 && s.score <= 80).length,
    "81-100": scores.filter(s => s.score > 80).length,
  };

  const recentChanges = history?.slice(0, 50).filter(h => h.delta && h.delta !== 0) || [];

  return {
    scores,
    top10,
    bottom10,
    distribution,
    recentChanges,
    average: scores.length ? Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length) : 0,
    median: scores.length ? scores[Math.floor(scores.length / 2)]?.score || 0 : 0,
    total: scores.length,
  };
}
