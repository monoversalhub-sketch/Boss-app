"use client";

const s = {
  section: {
    background: "#F5F5F7",
    padding: "72px 24px",
  },
  inner: {
    maxWidth: 480, margin: "0 auto",
  },
  eyebrow: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 1.2, color: "#8E8E93",
    marginBottom: 12,
  },
  headline: {
    fontSize: 32, fontWeight: 800, lineHeight: 1.1,
    letterSpacing: -0.5, color: "#111111",
    marginBottom: 32,
  },
  statsRow: {
    display: "flex", justifyContent: "center", gap: 24,
    marginBottom: 40,
  },
  stat: {
    textAlign: "center",
  },
  statNum: {
    fontSize: 40, fontWeight: 900, color: "#0066CC",
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 13, color: "#6E6E73", marginTop: 4,
  },
  carousel: {
    display: "flex", overflowX: "auto", gap: 14,
    padding: "4px 4px 16px",
    scrollSnapType: "x mandatory",
  },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 20, padding: 22,
    boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
    minWidth: 280, maxWidth: 300,
    scrollSnapAlign: "start", flexShrink: 0,
  },
  avatarRow: {
    display: "flex", alignItems: "center", gap: 10,
    marginBottom: 10,
  },
  avatar: (bg) => ({
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: bg,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#FFFFFF", fontSize: 14, fontWeight: 800,
    flexShrink: 0,
  }),
  name: {
    fontSize: 15, fontWeight: 700, color: "#111111",
  },
  location: {
    fontSize: 12, color: "#8E8E93",
  },
  stars: {
    color: "#FF9F0A", fontSize: 13, marginBottom: 10,
  },
  quote: {
    fontSize: 14, color: "#6E6E73",
    lineHeight: 1.6, fontStyle: "italic",
  },
  unity: {
    fontSize: 15, color: "#6E6E73",
    textAlign: "center", marginTop: 28,
    lineHeight: 1.6,
  },
};

const testimonials = [
  {
    initials: "MT",
    bg: "#0066CC",
    name: "Mama Titi Couture",
    location: "📍 Mushin, Lagos",
    quote: "Before BOSS I was always asking customers to come back for re-measuring. Now I open the app and their measurements are right there. I have not lost a measurement since I started using it.",
  },
  {
    initials: "AK",
    bg: "#34C759",
    name: "Alhaji Kabiru Fashions",
    location: "📍 Kano",
    quote: "The payment tracking changed my business. Before, I would forget who paid and have to ask again. That was embarrassing. Now I see exactly: Blessing paid ₦15,000, balance is ₦8,000. Simple.",
  },
  {
    initials: "CB",
    bg: "#FF9F0A",
    name: "Chidi Bespoke",
    location: "📍 Port Harcourt",
    quote: "My customers say I look very professional now. I send them a receipt on WhatsApp after they pay. One customer sent me three new customers just because of that receipt.",
  },
];

export default function ProofSection() {
  return (
    <section style={s.section} id="proof">
      <div style={s.inner}>
        <div className="reveal">
          <div style={s.eyebrow}>TRUSTED BY TAILORS</div>
          <h2 className="section-headline" style={s.headline}>Built for tailors. Loved by tailors.</h2>
        </div>
        <div className="stats-row reveal" style={s.statsRow}>
          <div style={s.stat}>
            <div style={s.statNum}>500+</div>
            <div style={s.statLabel}>Tailors using BOSS</div>
          </div>
          <div style={s.stat}>
            <div style={s.statNum}>₦12M+</div>
            <div style={s.statLabel}>Payments tracked</div>
          </div>
          <div style={s.stat}>
            <div style={s.statNum}>4.8★</div>
            <div style={s.statLabel}>Average rating</div>
          </div>
        </div>
        <style>{`
          @media (min-width: 768px) {
            .stats-row { display: flex !important; justify-content: center; gap: 60px; }
          }
        `}</style>
        <div className="reveal">
          <div style={s.carousel} className="scroll-x">
            {testimonials.map((t, i) => (
              <div key={i} style={s.card}>
                <div style={s.avatarRow}>
                  <div style={s.avatar(t.bg)}>{t.initials}</div>
                  <div>
                    <div style={s.name}>{t.name}</div>
                    <div style={s.location}>{t.location}</div>
                  </div>
                </div>
                <div style={s.stars}>★★★★★</div>
                <div style={s.quote}>"{t.quote}"</div>
              </div>
            ))}
          </div>
        </div>
        <div className="reveal" style={s.unity}>
          Join tailors from Lagos, Abuja, Kano, Port Harcourt, Katsina, and across
          Nigeria who stopped guessing and started growing.
        </div>
      </div>
    </section>
  );
}
