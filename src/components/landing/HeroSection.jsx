"use client";

const s = {
  section: {
    background: "linear-gradient(160deg, #0A0A0A 0%, #1A1A1A 50%, #0F1A2E 100%)",
    padding: "100px 24px 64px",
  },
  inner: {
    maxWidth: 480, margin: "0 auto",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "rgba(0,102,204,0.20)",
    border: "1px solid rgba(0,102,204,0.40)",
    color: "#93C5FD",
    fontSize: 12, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 1,
    padding: "6px 16px", borderRadius: 100,
    marginBottom: 20,
  },
  headline: {
    fontSize: 56, fontWeight: 900, color: "#FFFFFF",
    lineHeight: 1.0, letterSpacing: -2,
    marginBottom: 16,
  },
  headlineAccent: {
    color: "#0066CC",
  },
  sub: {
    fontSize: 18, color: "rgba(255,255,255,0.65)",
    lineHeight: 1.6, maxWidth: 360,
    marginBottom: 32,
  },
  ctaBtn: {
    backgroundColor: "#0066CC", color: "#FFFFFF",
    height: 58, width: "100%", maxWidth: 340,
    borderRadius: 16, fontSize: 16, fontWeight: 800,
    border: "none", cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 4px 24px rgba(0,102,204,0.45)",
    marginBottom: 12, display: "block", textAlign: "center",
    lineHeight: "58px", textDecoration: "none",
  },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.75)",
    height: 50, width: "100%", maxWidth: 340,
    borderRadius: 16, fontSize: 15, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
    marginBottom: 20, display: "block", textAlign: "center",
    lineHeight: "50px", textDecoration: "none",
  },
  trustLine: {
    display: "flex", gap: 16, flexWrap: "wrap",
    justifyContent: "center",
    fontSize: 12, color: "rgba(255,255,255,0.35)",
    marginBottom: 48,
  },
  phoneFrame: {
    width: 260, height: 480, borderRadius: 36,
    background: "#F5F5F7",
    border: "6px solid #2C2C2E",
    boxShadow: "0 24px 80px rgba(0,0,0,0.60)",
    margin: "0 auto",
    overflow: "hidden",
    position: "relative",
  },
  phoneHeader: {
    height: 80,
    background: "linear-gradient(135deg,#1A1A1A,#2C2C2E)",
    padding: "14px 16px",
    display: "flex", alignItems: "center", gap: 10,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#0066CC",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#FFFFFF", fontSize: 12, fontWeight: 800,
    flexShrink: 0, lineHeight: "36px",
  },
  card: {
    margin: "10px 10px 0",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: "14px 14px 12px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardLabel: {
    color: "#8E8E93", fontSize: 10,
    textTransform: "uppercase", letterSpacing: 0.8,
    marginBottom: 2,
  },
  cardAmount: {
    fontSize: 32, fontWeight: 900, lineHeight: 1.1,
  },
  cardSub: {
    color: "#8E8E93", fontSize: 11, marginTop: 2,
  },
  navPill: {
    position: "absolute", bottom: 10, left: 10, right: 10,
    height: 50, borderRadius: 100,
    backgroundColor: "rgba(28,28,30,0.97)",
    display: "flex", alignItems: "center", justifyContent: "space-around",
    padding: "0 8px",
  },
  navItem: {
    color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 600,
  },
  navActive: {
    color: "#FFFFFF", fontSize: 11, fontWeight: 600,
  },
  navCenter: {
    width: 32, height: 32, borderRadius: "50%",
    backgroundColor: "#0066CC",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#FFFFFF", fontSize: 16, fontWeight: 700,
  },
  floatCard: {
    position: "absolute",
    background: "#FFFFFF",
    borderRadius: 14, padding: "12px 14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
    display: "none",
  },
  floatCardL: {
    left: -160, top: 140, width: 170,
    animation: "cardFloat 4s ease-in-out infinite",
  },
  floatCardR: {
    right: -160, top: 200, width: 170,
    animation: "cardFloat 4s ease-in-out 2s infinite",
  },
};

export default function HeroSection() {
  return (
    <section style={s.section}>
      <div style={s.inner}>
        <span style={s.badge}>FREE FOR NIGERIAN TAILORS ✓</span>

        <h1 className="hero-headline" style={s.headline}>
          From Hustle<br />
          to <span style={s.headlineAccent}>BOSS.</span>
        </h1>

        <p className="body-large" style={s.sub}>
          Stop relying on notebooks and memory. Every customer, every measurement,
          every payment — organized in one place.
        </p>

        <a href="/app" style={s.ctaBtn} className="tap-target">
          Start Free — No Credit Card
        </a>

        <a
          href="#how-it-works"
          onClick={e => {
            e.preventDefault();
            const el = document.getElementById("how-it-works");
            if (el) window.scrollTo({ top: el.offsetTop - 64, behavior: "smooth" });
          }}
          style={s.secondaryBtn}
          className="tap-target"
        >
          See How It Works ↓
        </a>

        <div style={s.trustLine}>
          <span>✓ Free forever</span>
          <span>✓ Works on Android</span>
          <span>✓ No data lost</span>
          <span>✓ WhatsApp built-in</span>
        </div>

        <div style={{ position: "relative" }}>
          <div style={s.phoneFrame}>
            <div style={s.phoneHeader}>
              <div style={s.avatar}>MT</div>
              <div>
                <div style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13 }}>Mama Titi Couture</div>
                <div style={{ color: "#8E8E93", fontSize: 11 }}>Lagos · Trust Score 72</div>
              </div>
            </div>

            <div style={s.card}>
              <div style={s.cardLabel}>MONEY COLLECTED</div>
              <div style={s.cardAmount}>₦285,000</div>
              <div style={s.cardSub}>this month</div>
            </div>

            <div style={{ ...s.card, marginTop: 8 }}>
              <div style={s.cardLabel}>STILL OWED TO YOU</div>
              <div style={{ ...s.cardAmount, color: "#FF3B30" }}>₦42,000</div>
              <div style={s.cardSub}>from 3 customers</div>
            </div>

            <div style={s.navPill}>
              <span style={s.navActive}>Today</span>
              <span style={s.navItem}>Customers</span>
              <div style={s.navCenter}>+</div>
              <span style={s.navItem}>₦</span>
              <span style={s.navItem}>Profile</span>
            </div>
          </div>

          <div style={{ ...s.floatCard, ...s.floatCardL }} className="float-card-left">
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 4 }}>📐 Chidi's Measurements</div>
            <div style={{ fontSize: 12, color: "#6E6E73" }}>Chest: 40" · Waist: 34" · Hip: 42"</div>
          </div>

          <div style={{ ...s.floatCard, ...s.floatCardR }} className="float-card-right">
            <div style={{ fontWeight: 700, fontSize: 13, color: "#111", marginBottom: 4 }}>
              <span style={{ color: "#34C759" }}>✅</span> Blessing paid ₦15,000
            </div>
            <div style={{ fontSize: 12, color: "#6E6E73" }}>Balance: ₦0 · Fully paid</div>
          </div>

          <style>{`
            @media (min-width: 520px) {
              .float-card-left { display: block !important; }
              .float-card-right { display: block !important; }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}
