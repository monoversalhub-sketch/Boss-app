"use client";

const s = {
  section: {
    background: "linear-gradient(160deg, #0A0A0A 0%, #1A2040 100%)",
    padding: "72px 24px",
    color: "#FFFFFF",
  },
  inner: {
    maxWidth: 480, margin: "0 auto",
  },
  eyebrow: {
    fontSize: 11, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "rgba(147,197,253,0.80)",
    marginBottom: 12,
  },
  headline: {
    fontSize: 32, fontWeight: 800, lineHeight: 1.1,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  sub: {
    fontSize: 16, color: "rgba(255,255,255,0.65)",
    lineHeight: 1.7, marginBottom: 40,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 24,
  },
  item: {
    backgroundColor: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16, padding: 20,
    textAlign: "center",
  },
  itemIcon: {
    fontSize: 28, marginBottom: 8, lineHeight: 1,
  },
  itemTitle: {
    fontSize: 13, fontWeight: 700, color: "#FFFFFF",
    marginBottom: 2,
  },
  itemSub: {
    fontSize: 11, color: "rgba(255,255,255,0.40)",
  },
  authority: {
    fontSize: 12, color: "rgba(255,255,255,0.30)",
    textAlign: "center", marginTop: 24,
    lineHeight: 1.5,
  },
};

const items = [
  { icon: "👤", title: "Customer Records", sub: "Every client, forever" },
  { icon: "📐", title: "Measurements", sub: "Never ask twice" },
  { icon: "📦", title: "Order History", sub: "Every job you have done" },
  { icon: "₦", title: "Payment History", sub: "Every naira tracked" },
  { icon: "📅", title: "Delivery Records", sub: "Every deadline met" },
];

export default function MemorySection() {
  return (
    <section style={s.section}>
      <div style={s.inner} className="reveal">
        <div style={s.eyebrow}>BUILT TO LAST</div>
        <h2 className="section-headline" style={s.headline}>Your business should never depend on your memory.</h2>
        <p style={s.sub}>
          Switch phones. Lose your phone. Get a new one. Your customers, measurements,
          orders, and payment history are always there — secured in the cloud, available
          the moment you sign in.
        </p>
        <div className="storage-grid stagger" style={s.grid}>
          {items.map((item, i) => (
            <div key={i} style={s.item} className="reveal">
              <div style={s.itemIcon}>{item.icon}</div>
              <div style={s.itemTitle}>{item.title}</div>
              <div style={s.itemSub}>{item.sub}</div>
            </div>
          ))}
        </div>
        <style>{`
          @media (min-width: 768px) {
            .storage-grid { display: flex !important; justify-content: center; gap: 12px; }
            .storage-grid > * { flex: 1; max-width: 140px; }
          }
        `}</style>
        <div style={s.authority}>
          Secured on Supabase — the same infrastructure trusted by over 1 million
          developers worldwide.
        </div>
      </div>
    </section>
  );
}
