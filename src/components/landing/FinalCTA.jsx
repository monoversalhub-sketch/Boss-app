"use client";

const s = {
  wrapper: {
    padding: "0 16px",
  },
  block: {
    background: "linear-gradient(160deg, #003D99 0%, #0066CC 60%, #0080FF 100%)",
    borderRadius: 24,
    padding: "64px 24px",
    textAlign: "center",
    marginBottom: 72,
  },
  eyebrow: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 1.2, color: "rgba(255,255,255,0.55)",
    marginBottom: 16,
  },
  headline: {
    fontSize: 36, fontWeight: 900, color: "#FFFFFF",
    lineHeight: 1.1, letterSpacing: -0.5,
    marginBottom: 12,
  },
  sub: {
    fontSize: 15, color: "rgba(255,255,255,0.70)",
    marginBottom: 32, lineHeight: 1.5,
  },
  btn: {
    display: "inline-block",
    backgroundColor: "#FFFFFF", color: "#0066CC",
    height: 58, borderRadius: 16, fontSize: 16, fontWeight: 800,
    width: "100%", maxWidth: 300,
    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
    border: "none", cursor: "pointer", fontFamily: "inherit",
    lineHeight: "58px", textDecoration: "none",
    marginBottom: 14,
  },
  signIn: {
    color: "rgba(255,255,255,0.60)",
    fontSize: 14, fontWeight: 600, textDecoration: "none",
    display: "block",
  },
  footnote: {
    fontSize: 12, color: "rgba(255,255,255,0.35)",
    marginTop: 20,
  },
  lossLine: {
    fontSize: 13, color: "rgba(255,255,255,0.45)",
    marginTop: 12, fontStyle: "italic",
  },
};

export default function FinalCTA() {
  return (
    <div style={s.wrapper}>
      <div style={s.block} className="reveal">
        <div style={s.eyebrow}>YOUR TAILORING BUSINESS DESERVES THIS</div>
        <h2 className="section-headline" style={s.headline}>
          Ready to run your tailoring business like a BOSS?
        </h2>
        <p style={s.sub}>
          Free to start. No credit card. Works on any Android or iPhone.
        </p>
        <a href="/app" style={s.btn} className="tap-target">
          Create Free Account
        </a>
        <a href="/app" style={s.signIn} className="tap-target">
          Already have an account? Sign In →
        </a>
        <div style={s.footnote}>
          No credit card · Works offline · Your data is yours forever
        </div>
        <div style={s.lossLine}>
          "Every day without BOSS is another day of relying on memory."
        </div>
      </div>
    </div>
  );
}
