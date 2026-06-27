"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useAdminAuth({ skip } = {}) {
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const redirecting = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (skip) {
      setLoading(false);
      setAdmin(null);
      return;
    }

    async function check() {
      redirecting.current = false;
      try {
        const cached = localStorage.getItem("boss_admin_user");
        if (cached) {
          setAdmin(JSON.parse(cached));
          setLoading(false);
          return;
        }
        const { getBrowserClient } = await import("@/lib/db");
        const client = await getBrowserClient();
        const { data: { user } } = await client.auth.getUser();
        if (user) {
            const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email }),
          });
          const json = await res.json();
          if (res.ok && json.admin) {
            localStorage.setItem("boss_admin_user", JSON.stringify(json.admin));
            setAdmin(json.admin);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Not authenticated
      }
      setLoading(false);
      // Redirect happens here — after the full check — not in a
      // separate effect that could race with state updates.
      if (!redirecting.current) {
        redirecting.current = true;
        router.replace("/admin/login");
      }
    }
    check();
  }, [skip, router]);

  return { admin, loading };
}
