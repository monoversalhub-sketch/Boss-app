"use client";
import { useEffect, useState, useCallback } from "react";

export function usePWAUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingSW, setWaitingSW]             = useState(null);
  const [refreshing, setRefreshing]           = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) return;

    let registration = null;

    async function checkForUpdate() {
      try {
        registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        if (registration.waiting) {
          setWaitingSW(registration.waiting);
          setUpdateAvailable(true);
        }

        registration.addEventListener("updatefound", () => {
          const newSW = registration.installing;
          if (!newSW) return;

          newSW.addEventListener("statechange", () => {
            if (
              newSW.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingSW(newSW);
              setUpdateAvailable(true);
            }
          });
        });

        const interval = setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 1000);

        return () => clearInterval(interval);
      } catch (err) {
        console.warn("[usePWAUpdate] SW check failed:", err);
      }
    }

    if (navigator.serviceWorker.controller) {
      checkForUpdate();
    } else {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        checkForUpdate,
        { once: true }
      );
    }

    const handleControllerChange = () => {
      if (refreshing) return;
      setRefreshing(true);
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerUpdate = useCallback(() => {
    if (!waitingSW) {
      window.location.reload();
      return;
    }
    waitingSW.postMessage({ type: "SKIP_WAITING" });
  }, [waitingSW]);

  return { updateAvailable, triggerUpdate };
}
