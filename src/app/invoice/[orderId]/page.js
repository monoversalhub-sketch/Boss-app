// src/app/invoice/[orderId]/page.js
// ─────────────────────────────────────────────────────────────────
//  Public invoice page — no login required.
//  Accessible via the link the tailor shares with their customer.
//  Shows a clean receipt document with tailor's payment info.
//  BOSS does not collect payments — tailors receive directly.
// ─────────────────────────────────────────────────────────────────

import { Suspense } from "react";

const C = {
  bg:      "#080808",
  s1:      "#101010",
  s2:      "#181818",
  gold:    "#E8B84B",
  green:   "#2EC4A0",
  red:     "#F05454",
  sub:     "#777",
  border:  "#222",
  border2: "#2c2c2c",
};

function fmt(n) {
  return "₦" + (parseFloat(n) || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-NG", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return d; }
}

function Loading() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh",
    }}>
      <div style={{ fontSize: 14, color: C.sub, opacity: 0.5 }}>Loading invoice...</div>
    </div>
  );
}

async function getInvoice(orderId) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    const res = await fetch(`${base}/api/invoice/${orderId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { orderId } = await params;
  const data = await getInvoice(orderId);
  if (!data) return { title: "Invoice — BOSS" };
  const { order, customer, tailor } = data;
  const balance = Math.max(0, order.price - order.deposit - order.paid);
  return {
    title:       `Invoice from ${tailor.shop} — BOSS`,
    description: `${customer.name} · ${order.type || "Order"} · Balance: ${fmt(balance)}`,
    openGraph: {
      title:       `Invoice from ${tailor.shop}`,
      description: `${order.type || "Order"} · Balance due: ${fmt(balance)}`,
      siteName:    "BOSS",
    },
  };
}

async function InvoiceContent({ params }) {
  const { orderId } = await params;
  const data = await getInvoice(orderId);

  if (!data) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", padding: 24,
      }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Invoice Not Found</div>
          <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.6 }}>
            This link may be invalid or expired. Please ask the shop to resend it.
          </div>
          <div style={{ marginTop: 24, fontSize: 12, color: C.sub }}>
            Powered by BOSS · Build Trust. Grow Faster.
          </div>
        </div>
      </div>
    );
  }

  const { order, customer, tailor } = data;
  const totalPaid  = order.deposit + order.paid;
  const balance    = Math.max(0, order.price - totalPaid);
  const isPaid     = balance <= 0;

  const statusColor = order.status === "Delivered" ? C.green
                    : order.status === "Ready"      ? C.gold
                    : C.sub;

  const waPhone = (tailor.phone || "").replace(/\D/g, "");
  let waNum = "";
  if (waPhone.startsWith("234")) {
    waNum = waPhone;
  } else if (waPhone.startsWith("0") && waPhone.length >= 11) {
    waNum = "234" + waPhone.slice(1);
  } else if (waPhone.length >= 7) {
    waNum = "234" + waPhone;
  }
  const waHref = waNum.length >= 12 ? `https://wa.me/${waNum}` : null;

  return (
    <div style={{
      maxWidth: 460, margin: "0 auto", padding: "24px 20px 48px",
      display: "flex", flexDirection: "column", gap: 0,
    }}>
      {/* Header — tailor's shop identity, not BOSS branding */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 28, paddingBottom: 16, borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {tailor.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={tailor.logo_url}
              alt={tailor.shop}
              style={{
                width: 44, height: 44, borderRadius: 12,
                objectFit: "cover", border: `1px solid ${C.border2}`,
              }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "#1a1a1a", border: `1px solid ${C.border2}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 900, color: C.gold,
              fontFamily: "Georgia, serif",
            }}>
              {(tailor.shop || "S")[0].toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "-0.4px",
              color: "#fff", lineHeight: 1.1 }}>{tailor.shop}</div>
            {tailor.city && (
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>📍 {tailor.city}</div>
            )}
          </div>
        </div>
        <div style={{
          fontSize: 11, color: C.sub, background: C.s2,
          border: `1px solid ${C.border2}`, borderRadius: 8,
          padding: "5px 10px", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.5px",
        }}>Invoice</div>
      </div>

      <div style={{
        background: C.s1, border: `1px solid ${C.border2}`,
        borderRadius: 16, padding: "20px", marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>For</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{customer.name}</div>
          </div>
          <div style={{
            background: `${statusColor}22`, border: `1px solid ${statusColor}44`,
            borderRadius: 8, padding: "5px 12px", fontSize: 12,
            fontWeight: 700, color: statusColor,
          }}>{order.status}</div>
        </div>
        <div style={{ height: 1, background: C.border, margin: "0 0 16px" }}/>
        {[
          { label: "Item",          value: order.type || "Order" },
          { label: "Delivery Date", value: fmtDate(order.delivery_date) },
          ...(order.notes ? [{ label: "Notes", value: order.notes }] : []),
        ].map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", padding: "9px 0",
            borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 13, color: C.sub, fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 600, textAlign: "right",
              maxWidth: "60%", wordBreak: "break-word" }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{
        background: C.s1, border: `1px solid ${C.border2}`,
        borderRadius: 16, padding: "20px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 13, color: C.sub, fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
          Payment Summary
        </div>
        {[
          { label: "Total Price",  value: fmt(order.price),  color: "#fff" },
          { label: "Deposit Paid", value: fmt(order.deposit), color: C.sub },
          { label: "Amount Paid",  value: fmt(order.paid),    color: C.sub },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between",
            padding: "9px 0", borderBottom: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 14, color: C.sub }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", padding: "14px 0 0", marginTop: 4,
        }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>Balance Due</div>
          <div style={{
            fontSize: 22, fontWeight: 900, color: isPaid ? C.green : C.gold,
            letterSpacing: "-0.5px",
          }}>{isPaid ? "PAID ✅" : fmt(balance)}</div>
        </div>
      </div>

      {!isPaid && tailor.account_number && (
        <div style={{
          background: C.s1, border: `1px solid ${C.border2}`,
          borderRadius: 16, padding: "20px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, color: C.sub, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>
            To pay {tailor.shop}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 13, color: C.sub }}>Bank: <span style={{ fontWeight: 700, color: "#fff" }}>{tailor.bank_name || "—"}</span></div>
            <div style={{ fontSize: 13, color: C.sub }}>Account Number: <span style={{ fontWeight: 700, color: "#fff", fontFamily: "monospace", fontSize: 15 }}>{tailor.account_number}</span></div>
            <div style={{ fontSize: 13, color: C.sub }}>Account Name: <span style={{ fontWeight: 700, color: "#fff" }}>{tailor.account_name || "—"}</span></div>
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: C.sub, lineHeight: 1.5 }}>
            After payment, let {tailor.shop} know via WhatsApp so they can confirm your order.
          </div>
        </div>
      )}

      {/* WhatsApp contact line — not a button */}
      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            textDecoration: "none",
            marginBottom: 20,
            padding: "14px 0",
          }}
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="#25D366"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0
              12c0 2.11.55 4.16 1.6 5.97L0 24l6.18-1.62A11.94 11.94 0 0
              0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.21-3.48-8.52zM12
              22c-1.85 0-3.66-.5-5.24-1.44l-.37-.22-3.87 1.02 1.03-3.78
              -.24-.39A9.93 9.93 0 0 1 2 12C2 6.48 6.48 2 12 2c2.65 0
              5.15 1.03 7.03 2.9A9.93 9.93 0 0 1 22 12c0 5.52-4.48
              10-10 10zm5.47-7.37c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47
              -.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3
              -.15-1.26-.46-2.4-1.48-.89-.79-1.48-1.77-1.66-2.07-.17
              -.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1
              -.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5
              -.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04
              2.47s1.06 2.87 1.21 3.07c.15.2 2.09 3.2 5.07 4.48.71.31
              1.26.49 1.69.63.71.22 1.36.19 1.87.11.57-.08 1.76-.72
              2.01-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.19-.57-.34z"
            />
          </svg>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#25D366",
            letterSpacing: "-0.2px",
          }}>
            WhatsApp {tailor.shop}
          </span>
        </a>
      ) : tailor.phone ? (
        <div style={{
          textAlign: "center",
          fontSize: 13,
          color: "#666",
          marginBottom: 20,
          padding: "14px 0",
        }}>
          📞 {tailor.phone}
        </div>
      ) : null}

      <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: C.sub, lineHeight: 1.6 }}>
        <div>Powered by <span style={{ color: C.gold, fontWeight: 700 }}>BOSS</span> · Build Trust. Grow Faster.</div>
      </div>
    </div>
  );
}

export default function InvoicePage({ params }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/>
      </head>
      <body style={{
        margin: 0, padding: 0, background: C.bg, color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
        minHeight: "100vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        <Suspense fallback={<Loading />}>
          <InvoiceContent params={params} />
        </Suspense>
      </body>
    </html>
  );
}