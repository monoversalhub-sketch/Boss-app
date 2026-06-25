"use client";

export default function ReceiptCanvas({
  id,
  order,
  customer,
  tailor,
}) {
  const total    = Number(order.price        || 0);
  const deposit  = Number(order.deposit_paid || 0);
  const balance  = total - deposit;
  const isPaid   = balance <= 0;

  const fmt = n =>
    "₦" + Number(n).toLocaleString("en-NG",
      { minimumFractionDigits: 0 });

  const deliveryDate = order.delivery_date
    ? new Date(order.delivery_date).toLocaleDateString(
        "en-NG",
        { day: "numeric", month: "long", year: "numeric" }
      )
    : null;

  const today = new Date().toLocaleDateString("en-NG", {
    day: "numeric", month: "long", year: "numeric",
  });

  const shopInitial =
    (tailor.shop || "S")[0].toUpperCase();

  const T = {
    bg:       "#FAFAF8",
    ink:      "#0a0a0a",
    sub:      "#666666",
    muted:    "#AAAAAA",
    rule:     "#E5E5E5",
    paid:     "#1a7a4a",
    due:      "#b91c1c",
    font:     "system-ui, -apple-system, sans-serif",
  };

  function Row({ label, value, bold, large, color }) {
    return (
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "baseline",
        padding:        "9px 0",
        borderBottom:   `1px solid ${T.rule}`,
      }}>
        <div style={{
          fontSize:   13,
          fontWeight: bold ? 700 : 400,
          color:      T.sub,
          letterSpacing: 0,
        }}>
          {label}
        </div>
        <div style={{
          fontSize:   large ? 18 : 13,
          fontWeight: bold || large ? 900 : 700,
          color:      color || T.ink,
          letterSpacing: large ? "-0.5px" : 0,
        }}>
          {value}
        </div>
      </div>
    );
  }

  function SectionHead({ children }) {
    return (
      <div style={{
        fontSize:      10,
        fontWeight:    700,
        color:         T.muted,
        textTransform: "uppercase",
        letterSpacing: "2px",
        marginBottom:  12,
        marginTop:     4,
      }}>
        {children}
      </div>
    );
  }

  return (
    <div
      id={id}
      style={{
        position:   "fixed",
        left:       "-9999px",
        top:        0,
        width:      420,
        background: T.bg,
        fontFamily: T.font,
        color:      T.ink,
        boxSizing:  "border-box",
        padding:    "36px 28px 32px",
      }}
    >
      {/* TOP: Shop identity + RECEIPT label */}
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "flex-start",
        marginBottom:   28,
      }}>
        <div>
          <div style={{
            fontSize:      28,
            fontWeight:    900,
            letterSpacing: "-0.8px",
            color:         T.ink,
            lineHeight:    1.1,
            marginBottom:  8,
          }}>
            {tailor.shop}
          </div>
          <div style={{
            fontSize:   12,
            color:      T.sub,
            lineHeight: 1.6,
          }}>
            <div>{today}</div>
            {tailor.city && <div>{tailor.city}</div>}
          </div>
        </div>

        <div style={{
          display:         "flex",
          flexDirection:   "column",
          alignItems:      "flex-end",
          gap:             8,
        }}>
          {tailor.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tailor.logo_url}
              alt={tailor.shop}
              crossOrigin="anonymous"
              style={{
                width:        64,
                height:       64,
                borderRadius: 8,
                objectFit:    "cover",
                border:       `1px solid ${T.rule}`,
              }}
            />
          ) : (
            <div style={{
              fontSize:      64,
              fontWeight:    900,
              color:         T.ink,
              lineHeight:    1,
              fontFamily:    "Georgia, serif",
              letterSpacing: "-4px",
              opacity:       0.12,
            }}>
              {shopInitial}
            </div>
          )}
          <div style={{
            fontSize:      10,
            fontWeight:    700,
            color:         T.muted,
            textTransform: "uppercase",
            letterSpacing: "2.5px",
          }}>
            Receipt
          </div>
        </div>
      </div>

      {/* RULE */}
      <div style={{
        height:     1,
        background: T.ink,
        marginBottom: 24,
        opacity:    0.15,
      }} />

      {/* ORDER INFO */}
      <SectionHead>Order Details</SectionHead>

      <Row label="Customer" value={customer.name} bold />
      {order.item && (
        <Row label="Item" value={order.item} />
      )}
      {order.status && (
        <Row label="Status" value={order.status} />
      )}
      {deliveryDate && (
        <Row label="Delivery" value={deliveryDate} />
      )}
      {order.notes && (
        <Row label="Notes" value={order.notes} />
      )}

      {/* PAYMENT SUMMARY */}
      <div style={{ marginTop: 24 }}>
        <SectionHead>Payment Summary</SectionHead>

        <Row label="Total Price"  value={fmt(total)}   />
        <Row label="Deposit Paid" value={fmt(deposit)} />
        <Row label="Amount Paid"  value={fmt(deposit)} />

        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "baseline",
          padding:        "14px 0 10px",
        }}>
          <div style={{
            fontSize:   15,
            fontWeight: 800,
            color:      T.ink,
          }}>
            Balance Due
          </div>
          <div style={{
            fontSize:      20,
            fontWeight:    900,
            letterSpacing: "-0.5px",
            color: isPaid ? T.paid : T.due,
          }}>
            {isPaid ? "PAID" : fmt(balance)}
          </div>
        </div>
      </div>

      {/* BANK DETAILS */}
      {tailor.bank_name && tailor.account_number && (
        <>
          <div style={{
            height:     1,
            background: T.rule,
            margin:     "8px 0 20px",
          }} />
          <SectionHead>To Pay {tailor.shop}</SectionHead>
          <Row label="Bank"           value={tailor.bank_name}      />
          <Row label="Account Number" value={tailor.account_number} bold />
          {tailor.account_name && (
            <Row label="Account Name" value={tailor.account_name} />
          )}
          <div style={{
            fontSize:   12,
            color:      T.sub,
            marginTop:  12,
            lineHeight: 1.6,
          }}>
            After payment, send proof to {tailor.shop}
            {tailor.phone ? ` on WhatsApp (${tailor.phone}).` : "."}
          </div>
        </>
      )}

      {/* FOOTER */}
      <div style={{
        marginTop:   32,
        paddingTop:  20,
        borderTop:   `1px solid ${T.rule}`,
        display:     "flex",
        justifyContent: "space-between",
        alignItems:  "flex-end",
      }}>
        <div style={{
          fontSize:   22,
          fontWeight: 900,
          color:      T.ink,
          lineHeight: 1.1,
          opacity:    0.85,
        }}>
          THANK<br />YOU
        </div>

        <div style={{
          fontSize:   11,
          color:      T.muted,
          textAlign:  "right",
          lineHeight: 1.7,
        }}>
          <div style={{ fontWeight: 700, letterSpacing: "1px" }}>
            {tailor.shop?.toUpperCase()}
          </div>
          {tailor.city && <div>{tailor.city}</div>}
          {tailor.phone && <div>{tailor.phone}</div>}
          <div style={{ marginTop: 4 }}>
            Powered by{" "}
            <span style={{ fontWeight: 800, color: T.ink }}>
              BOSS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
