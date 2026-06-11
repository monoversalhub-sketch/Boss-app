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
  beforeCard: {
    backgroundColor: "#FFF5F5",
    border: "1.5px solid rgba(255,59,48,0.15)",
    borderRadius: 20, padding: 24,
    marginBottom: 12,
  },
  afterCard: {
    backgroundColor: "#F0FFF4",
    border: "1.5px solid rgba(52,199,89,0.20)",
    borderRadius: 20, padding: 24,
  },
  label: (bg, color) => ({
    display: "inline-block",
    backgroundColor: bg,
    color: color,
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    borderRadius: 100, padding: "4px 12px",
    marginBottom: 16,
  }),
  item: {
    display: "flex", gap: 10, alignItems: "flex-start",
    marginBottom: 12,
  },
  itemIcon: {
    fontSize: 16, flexShrink: 0, fontWeight: 800, lineHeight: 1.4,
  },
  itemText: (color) => ({
    fontSize: 14, color, lineHeight: 1.4,
  }),
  transition: {
    fontSize: 17, fontWeight: 700, color: "#111111",
    textAlign: "center", marginTop: 36, lineHeight: 1.5,
  },
  microLink: {
    color: "#0066CC", fontWeight: 700, fontSize: 15,
    textAlign: "center", display: "block", marginTop: 8,
    textDecoration: "none", cursor: "pointer",
  },
};

const beforeItems = [
  "Notebook that gets lost or damaged",
  "Asking customers for measurements twice",
  "Forgotten delivery dates and angry customers",
  "Not knowing who still owes you money",
  "No proof of what was agreed",
];

const afterItems = [
  "Every measurement saved the moment you take it",
  "Customer history always at your fingertips",
  "Delivery reminders so you never miss a date",
  "Payment records showing exactly who owes what",
  "Professional WhatsApp receipts in one tap",
];

export default function GrowthSection() {
  return (
    <section style={s.section}>
      <div style={s.inner}>
        <div className="reveal">
          <div style={s.eyebrow}>YOUR BUSINESS, TRANSFORMED</div>
          <h2 className="section-headline" style={s.headline}>Look professional. Earn trust. Grow faster.</h2>
        </div>
        <div className="before-after stagger">
          <div className="reveal" style={s.beforeCard}>
            <div style={s.label("rgba(255,59,48,0.10)", "#FF3B30")}>BEFORE BOSS</div>
            {beforeItems.map((item, i) => (
              <div key={i} style={s.item}>
                <span style={{ ...s.itemIcon, color: "#FF3B30" }}>✗</span>
                <span style={s.itemText("#6E6E73")}>{item}</span>
              </div>
            ))}
          </div>
          <div className="reveal" style={s.afterCard}>
            <div style={s.label("rgba(52,199,89,0.10)", "#34C759")}>WITH BOSS</div>
            {afterItems.map((item, i) => (
              <div key={i} style={s.item}>
                <span style={{ ...s.itemIcon, color: "#34C759" }}>✓</span>
                <span style={s.itemText("#111111")}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="reveal">
          <div style={s.transition}>
            Tailors across Nigeria have already made this switch. Here is what they say.
          </div>
          <a
            href="#proof"
            onClick={e => {
              e.preventDefault();
              document.getElementById("proof")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={s.microLink}
            className="tap-target"
          >
            Join them →
          </a>
        </div>
      </div>
    </section>
  );
}
