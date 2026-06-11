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
    marginBottom: 40,
  },
  step: {
    display: "flex", gap: 20, alignItems: "flex-start",
    marginBottom: 32, position: "relative",
  },
  connector: {
    position: "absolute", left: 19, top: 40, bottom: -16,
    width: 2,
    background: "linear-gradient(#0066CC 0%, #E5E5EA 100%)",
  },
  circle: {
    width: 40, height: 40, borderRadius: "50%",
    backgroundColor: "#0066CC", color: "#FFFFFF",
    fontSize: 14, fontWeight: 800,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, position: "relative", zIndex: 1,
  },
  content: {
    flex: 1, paddingTop: 8,
  },
  stepTitle: {
    fontSize: 17, fontWeight: 800, color: "#111111",
    marginBottom: 4,
  },
  stepBody: {
    fontSize: 14, color: "#6E6E73", lineHeight: 1.5,
    marginBottom: 8,
  },
  hint: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10, padding: "8px 12px",
    border: "1px solid #E5E5EA",
    fontSize: 12, color: "#6E6E73",
    display: "inline-block",
  },
  microCta: {
    textAlign: "center", marginTop: 16, paddingTop: 8,
  },
  microCtaBtn: {
    display: "inline-block",
    backgroundColor: "#0066CC", color: "#FFFFFF",
    height: 50, padding: "0 28px", borderRadius: 14,
    fontSize: 15, fontWeight: 800, lineHeight: "50px",
    textDecoration: "none", border: "none", cursor: "pointer",
    fontFamily: "inherit",
  },
};

const steps = [
  {
    num: "01",
    title: "Create your customer",
    body: "Type their name. BOSS saves them instantly. Phone number optional.",
    hint: <div className="cursor" style={{ width: 160, padding: "8px 12px", borderRadius: 8, border: "1px solid #0066CC", fontSize: 13, color: "#111" }}>Chidi Okonkwo</div>,
  },
  {
    num: "02",
    title: "Save their measurements",
    body: "Chest, waist, hip, shoulder. Enter once. Saved forever. Never ask again.",
    hint: (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Chest 40\"", "Waist 34\"", "Hip 42\"", "Shoulder 16\""].map((m, i) => (
          <span key={i} style={{ backgroundColor: "#F5F5F7", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, color: "#111" }}>{m}</span>
        ))}
      </div>
    ),
  },
  {
    num: "03",
    title: "Create the order",
    body: "Choose cloth type, set the price, record the deposit, pick the delivery date.",
    hint: (
      <div style={{ backgroundColor: "#FFFFFF", borderRadius: 10, padding: "8px 12px", border: "1px solid #E5E5EA", fontSize: 12, color: "#111", lineHeight: 1.6 }}>
        <strong>Senator</strong> · ₦35,000 · Due Jun 20 · ₦10,000 deposit
      </div>
    ),
  },
  {
    num: "04",
    title: "Track every order",
    body: "In Progress → Ready → Delivered. Always know what stage every order is at.",
    hint: (
      <div style={{ display: "flex", gap: 6 }}>
        <span style={{ padding: "3px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600, backgroundColor: "#0066CC", color: "#FFFFFF" }}>● In Progress</span>
        <span style={{ padding: "3px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600, backgroundColor: "#F5F5F7", color: "#8E8E93" }}>○ Ready</span>
        <span style={{ padding: "3px 8px", borderRadius: 100, fontSize: 11, fontWeight: 600, backgroundColor: "#F5F5F7", color: "#8E8E93" }}>○ Delivered</span>
      </div>
    ),
  },
  {
    num: "05",
    title: "Record payments",
    body: "Cash received? Tap once to record it. The balance updates immediately.",
    hint: (
      <div style={{ padding: "6px 12px", borderRadius: 100, backgroundColor: "rgba(52,199,89,0.12)", color: "#34C759", fontSize: 12, fontWeight: 700, display: "inline-block" }}>
        ✓ ₦15,000 recorded
      </div>
    ),
  },
  {
    num: "06",
    title: "Deliver with confidence",
    body: "Send a professional receipt straight to your customer on WhatsApp.",
    hint: (
      <div style={{ padding: "6px 12px", borderRadius: 100, backgroundColor: "rgba(37,211,102,0.12)", color: "#25D366", fontSize: 12, fontWeight: 700, display: "inline-block" }}>
        📲 Receipt sent to Chidi ✓
      </div>
    ),
  },
];

export default function HowItWorksSection() {
  return (
    <section style={s.section} id="how-it-works">
      <div style={s.inner}>
        <div className="reveal">
          <div style={s.eyebrow}>SO SIMPLE</div>
          <h2 className="section-headline" style={s.headline}>Six steps from new customer to delivered order.</h2>
        </div>
        <div className="stagger">
          {steps.map((step, i) => (
            <div key={i} style={s.step} className="reveal">
              {i < steps.length - 1 && <div style={s.connector} />}
              <div style={s.circle}>{step.num}</div>
              <div style={s.content}>
                <div style={s.stepTitle}>{step.title}</div>
                <div style={s.stepBody}>{step.body}</div>
                <div style={s.hint}>{step.hint}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={s.microCta} className="reveal">
          <p style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 12 }}>Ready to try it?</p>
          <a href="/app" style={s.microCtaBtn} className="tap-target">Start Free →</a>
        </div>
      </div>
    </section>
  );
}
