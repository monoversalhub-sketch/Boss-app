const s = {
  footer: {
    backgroundColor: "#111111",
    padding: "40px 24px",
  },
  inner: {
    maxWidth: 480, margin: "0 auto",
  },
  logoRow: {
    display: "flex", alignItems: "center", gap: 10,
    marginBottom: 20,
  },
  logoBox: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: "#0066CC",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 900, fontSize: 14, color: "#FFFFFF", flexShrink: 0,
  },
  tagline: {
    fontSize: 13, color: "rgba(255,255,255,0.40)",
    lineHeight: 1.4,
  },
  links: {
    display: "flex", gap: 20, flexWrap: "wrap",
    marginBottom: 24,
  },
  link: {
    fontSize: 14, color: "rgba(255,255,255,0.50)",
    textDecoration: "none",
    minHeight: 48, display: "flex", alignItems: "center",
  },
  copyright: {
    fontSize: 12, color: "rgba(255,255,255,0.25)",
    lineHeight: 1.8,
  },
};

export default function LandingFooter() {
  return (
    <footer style={s.footer}>
      <div style={s.inner}>
        <div style={s.logoRow}>
          <div style={s.logoBox}>B</div>
          <div style={s.tagline}>Business Operating System for Nigerian Tailors</div>
        </div>
        <div style={s.links}>
          <a href="#how-it-works" style={s.link}>How It Works</a>
          <a href="#" style={s.link}>About</a>
          <a href="/app" style={s.link}>Sign In</a>
          <a href="/app" style={s.link}>Start Free</a>
        </div>
        <div style={s.copyright}>
          © 2026 Monoversal Hub. All rights reserved.<br />
          Built with ❤️ for Nigerian tailors.
        </div>
      </div>
    </footer>
  );
}
