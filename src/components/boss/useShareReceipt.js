"use client";
import { useState, useCallback } from "react";

export function useShareReceipt() {
  const [status, setStatus] = useState("idle");

  const shareReceipt = useCallback(
    async (order, customer, tailor) => {
      if (status !== "idle") return;
      setStatus("capturing");

      const CAPTURE_ID = `receipt-capture-${Date.now()}`;

      const [
        { default: html2canvas },
        { default: ReceiptCanvas },
        ReactDOM,
      ] = await Promise.all([
        import("html2canvas"),
        import("./ReceiptCanvas"),
        import("react-dom/client"),
      ]);

      const host = document.createElement("div");
      document.body.appendChild(host);
      const root = ReactDOM.createRoot(host);

      await new Promise(resolve => {
        root.render(
          <ReceiptCanvas
            id={CAPTURE_ID}
            order={order}
            customer={customer}
            tailor={tailor}
          />
        );
        requestAnimationFrame(() =>
          requestAnimationFrame(resolve)
        );
      });

      try {
        const node = document.getElementById(CAPTURE_ID);
        if (!node) throw new Error("Capture node not found");

        const canvas = await html2canvas(node, {
          backgroundColor: "#0a0a0a",
          scale: 2,
          useCORS: true,
          allowTaint: false,
          logging: false,
        });

        const blob = await new Promise((res, rej) =>
          canvas.toBlob(
            b => (b ? res(b) : rej(new Error("toBlob failed"))),
            "image/png",
            1.0
          )
        );

        const safeName = (customer.name || "customer")
          .replace(/\s+/g, "-");
        const fileName = `receipt-${safeName}.png`;
        const file = new File([blob], fileName,
          { type: "image/png" });

        setStatus("sharing");

        if (
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            title: `Receipt from ${tailor.shop}`,
            text: `Here is your receipt from ${tailor.shop} 🧾`,
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }

        setStatus("done");
        setTimeout(() => setStatus("idle"), 2500);
      } catch (err) {
        console.error("[useShareReceipt]", err);
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      } finally {
        root.unmount();
        document.body.removeChild(host);
      }
    },
    [status]
  );

  return { status, sharing: status !== "idle", shareReceipt };
}
