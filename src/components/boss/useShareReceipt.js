"use client";
import { useState, useCallback, useRef } from "react";

export function useShareReceipt() {
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const busy = useRef(false);

  const shareReceipt = useCallback(
    async (order, customer, tailor) => {
      if (busy.current) return;
      busy.current = true;
      setStatus("capturing");
      setErrorMsg(null);

      const CAPTURE_ID = `receipt-capture-${Date.now()}`;

      let root, host;
      try {
        const [
          { default: html2canvas },
          { default: ReceiptCanvas },
          ReactDOM,
        ] = await Promise.all([
          import("html2canvas"),
          import("./ReceiptCanvas"),
          import("react-dom/client"),
        ]);

        host = document.createElement("div");
        document.body.appendChild(host);
        root = ReactDOM.createRoot(host);

        // Render the receipt, then wait for layout + images
        await new Promise(resolve => {
          root.render(
            <ReceiptCanvas
              id={CAPTURE_ID}
              order={order}
              customer={customer}
              tailor={tailor}
            />
          );
          // Wait 3 frames + 300ms — reliable enough for images/fonts
          requestAnimationFrame(() =>
            requestAnimationFrame(() =>
              setTimeout(resolve, 300)
            )
          );
        });

        const node = document.getElementById(CAPTURE_ID);
        if (!node) throw new Error("Capture node not found in DOM");

        // Render the receipt as a high-DPI PNG
        const canvas = await html2canvas(node, {
          backgroundColor: "#FAFAF8",
          scale: 2,
          useCORS: true,
          allowTaint: true,
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
        setTimeout(() => { setStatus("idle"); busy.current = false; }, 2500);
      } catch (err) {
        console.error("[useShareReceipt]", err);
        setStatus("error");
        setErrorMsg(err.message || "Unknown error");
        setTimeout(() => { setStatus("idle"); setErrorMsg(null); busy.current = false; }, 4000);
      } finally {
        if (root) root.unmount();
        if (host) document.body.removeChild(host);
      }
    },
    []
  );

  return { status, sharing: status !== "idle", errorMsg, shareReceipt };
}
