"use client";

export default function ReceiptCanvas({
  id, order, customer, tailor,
}) {
  const C = {
    bg:     "#0a0a0a",
    card:   "#141414",
    border: "#2a2a2a",
    text:   "#ffffff",
    sub:    "#888888",
    gold:   "#c9a84c",
    green:  "#22c55e",
    red:    "#ef4444",
  };

  const total   = order.price        || 0;
  const deposit = order.deposit_paid || 0;
  const balance = total - deposit;
  const isPaid  = balance <= 0;

  const fmt = n =>
    "₦" + Number(n).toLocaleString("en-NG",
      { minimumFractionDigits: 0 });

  const deliveryDate = order.delivery_date
    ? new Date(order.delivery_date).toLocaleDateString("en-NG", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <div
      id={id}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        width: 420,
        background: C.bg,
        padding: "28px 24px 36px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: C.text,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
        }}>
          {tailor.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tailor.logo_url}
              alt={tailor.shop}
              crossOrigin="anonymous"
              style={{
                width: 44, height: 44, borderRadius: 12,
                objectFit: "cover",
                border: `1px solid ${C.border}`,
              }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "#1a1a1a",
              border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center",
              justifyContent: "center",
              fontSize: 22, fontWeight: 900, color: C.gold,
              fontFamily: "Georgia, serif",
            }}>
              {(tailor.shop || "S")[0].toUpperCase()}
            </div>
          )}
          <div>
            <div style={{
              fontSize: 18, fontWeight: 900,
              letterSpacing: "-0.4px",
            }}>
              {tailor.shop}
            </div>
            {tailor.city && (
              <div style={{
                fontSize: 12, color: C.sub, marginTop: 2,
              }}>
                📍 {tailor.city}
              </div>
            )}
          </div>
        </div>
        <div style={{
          fontSize: 11, color: C.sub,
          background: "#1c1c1c",
          border: `1px solid ${C.border}`,
          borderRadius: 8, padding: "5px 10px",
          fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          Receipt
        </div>
      </div>

      {/* Order info */}
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "18px 20px",
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11, color: C.sub, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.5px",
          marginBottom: 6,
        }}>For</div>
        <div style={{
          fontSize: 20, fontWeight: 900,
          letterSpacing: "-0.4px", marginBottom: 14,
        }}>
          {customer.name}
        </div>
        {[
          ["Item",          order.item],
          ["Delivery Date", deliveryDate],
          ["Notes",         order.notes],
          ["Status",        order.status],
        ]
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div key={label} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 10, gap: 12,
            }}>
              <div style={{ fontSize: 13, color: C.sub }}>
                {label}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                textAlign: "right", maxWidth: "65%",
              }}>
                {value}
              </div>
            </div>
          ))}
      </div>

      {/* Payment summary */}
      <div style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "18px 20px",
        marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11, color: C.sub, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.5px",
          marginBottom: 14,
        }}>Payment Summary</div>
        {[
          ["Total Price",  fmt(total)],
          ["Deposit Paid", fmt(deposit)],
          ["Amount Paid",  fmt(deposit)],
        ].map(([label, value]) => (
          <div key={label} style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 14, color: C.sub }}>
              {label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {value}
            </div>
          </div>
        ))}
        <div style={{
          height: 1, background: C.border, margin: "14px 0",
        }} />
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ fontSize: 15, fontWeight: 800 }}>
            Balance Due
          </div>
          <div style={{
            fontSize: 15, fontWeight: 900,
            color: isPaid ? C.green : C.red,
          }}>
            {isPaid ? "PAID ✅" : fmt(balance)}
          </div>
        </div>
      </div>

      {/* Bank details (only if set) */}
      {tailor.bank_name && tailor.account_number && (
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 16, padding: "18px 20px",
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11, color: C.sub, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.5px",
            marginBottom: 12,
          }}>
            To Pay {tailor.shop}
          </div>
          {[
            ["Bank",           tailor.bank_name],
            ["Account Number", tailor.account_number],
            ["Account Name",   tailor.account_name],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} style={{
                fontSize: 13, marginBottom: 6,
              }}>
                <span style={{ color: C.sub }}>{label}: </span>
                <strong>{value}</strong>
              </div>
            ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        marginTop: 20, textAlign: "center",
        fontSize: 12, color: "#444",
      }}>
        Powered by{" "}
        <strong style={{ color: C.gold }}>BOSS</strong>
        {" · "}Build Trust. Grow Faster.
      </div>
    </div>
  );
}
