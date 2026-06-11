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
    marginBottom: 16,
  },
  sub: {
    fontSize: 16, color: "#6E6E73", lineHeight: 1.6,
    marginBottom: 32,
  },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: "18px 20px",
    border: "1px solid #E5E5EA",
    display: "flex", gap: 14, alignItems: "flex-start",
    marginBottom: 12,
  },
  emoji: {
    fontSize: 28, flexShrink: 0, lineHeight: 1,
  },
  cardTitle: {
    fontSize: 15, fontWeight: 800, color: "#111111",
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 14, color: "#6E6E73", lineHeight: 1.5,
  },
  transition: {
    fontSize: 17, fontWeight: 700, color: "#111111",
    textAlign: "center", marginTop: 32, padding: "0 16px",
    lineHeight: 1.5,
  },
};

const pains = [
  {
    emoji: "📓",
    title: "Your notebook will betray you",
    body: "Water, fire, or just getting lost — your customer records exist in one place, and that place is fragile.",
  },
  {
    emoji: "📱",
    title: "Measuring the same customer twice",
    body: "You ask them to come back because you cannot find where you wrote the measurements. They lose trust in you.",
  },
  {
    emoji: "📅",
    title: "A delivery date you forgot",
    body: "They show up, you are not ready. That embarrassment costs you the referral they would have sent you.",
  },
  {
    emoji: "💰",
    title: "Money you collected but cannot account for",
    body: "Who paid? How much? When? Without records, you look unprofessional to your customer — and to yourself.",
  },
  {
    emoji: "📱",
    title: "Hours wasted searching WhatsApp",
    body: "Scrolling back weeks to find what a customer said. Every minute you spend searching is a minute you could be sewing.",
  },
];

export default function PainSection() {
  return (
    <section style={s.section}>
      <div style={s.inner} className="reveal">
        <div style={s.eyebrow}>THE DAILY STRUGGLE</div>
        <h2 className="section-headline" style={s.headline}>Running a tailoring business is hard enough.</h2>
        <p style={s.sub}>
          Without the right tools, you are losing customers, losing money, and losing
          time — every single day. And most of it is avoidable.
        </p>
        <div className="stagger">
          {pains.map((p, i) => (
            <div key={i} style={s.card} className="reveal">
              <div style={s.emoji}>{p.emoji}</div>
              <div>
                <div style={s.cardTitle}>{p.title}</div>
                <div style={s.cardBody}>{p.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={s.transition}>
          Every one of these problems is solved. With one app, on your phone, in minutes.
        </div>
      </div>
    </section>
  );
}
