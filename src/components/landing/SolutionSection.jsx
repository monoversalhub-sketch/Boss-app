"use client";

const s = {
  section: {
    background: "#FFFFFF",
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
  pillar: {
    backgroundColor: "#F5F5F7",
    borderRadius: 20, padding: "28px 24px",
    border: "1px solid #E5E5EA",
    marginBottom: 16,
  },
  icon: {
    fontSize: 44, marginBottom: 16, lineHeight: 1,
  },
  tag: {
    display: "inline-block",
    backgroundColor: "rgba(0,102,204,0.10)",
    color: "#0066CC", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase",
    borderRadius: 100, padding: "4px 12px",
    marginBottom: 12,
  },
  title: {
    fontSize: 22, fontWeight: 800, lineHeight: 1.2, color: "#111111",
    marginBottom: 8,
  },
  body: {
    fontSize: 15, color: "#6E6E73", lineHeight: 1.6,
  },
};

const pillars = [
  {
    icon: "📐",
    tag: "MEASUREMENT VAULT",
    title: "Never ask a returning customer for measurements again.",
    body: "Every measurement saved permanently. When Mama Titi comes back after 6 months, her chest, waist, and hip measurements are right there. No awkward re-measuring.",
  },
  {
    icon: "📦",
    tag: "ORDER CONTROL",
    title: "Know exactly what is due today, tomorrow, and this week.",
    body: "Every active order tracked by status — In Progress, Ready, Delivered. Never wonder what needs to be done next. BOSS tells you before you have to ask.",
  },
  {
    icon: "💳",
    tag: "PAYMENT TRACKING",
    title: "Know who paid, how much, and who still owes you.",
    body: "Record every deposit and payment. The balance updates automatically. No more awkward conversations — just facts.",
  },
];

export default function SolutionSection() {
  return (
    <section style={s.section}>
      <div style={s.inner} className="reveal">
        <div style={s.eyebrow}>THE BOSS DIFFERENCE</div>
        <h2 className="section-headline" style={s.headline}>
          Everything your tailoring business needs. One app. Always with you.
        </h2>
        <div className="pillar-grid stagger">
          {pillars.map((p, i) => (
            <div key={i} style={s.pillar} className="reveal">
              <div style={s.icon}>{p.icon}</div>
              <div style={s.tag}>{p.tag}</div>
              <div style={s.title}>{p.title}</div>
              <div style={s.body}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
